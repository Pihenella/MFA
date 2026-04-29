import { internalMutation, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import {
  clearWbRateLimitGuardRef,
  getWbRateLimitGuardRef,
  logSyncRef,
  recordWbRateLimitGuardRef,
} from "../lib/syncRefs";

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const BATCH_SIZE = 50;
const MAX_RETRY_DELAY_MS = 5 * 60_000;
const WB_RATE_LIMIT_STATUSES = new Set([429, 529]);
const DEFAULT_WB_RATE_LIMIT_DELAY_MS = 60_000;
const RATE_LIMIT_GUARD_BUFFER_MS = 2_000;
const MAX_WB_RATE_LIMIT_DELAY_MS = 24 * 60 * 60_000;

type SyncActionContext = {
  runQuery: <Args, Result>(ref: any, args: Args) => Promise<Result>;
  runMutation: <Args, Result = unknown>(ref: any, args: Args) => Promise<Result>;
};

function parsePositiveNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function clampDelayMs(delayMs: number): number {
  return Math.min(
    Math.max(Math.ceil(delayMs), 1_000),
    MAX_WB_RATE_LIMIT_DELAY_MS,
  );
}

function delayFromResetHeader(value: string | null): number | undefined {
  const parsed = parsePositiveNumber(value);
  if (parsed === undefined) return undefined;

  const now = Date.now();
  if (parsed > now / 1000) return clampDelayMs(parsed * 1000 - now);
  if (parsed > now) return clampDelayMs(parsed - now);
  return clampDelayMs(parsed * 1000);
}

export function getWbRateLimitDelayMs(res: Response): number | undefined {
  if (!WB_RATE_LIMIT_STATUSES.has(res.status)) return undefined;

  const retryAfter =
    parsePositiveNumber(res.headers.get("X-Ratelimit-Retry")) ??
    parsePositiveNumber(res.headers.get("Retry-After"));
  if (retryAfter !== undefined) return clampDelayMs(retryAfter * 1000);

  const resetDelay = delayFromResetHeader(res.headers.get("X-Ratelimit-Reset"));
  if (resetDelay !== undefined) return resetDelay;

  return DEFAULT_WB_RATE_LIMIT_DELAY_MS;
}

export class WbRateLimitError extends Error {
  retryAfterSeconds: number;
  blockedUntil: number;
  statusCode: number;

  constructor({
    statusCode,
    retryAfterSeconds,
    blockedUntil,
    body,
  }: {
    statusCode: number;
    retryAfterSeconds: number;
    blockedUntil: number;
    body: string;
  }) {
    super(
      `HTTP ${statusCode}: WB rate-limit retry=${retryAfterSeconds}s blockedUntil=${new Date(blockedUntil).toISOString()} ${body.slice(0, 500)}`,
    );
    this.name = "WbRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.blockedUntil = blockedUntil;
    this.statusCode = statusCode;
  }
}

export function isWbRateLimitError(error: unknown): error is WbRateLimitError {
  return (
    error instanceof WbRateLimitError ||
    (
      typeof error === "object" &&
      error !== null &&
      "blockedUntil" in error &&
      "retryAfterSeconds" in error
    )
  );
}

export async function throwIfWbRateLimited(res: Response): Promise<void> {
  const delayMs = getWbRateLimitDelayMs(res);
  if (delayMs === undefined) return;

  const body = await res.text().catch(() => "");
  const retryAfterSeconds = Math.ceil(delayMs / 1000);
  throw new WbRateLimitError({
    statusCode: res.status,
    retryAfterSeconds,
    blockedUntil: Date.now() + delayMs + RATE_LIMIT_GUARD_BUFFER_MS,
    body,
  });
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 5,
  timeoutMs = 30_000,
): Promise<Response> {
  let res: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (e) {
    // Сетевая ошибка (HTTP/2 connection error, DNS, timeout и т.д.)
    if (retries > 0) {
      const delay = (6 - retries) * 5000;
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, options, retries - 1, timeoutMs);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
  if (getWbRateLimitDelayMs(res) !== undefined) {
    return res;
  }
  if ((res.status === 429 || res.status >= 500) && retries > 0) {
    const retryAfter = res.headers.get("X-Ratelimit-Retry");
    let delay: number;
    if (retryAfter) {
      delay = Math.ceil(parseFloat(retryAfter)) * 1000;
    } else if (res.status === 429) {
      // Глобальный лимит WB — ждём: 20s, 40s, 60s, 80s, 100s (суммарно 300с)
      delay = (6 - retries) * 20_000;
    } else {
      delay = (6 - retries) * 5000;
    }
    if (delay > MAX_RETRY_DELAY_MS) {
      return res;
    }
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, options, retries - 1, timeoutMs);
  }
  return res;
}

export async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    await throwIfWbRateLimited(res);
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    const retryAfter = res.headers.get("X-Ratelimit-Retry");
    const resetAfter = res.headers.get("X-Ratelimit-Reset");
    const rateLimit =
      retryAfter || resetAfter
        ? ` rateLimit retry=${retryAfter ?? "?"}s reset=${resetAfter ?? "?"}s`
        : "";
    throw new Error(`HTTP ${res.status}:${rateLimit} ${body.slice(0, 500)}`);
  }
}

export async function skipIfWbRateLimited(
  ctx: SyncActionContext,
  shopId: Id<"shops">,
  endpoint: string,
  logEndpoint = endpoint,
): Promise<boolean> {
  const guard = await ctx.runQuery<
    { shopId: Id<"shops">; endpoint: string },
    { blockedUntil: number; retryAfterSeconds: number } | null
  >(getWbRateLimitGuardRef, { shopId, endpoint });
  if (!guard) return false;

  const remainingSeconds = Math.max(
    1,
    Math.ceil((guard.blockedUntil - Date.now()) / 1000),
  );
  await ctx.runMutation(logSyncRef, {
    shopId,
    endpoint: logEndpoint,
    status: "skipped" as const,
    error: `WB rate-limit guard: skip until ${new Date(guard.blockedUntil).toISOString()} (${remainingSeconds}s left)`,
  });
  return true;
}

export async function recordWbRateLimitGuardFromError(
  ctx: SyncActionContext,
  shopId: Id<"shops">,
  endpoint: string,
  error: unknown,
): Promise<boolean> {
  if (!isWbRateLimitError(error)) return false;
  await ctx.runMutation(recordWbRateLimitGuardRef, {
    shopId,
    endpoint,
    blockedUntil: error.blockedUntil,
    retryAfterSeconds: error.retryAfterSeconds,
    statusCode: error.statusCode,
    error: error.message,
  });
  return true;
}

export async function clearWbRateLimitGuardForEndpoint(
  ctx: SyncActionContext,
  shopId: Id<"shops">,
  endpoint: string,
): Promise<void> {
  await ctx.runMutation(clearWbRateLimitGuardRef, { shopId, endpoint });
}

export const logSync = internalMutation({
  args: {
    shopId: v.id("shops"),
    endpoint: v.string(),
    status: v.union(v.literal("ok"), v.literal("error"), v.literal("skipped")),
    error: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("syncLog", {
      shopId: args.shopId,
      endpoint: args.endpoint,
      status: args.status,
      error: args.error,
      count: args.count,
      syncedAt: Date.now(),
    });
  },
});

export const getWbRateLimitGuard = internalQuery({
  args: { shopId: v.id("shops"), endpoint: v.string() },
  handler: async (ctx, { shopId, endpoint }) => {
    const guard = await ctx.db
      .query("wbRateLimitGuards")
      .withIndex("by_shop_endpoint", (q) =>
        q.eq("shopId", shopId).eq("endpoint", endpoint)
      )
      .first();
    if (!guard || guard.blockedUntil <= Date.now()) return null;
    return {
      blockedUntil: guard.blockedUntil,
      retryAfterSeconds: guard.retryAfterSeconds,
    };
  },
});

export const recordWbRateLimitGuard = internalMutation({
  args: {
    shopId: v.id("shops"),
    endpoint: v.string(),
    blockedUntil: v.number(),
    retryAfterSeconds: v.number(),
    statusCode: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wbRateLimitGuards")
      .withIndex("by_shop_endpoint", (q) =>
        q.eq("shopId", args.shopId).eq("endpoint", args.endpoint)
      )
      .first();
    const row = {
      blockedUntil: args.blockedUntil,
      retryAfterSeconds: args.retryAfterSeconds,
      statusCode: args.statusCode,
      error: args.error,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, row);
    } else {
      await ctx.db.insert("wbRateLimitGuards", {
        shopId: args.shopId,
        endpoint: args.endpoint,
        ...row,
      });
    }
  },
});

export const clearWbRateLimitGuard = internalMutation({
  args: { shopId: v.id("shops"), endpoint: v.string() },
  handler: async (ctx, { shopId, endpoint }) => {
    const existing = await ctx.db
      .query("wbRateLimitGuards")
      .withIndex("by_shop_endpoint", (q) =>
        q.eq("shopId", shopId).eq("endpoint", endpoint)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
