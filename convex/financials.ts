import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ensureShopAccess, listUserShopIds } from "./lib/helpers";

export const getReports = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    // Фильтруем по rrDt — дате операции (как МП Факт)
    if (shopId) {
      await ensureShopAccess(ctx, shopId);
      return await ctx.db
        .query("financials")
        .withIndex("by_shop_rrdt", (q) =>
          q.eq("shopId", shopId).gte("rrDt", dateFrom).lte("rrDt", dateTo)
        )
        .collect();
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("financials")
          .withIndex("by_shop_rrdt", (q) =>
            q.eq("shopId", sid).gte("rrDt", dateFrom).lte("rrDt", dateTo)
          )
          .collect()
      )
    );
    return results.flat();
  },
});

export const clearByShop = mutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await ensureShopAccess(ctx, shopId);
    const rows = await ctx.db
      .query("financials")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .take(500);
    for (const r of rows) {
      await ctx.db.delete(r._id);
    }
    return rows.length;
  },
});
