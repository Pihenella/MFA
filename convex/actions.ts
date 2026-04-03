import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Список категорий для синка по порядку, с задержками (в мс) между ними.
// WB глобальный лимит: все API одного продавца считаются вместе.
// Statistics: 1 req/min. Остальные: ~3-5 req/min.
const SYNC_STEPS: Array<{ key: string; ref: any; delayMs: number }> = [
  { key: "statistics_orders",     ref: internal.sync.syncStatistics.syncOrders,     delayMs: 0 },
  { key: "statistics_sales",      ref: internal.sync.syncStatistics.syncSales,      delayMs: 65_000 },
  { key: "statistics_stocks",     ref: internal.sync.syncStatistics.syncStocks,     delayMs: 130_000 },
  { key: "statistics_financials", ref: internal.sync.syncStatistics.syncFinancials, delayMs: 195_000 },
  { key: "promotion",            ref: internal.sync.syncPromotion.syncPromotion,   delayMs: 300_000 },
  { key: "content",              ref: internal.sync.syncContent.syncContent,        delayMs: 390_000 },
  { key: "feedbacks",            ref: internal.sync.syncFeedbacks.syncFeedbacks,    delayMs: 420_000 },
  { key: "prices",               ref: internal.sync.syncPrices.syncPrices,          delayMs: 450_000 },
  { key: "returns",              ref: internal.sync.syncReturns.syncReturns,        delayMs: 480_000 },
  { key: "tariffs",              ref: internal.sync.syncTariffs.syncTariffs,         delayMs: 510_000 },
  { key: "analytics",            ref: internal.sync.syncAnalytics.syncAnalytics,   delayMs: 570_000 },
];

// Ручной триггер: планирует каждую категорию через scheduler с задержками
// Не блокирует — возвращается сразу, синки идут в фоне
export const triggerSync = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");

    const enabled = shop.enabledCategories ?? ["statistics", "promotion", "analytics"];

    for (const step of SYNC_STEPS) {
      // Определяем, включена ли категория
      const category = step.key.startsWith("statistics_") ? "statistics" : step.key;
      if (!enabled.includes(category)) continue;

      await ctx.scheduler.runAfter(step.delayMs, step.ref, {
        shopId,
        apiKey: shop.apiKey,
      });
    }

    // Обновить lastSyncAt после последней запланированной задачи
    await ctx.scheduler.runAfter(600_000, internal.shops.updateLastSync, { id: shopId });
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
