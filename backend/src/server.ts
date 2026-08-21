import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./db/prisma.js";
import { emailQueue, reconcileScheduledEmails } from "./queue/emailQueue.js";
import { redis } from "./redis/client.js";
import { sessionRedis } from "./redis/sessionClient.js";

const server = createServer(createApp());
let reconciliationRunning = false;

async function reconcileSafely() {
  if (reconciliationRunning) return;
  reconciliationRunning = true;
  try {
    await reconcileScheduledEmails();
  } catch (error) {
    logger.error({ err: error }, "Queue reconciliation failed");
  } finally {
    reconciliationRunning = false;
  }
}

redis.on("ready", () => void reconcileSafely());
redis.on("error", (error: unknown) => logger.error({ err: error }, "Redis connection error"));

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "ReachInbox API is listening");
  void reconcileSafely();
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown started");
  server.close(async () => {
    await Promise.allSettled([
      emailQueue.close(),
      redis.quit(),
      sessionRedis.quit(),
      prisma.$disconnect(),
    ]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
