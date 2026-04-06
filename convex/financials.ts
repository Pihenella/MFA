import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getReports = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    // Фильтруем по rrDt — дате операции (как МП Факт)
    if (shopId) {
      return await ctx.db
        .query("financials")
        .withIndex("by_shop_rrdt", (q) =>
          q.eq("shopId", shopId).gte("rrDt", dateFrom).lte("rrDt", dateTo)
        )
        .collect();
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("financials")
          .withIndex("by_shop_rrdt", (q) =>
            q.eq("shopId", s._id).gte("rrDt", dateFrom).lte("rrDt", dateTo)
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
