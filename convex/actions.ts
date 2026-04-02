import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const CATEGORY_ACTIONS: Record<string, any> = {
  statistics_orders: internal.sync.syncStatistics.syncOrders,
  statistics_sales: internal.sync.syncStatistics.syncSales,
  statistics_stocks: internal.sync.syncStatistics.syncStocks,
  statistics_financials: internal.sync.syncStatistics.syncFinancials,
  promotion: internal.sync.syncPromotion.syncPromotion,
  analytics: internal.sync.syncAnalytics.syncAnalytics,
  content: internal.sync.syncContent.syncContent,
  feedbacks: internal.sync.syncFeedbacks.syncFeedbacks,
  prices: internal.sync.syncPrices.syncPrices,
  returns: internal.sync.syncReturns.syncReturns,
  tariffs: internal.sync.syncTariffs.syncTariffs,
};

// Ручной триггер: запускает категории по очереди с паузами для rate limit
export const triggerSync = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");

    const enabled = shop.enabledCategories ?? ["statistics", "promotion", "analytics"];

    const steps: string[] = [];
    if (enabled.includes("statistics")) {
      steps.push("statistics_orders", "statistics_sales", "statistics_stocks", "statistics_financials");
    }
    for (const cat of enabled) {
      if (cat !== "statistics" && CATEGORY_ACTIONS[cat]) {
        steps.push(cat);
      }
    }

    for (let i = 0; i < steps.length; i++) {
      // Пауза 65с между запросами к WB (глобальный лимит + statistics: 1 req/min)
      if (i > 0) await new Promise((r) => setTimeout(r, 65000));
      const actionRef = CATEGORY_ACTIONS[steps[i]];
      if (actionRef) {
        await ctx.runAction(actionRef, { shopId, apiKey: shop.apiKey });
      }
    }

    await ctx.runMutation(internal.shops.updateLastSync, { id: shopId });
  },
});

// Ресинк только финансов (для ручного вызова после очистки данных)
export const resyncFinancials = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");
    await ctx.runAction(internal.sync.syncStatistics.syncFinancials, { shopId, apiKey: shop.apiKey });
  },
});

// Debug: получить сырые поля из WB API (временный)
export const debugWbFields = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }): Promise<unknown> => {
    const shops: Array<{ _id: string; apiKey: string }> = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s: { _id: string }) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const res: Response = await fetch(
      `https://statistics-api.wildberries.ru/api/v5/supplier/reportDetailByPeriod?dateFrom=${thirtyDaysAgo}&dateTo=${today}&limit=5&rrdid=0`,
      { headers: { Authorization: shop.apiKey } },
    );
    if (!res.ok) return { error: res.status, text: await res.text() };
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return { error: "empty" };
    // Вернуть по одной записи каждого типа операции
    const seen = new Set<string>();
    const samples: unknown[] = [];
    for (const row of data) {
      const op = row.supplier_oper_name ?? "";
      if (!seen.has(op)) { seen.add(op); samples.push(row); }
    }
    return samples;
  },
});

// Запрос аналитики для конкретного периода (вызывается с фронтенда при смене дат)
export const fetchAnalytics = action({
  args: {
    shopId: v.id("shops"),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }): Promise<number> => {
    const shops: Array<{ _id: string; apiKey: string }> = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s: { _id: string }) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");

    const res = await fetch(
      `https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products`,
      {
        method: "POST",
        headers: {
          Authorization: shop.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nmIds: [],
          brandNames: [],
          subjectIds: [],
          tagIds: [],
          selectedPeriod: { start: dateFrom, end: dateTo },
          page: 1,
        }),
      },
    );

    if (!res.ok) return 0;

    const data = await res.json();
    const products = data.data?.products ?? [];

    const reports = products.map((p: any) => {
      const stat = p.statistic?.selected ?? {};
      const conv = stat.conversions ?? {};
      return {
        nmID: p.product?.nmId ?? 0,
        periodStart: dateFrom,
        periodEnd: dateTo,
        statistics: {
          selectedPeriod: {
            openCardCount: stat.openCount ?? 0,
            addToCartCount: stat.cartCount ?? 0,
            ordersCount: stat.orderCount ?? 0,
            buyoutsCount: stat.buyoutCount ?? 0,
            conversions: {
              addToCartPercent: conv.addToCartPercent ?? 0,
              cartToOrderPercent: conv.cartToOrderPercent ?? 0,
            },
          },
        },
      };
    });

    if (reports.length > 0) {
      await ctx.runMutation(internal.sync.syncAnalytics.upsertNmReports, {
        shopId,
        reports,
      });
    }

    return reports.length;
  },
});
