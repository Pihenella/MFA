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
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("orders")
          .withIndex("by_shop_date", (q) =>
            q.eq("shopId", s._id).gte("date", dateFrom).lte("date", dateTo)
          )
          .collect()
      )
    );
    return results.flat();
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
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("sales")
          .withIndex("by_shop_date", (q) =>
            q.eq("shopId", s._id).gte("date", dateFrom).lte("date", dateTo)
          )
          .collect()
      )
    );
    return results.flat();
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
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("financials")
          .withIndex("by_shop_date", (q) =>
            q.eq("shopId", s._id).gte("dateFrom", dateFrom).lte("dateFrom", dateTo)
          )
          .collect()
      )
    );
    return results.flat();
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
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("costs")
          .withIndex("by_shop", (q) => q.eq("shopId", s._id))
          .collect()
      )
    );
    return results.flat();
  },
});

export const getCampaigns = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    const filterByDate = (campaigns: any[]) =>
      campaigns.filter((c) => {
        const d = new Date(c.updatedAt).toISOString().slice(0, 10);
        return d >= dateFrom && d <= dateTo;
      });

    if (shopId) {
      const results = await ctx.db
        .query("campaigns")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
      return filterByDate(results);
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("campaigns")
          .withIndex("by_shop", (q) => q.eq("shopId", s._id))
          .collect()
      )
    );
    return filterByDate(results.flat());
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