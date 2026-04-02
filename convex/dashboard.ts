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
    // WB financials имеют dateFrom = начало недельного отчёта (понедельник).
    // Сдвигаем на 7 дней назад, чтобы захватить отчёты, чей период пересекается с запрошенным.
    const adjustedFrom = new Date(dateFrom + "T00:00:00Z");
    adjustedFrom.setDate(adjustedFrom.getDate() - 7);
    const adjustedDateFrom = adjustedFrom.toISOString().slice(0, 10);

    if (shopId) {
      return await ctx.db
        .query("financials")
        .withIndex("by_shop_date", (q) =>
          q.eq("shopId", shopId).gte("dateFrom", adjustedDateFrom).lte("dateFrom", dateTo)
        )
        .collect();
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("financials")
          .withIndex("by_shop_date", (q) =>
            q.eq("shopId", s._id).gte("dateFrom", adjustedDateFrom).lte("dateFrom", dateTo)
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
  handler: async (ctx, { shopId }) => {
    if (shopId) {
      return await ctx.db
        .query("campaigns")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
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
    return results.flat();
  },
});

export const getNmReports = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, { shopId }) => {
    // NM Reports хранятся агрегированно за период синка — возвращаем все для магазина
    if (shopId) {
      return await ctx.db
        .query("nmReports")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("nmReports")
          .withIndex("by_shop", (q) => q.eq("shopId", s._id))
          .collect()
      )
    );
    return results.flat();
  },
});

export const getProductCards = query({
  args: { shopId: v.optional(v.id("shops")) },
  handler: async (ctx, { shopId }) => {
    if (shopId) {
      return await ctx.db
        .query("productCards")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("productCards")
          .withIndex("by_shop", (q) => q.eq("shopId", s._id))
          .collect()
      )
    );
    return results.flat();
  },
});

export const getFeedbacks = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    const filterByDate = (items: any[]) => {
      if (!dateFrom || !dateTo) return items;
      return items.filter((i) => {
        const d = i.createdDate?.slice(0, 10) ?? "";
        return d >= dateFrom && d <= dateTo;
      });
    };
    if (shopId) {
      const results = await ctx.db
        .query("feedbacks")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
      return filterByDate(results);
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("feedbacks")
          .withIndex("by_shop", (q) => q.eq("shopId", s._id))
          .collect()
      )
    );
    return filterByDate(results.flat());
  },
});

export const getQuestions = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    const filterByDate = (items: any[]) => {
      if (!dateFrom || !dateTo) return items;
      return items.filter((i) => {
        const d = i.createdDate?.slice(0, 10) ?? "";
        return d >= dateFrom && d <= dateTo;
      });
    };
    if (shopId) {
      const results = await ctx.db
        .query("questions")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
      return filterByDate(results);
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("questions")
          .withIndex("by_shop", (q) => q.eq("shopId", s._id))
          .collect()
      )
    );
    return filterByDate(results.flat());
  },
});

export const getReturns = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    const filterByDate = (items: any[]) => {
      if (!dateFrom || !dateTo) return items;
      return items.filter((i) => {
        const d = i.returnDate ?? "";
        return d >= dateFrom && d <= dateTo;
      });
    };
    if (shopId) {
      const results = await ctx.db
        .query("returns")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
      return filterByDate(results);
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("returns")
          .withIndex("by_shop", (q) => q.eq("shopId", s._id))
          .collect()
      )
    );
    return filterByDate(results.flat());
  },
});

export const getPrices = query({
  args: { shopId: v.optional(v.id("shops")) },
  handler: async (ctx, { shopId }) => {
    if (shopId) {
      return await ctx.db
        .query("prices")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) =>
        ctx.db
          .query("prices")
          .withIndex("by_shop", (q) => q.eq("shopId", s._id))
          .collect()
      )
    );
    return results.flat();
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