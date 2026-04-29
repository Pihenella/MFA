import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import {
  fetchWithRetry,
  assertOk,
  clearWbRateLimitGuardForEndpoint,
  recordWbRateLimitGuardFromError,
  skipIfWbRateLimited,
} from "./helpers";
import { upsertTariffsRef, logSyncRef } from "../lib/syncRefs";

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
        warehouseName: String(t.warehouseName ?? ""),
        boxDeliveryBase: Number(t.boxDeliveryAndStorageExpr ?? t.boxDeliveryBase) || 0,
        boxDeliveryLiter: Number(t.boxDeliveryLiter) || 0,
        boxStorageBase: Number(t.boxStorageBase) || 0,
        boxStorageLiter: Number(t.boxStorageLiter) || 0,
        updatedAt: Date.now(),
      });
    }
  },
});

export const syncTariffs = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    if (await skipIfWbRateLimited(ctx, shopId, "tariffs")) return;

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
        await ctx.runMutation(upsertTariffsRef, { shopId, tariffs });
      }
      await clearWbRateLimitGuardForEndpoint(ctx, shopId, "tariffs");
      await ctx.runMutation(logSyncRef, {
        shopId, endpoint: "tariffs", status: "ok" as const, count: tariffs.length ?? 0,
      });
    } catch (e: any) {
      await recordWbRateLimitGuardFromError(ctx, shopId, "tariffs", e);
      await ctx.runMutation(logSyncRef, {
        shopId, endpoint: "tariffs", status: "error" as const, error: e.message,
      });
    }
  },
});
