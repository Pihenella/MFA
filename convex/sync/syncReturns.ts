import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { chunk, BATCH_SIZE, fetchWithRetry, assertOk } from "./helpers";

export const upsertReturns = internalMutation({
  args: { shopId: v.id("shops"), returns: v.array(v.any()) },
  handler: async (ctx, { shopId, returns }) => {
    for (const r of returns) {
      const returnId = String(r.id ?? r.rid ?? "");
      const existing = await ctx.db
        .query("returns")
        .withIndex("by_return_id", (q) => q.eq("returnId", returnId))
        .first();
      const row = {
        shopId,
        returnId,
        nmId: r.nm_id ?? r.nmId ?? 0,
        orderId: String(r.order_id ?? r.orderId ?? ""),
        returnDate: (r.dt ?? r.returnDate ?? "").slice(0, 10),
        warehouseName: r.warehouse_name ?? r.warehouseName ?? "",
        status: r.status ?? "",
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
    const headers: Record<string, string> = { Authorization: apiKey };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    try {
      let offset = 0;
      let totalCount = 0;
      while (true) {
        const res = await fetchWithRetry(
          `https://returns-api.wildberries.ru/api/v1/returns?dateFrom=${thirtyDaysAgo}&limit=1000&offset=${offset}`,
          { headers },
        );
        await assertOk(res);
        const data = await res.json();
        const returns = Array.isArray(data) ? data : data.returns ?? [];
        if (!Array.isArray(returns) || returns.length === 0) break;
        totalCount += returns.length;
        const batches = chunk(returns, BATCH_SIZE);
        for (const batch of batches) {
          await ctx.runMutation(internal.sync.syncReturns.upsertReturns, { shopId, returns: batch });
        }
        if (returns.length < 1000) break;
        offset += returns.length;
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "returns", status: "ok" as const, count: totalCount,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "returns", status: "error" as const, error: e.message,
      });
    }
  },
});
