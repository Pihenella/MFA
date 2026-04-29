import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import {
  chunk,
  BATCH_SIZE,
  fetchWithRetry,
  assertOk,
  clearWbRateLimitGuardForEndpoint,
  recordWbRateLimitGuardFromError,
  skipIfWbRateLimited,
} from "./helpers";
import { upsertReturnsRef, logSyncRef } from "../lib/syncRefs";

export const upsertReturns = internalMutation({
  args: { shopId: v.id("shops"), returns: v.array(v.any()) },
  handler: async (ctx, { shopId, returns }) => {
    for (const r of returns) {
      const returnId = String(r.id ?? r.rid ?? "");
      const existing = await ctx.db
        .query("returns")
        .withIndex("by_shop_return", (q) =>
          q.eq("shopId", shopId).eq("returnId", returnId)
        )
        .first();
      const row = {
        shopId,
        returnId,
        nmId: Number(r.nm_id ?? r.nmId) || 0,
        orderId: String(r.order_id ?? r.orderId ?? ""),
        returnDate: String(r.dt ?? r.returnDate ?? "").slice(0, 10),
        warehouseName: String(r.warehouse_name ?? r.warehouseName ?? ""),
        status: String(r.status ?? ""),
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("returns", row);
      }
    }
  },
});

export const syncReturns = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    if (await skipIfWbRateLimited(ctx, shopId, "returns")) return;

    const headers: Record<string, string> = { Authorization: apiKey };

    try {
      let totalCount = 0;
      for (const isArchive of [false, true]) {
        const res = await fetchWithRetry(
          `https://returns-api.wildberries.ru/api/v1/claims?is_archive=${isArchive}`,
          { headers },
        );
        await assertOk(res);
        const data = await res.json();
        const returns = Array.isArray(data) ? data : data.claims ?? [];
        if (Array.isArray(returns) && returns.length > 0) {
          totalCount += returns.length;
          const batches = chunk(returns, BATCH_SIZE);
          for (const batch of batches) {
            await ctx.runMutation(upsertReturnsRef, { shopId, returns: batch });
          }
        }
        await new Promise((r) => setTimeout(r, 20_000));
      }
      await clearWbRateLimitGuardForEndpoint(ctx, shopId, "returns");
      await ctx.runMutation(logSyncRef, {
        shopId, endpoint: "returns", status: "ok" as const, count: totalCount,
      });
    } catch (e: any) {
      await recordWbRateLimitGuardFromError(ctx, shopId, "returns", e);
      await ctx.runMutation(logSyncRef, {
        shopId, endpoint: "returns", status: "error" as const, error: e.message,
      });
    }
  },
});
