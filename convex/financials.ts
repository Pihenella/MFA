import { query } from "./_generated/server";
import { v } from "convex/values";

export const getReports = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    const rows = await ctx.db.query("financials").collect();
    return rows.filter((r) => {
      const matchShop = shopId ? r.shopId === shopId : true;
      return matchShop && r.dateFrom >= dateFrom && r.dateFrom <= dateTo;
    });
  },
});
