import { query } from "./_generated/server";
import { v } from "convex/values";

export const getReports = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    if (shopId) {
      return await ctx.db
        .query("financials")
        .withIndex("by_shop_date", (q) =>
          q.eq("shopId", shopId).gte("dateFrom", dateFrom).lte("dateFrom", dateTo)
        )
        .collect();
    }
    const rows = await ctx.db.query("financials").collect();
    return rows.filter((r) => r.dateFrom >= dateFrom && r.dateFrom <= dateTo);
  },
});
