import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { chunk, BATCH_SIZE, fetchWithRetry, assertOk } from "./helpers";

export const upsertPrices = internalMutation({
  args: { shopId: v.id("shops"), prices: v.array(v.any()) },
  handler: async (ctx, { shopId, prices }) => {
    for (const p of prices) {
      const nmId = p.nmID ?? p.nmId ?? 0;
      const existing = await ctx.db
        .query("prices")
        .withIndex("by_shop_nm", (q) => q.eq("shopId", shopId).eq("nmId", nmId))
        .first();
      const row = {
        shopId,
        nmId,
        supplierArticle: p.vendorCode ?? p.supplierArticle ?? "",
        price: p.sizes?.[0]?.price ?? p.price ?? 0,
        discount: p.discount ?? 0,
        promoCode: p.promoCode ?? undefined,
        updatedAt: Date.now(),
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("prices", row);
      }
    }
  },
});

export const syncPrices = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers: Record<string, string> = { Authorization: apiKey };

    try {
      let offset = 0;
      let totalCount = 0;
      while (true) {
        const res = await fetchWithRetry(
          `https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter?limit=1000&offset=${offset}`,
          { headers },
        );
        await assertOk(res);
        const data = await res.json();
        const goods = data.data?.listGoods ?? [];
        if (!Array.isArray(goods) || goods.length === 0) break;
        totalCount += goods.length;
        const batches = chunk(goods, BATCH_SIZE);
        for (const batch of batches) {
          await ctx.runMutation(internal.sync.syncPrices.upsertPrices, { shopId, prices: batch });
        }
        if (goods.length < 1000) break;
        offset += goods.length;
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "prices", status: "ok" as const, count: totalCount,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "prices", status: "error" as const, error: e.message,
      });
    }
  },
});
