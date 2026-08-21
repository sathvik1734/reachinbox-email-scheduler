import type { EmailJob } from "@prisma/client";
import { Queue, type JobsOptions } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";
import { createRedisConnection } from "../redis/client.js";

export const EMAIL_QUEUE_NAME = "scheduled-email";

export interface EmailQueuePayload {
  emailJobId: string;
}

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { count: 5_000, age: 7 * 24 * 60 * 60 },
  removeOnFail: { count: 10_000, age: 30 * 24 * 60 * 60 },
};

export const emailQueue = new Queue<EmailQueuePayload>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions,
});

function toQueueJob(email: Pick<EmailJob, "id" | "scheduledAt">) {
  return {
    name: "send-email",
    data: { emailJobId: email.id },
    opts: {
      ...defaultJobOptions,
      jobId: `email-${email.id}`,
      delay: Math.max(0, email.scheduledAt.getTime() - Date.now()),
    },
  };
}

export async function enqueueEmails(
  emails: Array<Pick<EmailJob, "id" | "scheduledAt">>,
): Promise<void> {
  const batchSize = 500;
  for (let index = 0; index < emails.length; index += batchSize) {
    const batch = emails.slice(index, index + batchSize);
    await emailQueue.addBulk(batch.map(toQueueJob));
    await prisma.emailJob.updateMany({
      where: { id: { in: batch.map((email) => email.id) }, status: "QUEUED" },
      data: { status: "SCHEDULED" },
    });
  }
}

/**
 * Startup/reconnect recovery is event-driven, not cron-based. Deterministic
 * BullMQ job IDs make repeated reconciliation safe: an existing job is reused.
 */
export async function reconcileScheduledEmails(): Promise<number> {
  // A row left in SENDING after its distributed lock expires has an uncertain
  // SMTP outcome. Mark it failed instead of retrying and risking a duplicate.
  await prisma.emailJob.updateMany({
    where: {
      status: "SENDING",
      sendingStartedAt: { lt: new Date(Date.now() - env.SEND_LOCK_TTL_MS) },
    },
    data: {
      status: "FAILED",
      failureReason: "Delivery outcome became uncertain after a worker interruption; not retried to prevent duplication.",
    },
  });

  let cursor: string | undefined;
  let reconciled = 0;

  while (true) {
    const emails = await prisma.emailJob.findMany({
      where: { status: { in: ["QUEUED", "SCHEDULED"] } },
      select: { id: true, scheduledAt: true },
      orderBy: { id: "asc" },
      take: 1_000,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (emails.length === 0) break;

    await enqueueEmails(emails);
    reconciled += emails.length;
    cursor = emails.at(-1)?.id;
    if (emails.length < 1_000) break;
  }

  logger.info({ count: reconciled }, "Queue reconciliation completed");
  return reconciled;
}
