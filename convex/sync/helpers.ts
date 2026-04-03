import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const BATCH_SIZE = 50;

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 5,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (e) {
    // Сетевая ошибка (HTTP/2 connection error, DNS, timeout и т.д.)
    if (retries > 0) {
      const delay = (6 - retries) * 5000;
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw e;
  }
  if ((res.status === 429 || res.status >= 500) && retries > 0) {
    // Используем X-Ratelimit-Retry от WB, если есть; иначе экспоненциальный backoff
    const retryAfter = res.headers.get("X-Ratelimit-Retry");
    const delay = retryAfter
      ? Math.ceil(parseFloat(retryAfter)) * 1000
      : (6 - retries) * 5000; // 5s, 10s, 15s, 20s, 25s
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, options, retries - 1);
  }
  return res;
}

export async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
}

export const logSync = internalMutation({
  args: {
    shopId: v.id("shops"),
    endpoint: v.string(),
    status: v.union(v.literal("ok"), v.literal("error")),
    error: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("syncLog", {
      shopId: args.shopId,
      endpoint: args.endpoint,
      status: args.status,
      error: args.error,
      syncedAt: Date.now(),
    });
  },
});
