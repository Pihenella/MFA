import { query } from "./_generated/server";
import { v } from "convex/values";
import { ensureShopAccess, listUserShopIds } from "./lib/helpers";

export const getOrders = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }) => {
    if (shopId) {
      await ensureShopAccess(ctx, shopId);
      return await ctx.db
        .query("orders")
        .withIndex("by_shop_date", (q) =>
          q.eq("shopId", shopId).gte("date", dateFrom).lte("date", dateTo)
        )
        .collect();
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("orders")
          .withIndex("by_shop_date", (q) =>
            q.eq("shopId", sid).gte("date", dateFrom).lte("date", dateTo)
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
      await ensureShopAccess(ctx, shopId);
      return await ctx.db
        .query("sales")
        .withIndex("by_shop_date", (q) =>
          q.eq("shopId", shopId).gte("date", dateFrom).lte("date", dateTo)
        )
        .collect();
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("sales")
          .withIndex("by_shop_date", (q) =>
            q.eq("shopId", sid).gte("date", dateFrom).lte("date", dateTo)
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

    if (shopId) {
      await ensureShopAccess(ctx, shopId);
      return await forShop(shopId);
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(shopIds.map((sid) => forShop(sid)));
    return results.flat();
  },
});

export const getCosts = query({
  args: {
    shopId: v.optional(v.id("shops")),
  },
  handler: async (ctx, { shopId }) => {
    if (shopId) {
      await ensureShopAccess(ctx, shopId);
      return await ctx.db
        .query("costs")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("costs")
          .withIndex("by_shop", (q) => q.eq("shopId", sid))
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
      await ensureShopAccess(ctx, shopId);
      return await ctx.db
        .query("campaigns")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("campaigns")
          .withIndex("by_shop", (q) => q.eq("shopId", sid))
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
    // Возвращаем все записи, чей агрегатный период полностью покрыт [dateFrom, dateTo].
    // Если за один nmId есть несколько таких записей — берём с самым свежим periodEnd
    // (актуально при пересинке за разные диапазоны: 7д/30д/произвольный).
    // Без EXACT-match по periodStart — иначе на нестандартных диапазонах (например 01-23.04)
    // в БД нет записи с точно такими датами и дашборд показывает нули.
    const collectFor = async (sid: typeof shopId) => {
      const all = await ctx.db
        .query("nmReports")
        .withIndex("by_shop", (q) => q.eq("shopId", sid!))
        .collect();
      if (!dateFrom) return all;
      const inRange = all.filter((r) => {
        if (r.periodStart < dateFrom) return false;
        if (dateTo && r.periodEnd > dateTo) return false;
        return true;
      });
      const byNm = new Map<number, typeof inRange[number]>();
      for (const r of inRange) {
        const prev = byNm.get(r.nmId);
        if (!prev || (r.periodEnd ?? "") > (prev.periodEnd ?? "")) {
          byNm.set(r.nmId, r);
        }
      }
      return [...byNm.values()];
    };

    if (shopId) {
      await ensureShopAccess(ctx, shopId);
      return await collectFor(shopId);
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(shopIds.map((sid) => collectFor(sid)));
    return results.flat();
  },
});

export const getProductCards = query({
  args: { shopId: v.optional(v.id("shops")) },
  handler: async (ctx, { shopId }) => {
    if (shopId) {
      await ensureShopAccess(ctx, shopId);
      return await ctx.db
        .query("productCards")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("productCards")
          .withIndex("by_shop", (q) => q.eq("shopId", sid))
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
      await ensureShopAccess(ctx, shopId);
      const results = await ctx.db
        .query("feedbacks")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
      return filterByDate(results);
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("feedbacks")
          .withIndex("by_shop", (q) => q.eq("shopId", sid))
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
      await ensureShopAccess(ctx, shopId);
      const results = await ctx.db
        .query("questions")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
      return filterByDate(results);
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("questions")
          .withIndex("by_shop", (q) => q.eq("shopId", sid))
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
      await ensureShopAccess(ctx, shopId);
      const results = await ctx.db
        .query("returns")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
      return filterByDate(results);
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("returns")
          .withIndex("by_shop", (q) => q.eq("shopId", sid))
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
      await ensureShopAccess(ctx, shopId);
      return await ctx.db
        .query("prices")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    }
    const shopIds = await listUserShopIds(ctx);
    const results = await Promise.all(
      shopIds.map((sid) =>
        ctx.db
          .query("prices")
          .withIndex("by_shop", (q) => q.eq("shopId", sid))
          .collect()
      )
    );
    return results.flat();
  },
});

export const getStocks = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await ensureShopAccess(ctx, shopId);
    return await ctx.db
      .query("stocks")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
  },
});
