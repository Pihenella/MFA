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
    // Если true — принудительно фильтр по rrDt (дата операции). Для /pulse и дневных графиков.
    // По умолчанию (false) — гибрид:
    //   1) пробуем фильтр по периоду отчёта WB (dateFrom >= queryStart AND dateTo <= queryEnd) — как МПФакт
    //   2) если ни один отчёт не поместился целиком (single-day, partial-week, «свежие даты») —
    //      fallback на rrDt-фильтр чтобы показать реальные операции за выбранные дни
    byOperationDate: v.optional(v.boolean()),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo, byOperationDate }) => {
    const byRrDt = async (sid: typeof shopId) =>
      ctx.db
        .query("financials")
        .withIndex("by_shop_rrdt", (q) =>
          q.eq("shopId", sid!).gte("rrDt", dateFrom).lte("rrDt", dateTo)
        )
        .collect();

    const byReportPeriod = async (sid: typeof shopId) => {
      const rows = await ctx.db
        .query("financials")
        .withIndex("by_shop_date", (q) =>
          q.eq("shopId", sid!).gte("dateFrom", dateFrom).lte("dateFrom", dateTo)
        )
        .collect();
      return rows.filter((r) => r.dateTo <= dateTo);
    };

    const forShop = async (sid: typeof shopId) => {
      if (byOperationDate) return await byRrDt(sid);
      const reportRows = await byReportPeriod(sid);
      if (reportRows.length > 0) return reportRows;
      // Полностью ни одна недельная выгрузка не поместилась в диапазон —
      // показываем дневной срез по rrDt (например, запрос на 1 день)
      return await byRrDt(sid);
    };

    if (shopId) return await forShop(shopId);
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(shops.map((s) => forShop(s._id)));
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
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    // NM Reports хранятся агрегированно за запрошенный период.
    // Фильтруем по periodStart === dateFrom, чтобы вернуть данные только за нужный период.
    const filterByPeriod = (rows: any[]) => {
      if (!dateFrom) return rows;
      return rows.filter((r) => r.periodStart === dateFrom && (!dateTo || r.periodEnd === dateTo));
    };

    if (shopId) {
      if (dateFrom) {
        const rows = await ctx.db
          .query("nmReports")
          .withIndex("by_shop_period", (q) =>
            q.eq("shopId", shopId).eq("periodStart", dateFrom)
          )
          .collect();
        return filterByPeriod(rows);
      }
      return await ctx.db
        .query("nmReports")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    }
    const shops = await ctx.db.query("shops").collect();
    const results = await Promise.all(
      shops.map((s) => {
        if (dateFrom) {
          return ctx.db
            .query("nmReports")
            .withIndex("by_shop_period", (q) =>
              q.eq("shopId", s._id).eq("periodStart", dateFrom)
            )
            .collect();
        }
        return ctx.db
          .query("nmReports")
          .withIndex("by_shop", (q) => q.eq("shopId", s._id))
          .collect();
      })
    );
    return filterByPeriod(results.flat());
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