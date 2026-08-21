import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";

const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

export async function acquireSendLock(
  redis: Redis,
  emailJobId: string,
  ttlMs: number,
): Promise<string | null> {
  const token = randomUUID();
  const result = await redis.set(`email-send-lock:${emailJobId}`, token, "PX", ttlMs, "NX");
  return result === "OK" ? token : null;
}

export async function releaseSendLock(
  redis: Redis,
  emailJobId: string,
  token: string,
): Promise<void> {
  await redis.eval(RELEASE_LOCK_SCRIPT, 1, `email-send-lock:${emailJobId}`, token);
}
