import { query } from "./_generated/server";
import { v } from "convex/values";

export const getOrders = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    const results = await ctx.db.query("orders").collect();
    return results.filter((o) => {
      const matchShop = shopId ? o.shopId === shopId : true;
      return matchShop && o.date >= dateFrom && o.date <= dateTo;
    });
  },
});

export const getSales = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    const results = await ctx.db.query("sales").collect();
    return results.filter((s) => {
      const matchShop = shopId ? s.shopId === shopId : true;
      return matchShop && s.date >= dateFrom && s.date <= dateTo;
    });
  },
});

export const getFinancials = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    const results = await ctx.db.query("financials").collect();
    return results.filter((f) => {
      const matchShop = shopId ? f.shopId === shopId : true;
      return matchShop && f.dateFrom >= dateFrom && f.dateFrom <= dateTo;
    });
  },
});

export const getCosts = query({
  args: {
    shopId: v.optional(v.id("shops")),
  },
  handler: async (ctx, { shopId }) => {
    const results = await ctx.db.query("costs").collect();
    return shopId ? results.filter((c) => c.shopId === shopId) : results;
  },
});

export const getCampaigns = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    const results = await ctx.db.query("campaigns").collect();
    return results.filter((c) => {
      const matchShop = shopId ? c.shopId === shopId : true;
      const d = new Date(c.updatedAt).toISOString().slice(0, 10);
      return matchShop && d >= dateFrom && d <= dateTo;
    });
  },
});

export const getStocks = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    return await ctx.db
      .query("stocks")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
  },
});
