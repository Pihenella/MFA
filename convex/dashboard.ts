import { query } from "./_generated/server";
import { v } from "convex/values";

export const getOrders = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    if (shopId) {
      return await ctx.db
        .query("orders")
        .withIndex("by_shop_date", (q) =>
          q.eq("shopId", shopId).gte("date", dateFrom).lte("date", dateTo)
        )
        .collect();
    }
    const results = await ctx.db.query("orders").collect();
    return results.filter((o) => o.date >= dateFrom && o.date <= dateTo);
  },
});

export const getSales = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    if (shopId) {
      return await ctx.db
        .query("sales")
        .withIndex("by_shop_date", (q) =>
          q.eq("shopId", shopId).gte("date", dateFrom).lte("date", dateTo)
        )
        .collect();
    }
    const results = await ctx.db.query("sales").collect();
    return results.filter((s) => s.date >= dateFrom && s.date <= dateTo);
  },
});

export const getFinancials = query({
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
    const results = await ctx.db.query("financials").collect();
    return results.filter((f) => f.dateFrom >= dateFrom && f.dateFrom <= dateTo);
  },
});

export const getCosts = query({
  args: {
    shopId: v.optional(v.id("shops")),
  },
  handler: async (ctx, { shopId }) => {
    if (shopId) {
      return await ctx.db
        .query("costs")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    }
    return await ctx.db.query("costs").collect();
  },
});

export const getCampaigns = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    if (shopId) {
      const results = await ctx.db
        .query("campaigns")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
      return results.filter((c) => {
        const d = new Date(c.updatedAt).toISOString().slice(0, 10);
        return d >= dateFrom && d <= dateTo;
      });
    }
    const results = await ctx.db.query("campaigns").collect();
    return results.filter((c) => {
      const d = new Date(c.updatedAt).toISOString().slice(0, 10);
      return d >= dateFrom && d <= dateTo;
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
