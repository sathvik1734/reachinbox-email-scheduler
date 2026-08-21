import type { Redis } from "ioredis";

const HOUR_MS = 60 * 60 * 1000;

const RESERVE_SLOT_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then
  redis.call('SET', KEYS[1], 1, 'PX', ARGV[2])
  return 1
end
if tonumber(current) >= tonumber(ARGV[1]) then
  return 0
end
redis.call('INCR', KEYS[1])
return 1
`;

export interface RateLimitResult {
  allowed: boolean;
  nextWindowAt: number;
}

export async function reserveSenderHourlySlot(
  redis: Redis,
  senderId: string,
  limit: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const hourStart = Math.floor(now / HOUR_MS) * HOUR_MS;
  const nextWindowAt = hourStart + HOUR_MS;
  const ttlMs = nextWindowAt - now + 5 * 60 * 1000;
  const key = `email-rate:${senderId}:${hourStart}`;

  const result = await redis.eval(
    RESERVE_SLOT_SCRIPT,
    1,
    key,
    limit.toString(),
    ttlMs.toString(),
  );

  return { allowed: Number(result) === 1, nextWindowAt };
}
