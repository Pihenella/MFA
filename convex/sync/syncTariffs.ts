import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { chunk, BATCH_SIZE, fetchWithRetry, assertOk } from "./helpers";

export const upsertTariffs = internalMutation({
  args: { shopId: v.id("shops"), tariffs: v.array(v.any()) },
  handler: async (ctx, { shopId, tariffs }) => {
    // Clear existing tariffs for shop first
    const existing = await ctx.db
      .query("tariffs")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);

    for (const t of tariffs) {
      await ctx.db.insert("tariffs", {
        shopId,
        warehouseName: t.warehouseName ?? "",
        boxDeliveryBase: t.boxDeliveryAndStorageExpr ?? t.boxDeliveryBase ?? 0,
        boxDeliveryLiter: t.boxDeliveryLiter ?? 0,
        boxStorageBase: t.boxStorageBase ?? 0,
        boxStorageLiter: t.boxStorageLiter ?? 0,
        updatedAt: Date.now(),
      });
    }
  },
});

export const syncTariffs = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers: Record<string, string> = { Authorization: apiKey };
    const today = new Date().toISOString().slice(0, 10);

    try {
      const res = await fetchWithRetry(
        `https://common-api.wildberries.ru/api/v1/tariffs/box?date=${today}`,
        { headers },
      );
      await assertOk(res);
      const data = await res.json();
      const tariffs = data.response?.data?.warehouseList ?? data.data ?? [];
      if (Array.isArray(tariffs) && tariffs.length > 0) {
        const batches = chunk(tariffs, BATCH_SIZE);
        for (const batch of batches) {
          await ctx.runMutation(internal.sync.syncTariffs.upsertTariffs, { shopId, tariffs: batch });
        }
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "tariffs", status: "ok" as const, count: tariffs.length ?? 0,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "tariffs", status: "error" as const, error: e.message,
      });
    }
  },
});
