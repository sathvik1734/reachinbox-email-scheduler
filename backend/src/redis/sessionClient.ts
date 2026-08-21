import { createClient } from "redis";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export const sessionRedis = createClient({ url: env.REDIS_URL });

sessionRedis.on("error", (error: unknown) => {
  logger.error({ err: error }, "Session Redis connection error");
});

await sessionRedis.connect();
