import {
  DelayedError,
  UnrecoverableError,
  Worker,
  type Job,
} from "bullmq";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./db/prisma.js";
import { EMAIL_QUEUE_NAME, type EmailQueuePayload } from "./queue/emailQueue.js";
import { createRedisConnection } from "./redis/client.js";
import { sendEmail } from "./services/mailer.js";
import { reserveSenderHourlySlot } from "./services/rateLimiter.js";
import { acquireSendLock, releaseSendLock } from "./services/sendLock.js";

const workerConnection = createRedisConnection();
const coordinationRedis = createRedisConnection();

async function delayJob(job: Job<EmailQueuePayload>, token: string | undefined, timestamp: number) {
  if (!token) throw new Error("BullMQ worker token is unavailable");
  await job.moveToDelayed(timestamp, token);
  throw new DelayedError();
}

const worker = new Worker<EmailQueuePayload>(
  EMAIL_QUEUE_NAME,
  async (job, token) => {
    const email = await prisma.emailJob.findUnique({
      where: { id: job.data.emailJobId },
      include: { campaign: { include: { sender: true } } },
    });

    if (!email || email.status === "SENT" || email.status === "FAILED") return;
    if (email.status === "SENDING") {
      // A stalled BullMQ job may be retried after its original worker died. Wait
      // for that worker's send lock to expire, then fail safely rather than send
      // an SMTP message whose previous outcome could be unknown.
      const sendLockTtl = await coordinationRedis.pttl(`email-send-lock:${email.id}`);
      if (sendLockTtl > 0) {
        return delayJob(job, token, Date.now() + sendLockTtl + 100);
      }
      await prisma.emailJob.updateMany({
        where: { id: email.id, status: "SENDING" },
        data: {
          status: "FAILED",
          failureReason: "Delivery outcome is uncertain after worker interruption; not retried to prevent duplication.",
        },
      });
      return;
    }

    const lockToken = await acquireSendLock(
      coordinationRedis,
      email.id,
      env.SEND_LOCK_TTL_MS,
    );
    if (!lockToken) return delayJob(job, token, Date.now() + 5_000);

    let claimed = false;
    try {
      const limit = Math.min(
        email.campaign.hourlyLimit,
        env.MAX_EMAILS_PER_HOUR_PER_SENDER,
      );
      const rate = await reserveSenderHourlySlot(
        coordinationRedis,
        email.campaign.senderId,
        limit,
      );

      if (!rate.allowed) {
        // Position-based spacing keeps campaign ordering reasonably stable when
        // a large burst is rolled into the next hourly window.
        const orderOffset = Math.min(email.position * env.MIN_SEND_DELAY_MS, 45 * 60 * 1000);
        const retryAt = rate.nextWindowAt + orderOffset;
        await prisma.emailJob.update({
          where: { id: email.id },
          data: { status: "SCHEDULED", scheduledAt: new Date(retryAt) },
        });
        return delayJob(job, token, retryAt);
      }

      const claim = await prisma.emailJob.updateMany({
        where: { id: email.id, status: { in: ["QUEUED", "SCHEDULED"] } },
        data: { status: "SENDING", sendingStartedAt: new Date(), failureReason: null },
      });
      if (claim.count !== 1) return;
      claimed = true;

      const delivery = await sendEmail({
        idempotencyKey: email.id,
        fromEmail: email.campaign.sender.email,
        fromName: email.campaign.sender.name,
        to: email.recipient,
        subject: email.campaign.subject,
        body: email.campaign.body,
      });

      await prisma.emailJob.update({
        where: { id: email.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: delivery.messageId,
          previewUrl: delivery.previewUrl,
        },
      });
      logger.info({ emailJobId: email.id, recipient: email.recipient }, "Email sent");
    } catch (error) {
      if (error instanceof DelayedError) throw error;
      if (claimed) {
        await prisma.emailJob.update({
          where: { id: email.id },
          data: {
            status: "FAILED",
            failureReason: error instanceof Error ? error.message.slice(0, 500) : "SMTP send failed",
          },
        });
        // Do not automatically retry after SMTP handoff starts: this chooses
        // at-most-once delivery over a possible duplicate on ambiguous errors.
        throw new UnrecoverableError("Email delivery failed after the job was claimed");
      }
      throw error;
    } finally {
      await releaseSendLock(coordinationRedis, email.id, lockToken);
    }
  },
  {
    connection: workerConnection,
    concurrency: env.WORKER_CONCURRENCY,
    limiter: { max: 1, duration: env.MIN_SEND_DELAY_MS },
  },
);

worker.on("ready", () =>
  logger.info(
    { concurrency: env.WORKER_CONCURRENCY, minDelayMs: env.MIN_SEND_DELAY_MS },
    "Email worker is ready",
  ),
);
worker.on("completed", (job) => logger.debug({ jobId: job.id }, "Job completed"));
worker.on("failed", (job, error) =>
  logger.error({ jobId: job?.id, err: error }, "Job failed"),
);
worker.on("error", (error) => logger.error({ err: error }, "Worker error"));

async function shutdown(signal: string) {
  logger.info({ signal }, "Worker shutdown started");
  await Promise.allSettled([
    worker.close(),
    coordinationRedis.quit(),
    workerConnection.quit(),
    prisma.$disconnect(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
