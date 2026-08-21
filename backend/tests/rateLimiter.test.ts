import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { reserveSenderHourlySlot } from "../src/services/rateLimiter.js";

describe("reserveSenderHourlySlot", () => {
  it("uses an hour-scoped sender key and returns an allowed slot", async () => {
    const evalMock = mock.fn(async () => 1);
    const redis = { eval: evalMock };
    const now = Date.UTC(2026, 7, 20, 10, 15, 0);

    const result = await reserveSenderHourlySlot(redis as never, "sender-1", 200, now);

    assert.deepEqual(result, { allowed: true, nextWindowAt: Date.UTC(2026, 7, 20, 11, 0, 0) });
    const args = evalMock.mock.calls[0]?.arguments;
    assert.equal(args?.[1], 1);
    assert.equal(args?.[2], `email-rate:sender-1:${Date.UTC(2026, 7, 20, 10, 0, 0)}`);
    assert.equal(args?.[3], "200");
  });

  it("returns the next window when the distributed counter rejects a slot", async () => {
    const redis = { eval: mock.fn(async () => 0) };
    const result = await reserveSenderHourlySlot(redis as never, "sender-1", 1, 0);
    assert.equal(result.allowed, false);
    assert.equal(result.nextWindowAt, 3_600_000);
  });
});
