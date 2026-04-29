import { describe, expect, it, vi } from "vitest";
import { getWbRateLimitDelayMs, throwIfWbRateLimited } from "./helpers";

function response(status: number, headers: Record<string, string> = {}) {
  return new Response("limited", { status, headers });
}

describe("WB rate-limit guard helpers", () => {
  it("ignores non-rate-limit responses", () => {
    expect(getWbRateLimitDelayMs(response(500))).toBeUndefined();
  });

  it("reads X-Ratelimit-Retry in seconds", () => {
    expect(
      getWbRateLimitDelayMs(response(429, { "X-Ratelimit-Retry": "2.5" })),
    ).toBe(2500);
  });

  it("falls back to Retry-After in seconds", () => {
    expect(getWbRateLimitDelayMs(response(529, { "Retry-After": "7" }))).toBe(
      7000,
    );
  });

  it("reads X-Ratelimit-Reset as an epoch timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T10:00:00.000Z"));
    try {
      expect(
        getWbRateLimitDelayMs(
          response(429, {
            "X-Ratelimit-Reset": String(
              new Date("2026-04-29T10:00:12.000Z").getTime() / 1000,
            ),
          }),
        ),
      ).toBe(12000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the default delay when WB omits retry headers", () => {
    expect(getWbRateLimitDelayMs(response(429))).toBe(60_000);
  });

  it("throws a typed rate-limit error with a buffered blockedUntil", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T10:00:00.000Z"));
    try {
      await expect(
        throwIfWbRateLimited(response(429, { "Retry-After": "3" })),
      ).rejects.toMatchObject({
        name: "WbRateLimitError",
        retryAfterSeconds: 3,
        blockedUntil: new Date("2026-04-29T10:00:05.000Z").getTime(),
        statusCode: 429,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
