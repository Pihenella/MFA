// @ts-nocheck — TS2589 (Convex deep type instantiation после расширения api в MFA-A.1). Runtime не страдает, схемы валидны.
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { verifyShopAccessRef } from "./lib/syncRefs";

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
  { key: "analytics",            ref: internal.sync.syncAnalytics.syncAnalytics,   delayMs: 660_000 },
];

// Ручной триггер: планирует каждую категорию через scheduler с задержками
// Не блокирует — возвращается сразу, синки идут в фоне
export const triggerSync = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await ctx.runMutation(verifyShopAccessRef, { shopId });
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
    await ctx.scheduler.runAfter(720_000, internal.shops.updateLastSync, { id: shopId });
  },
});

// Ресинк только финансов (для ручного вызова после очистки данных).
// Запускается через scheduler, чтобы не упереться в 10-мин timeout action
// (90д финансовых отчётов WB = 5-6 страниц × 61с пагинации).
export const resyncFinancials = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await ctx.runMutation(verifyShopAccessRef, { shopId });
    const shops = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");
    await ctx.scheduler.runAfter(0, internal.sync.syncStatistics.syncFinancials, {
      shopId,
      apiKey: shop.apiKey,
    });
  },
});

// Ресинк только orders. Вызывается при пропусках заказов за неделю
// (WB statistics endpoint 1 req/min, 90д = один запрос).
export const resyncOrders = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await ctx.runMutation(verifyShopAccessRef, { shopId });
    const shops = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");
    await ctx.scheduler.runAfter(0, internal.sync.syncStatistics.syncOrders, {
      shopId,
      apiKey: shop.apiKey,
    });
  },
});

// Debug: получить сырые поля из WB API (временный)
export const debugWbFields = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }): Promise<unknown> => {
    await ctx.runMutation(verifyShopAccessRef, { shopId });
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
// Делегируем в fetchAnalyticsForRange, который использует retry-логику
export const fetchAnalytics = action({
  args: {
    shopId: v.id("shops"),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { shopId, dateFrom, dateTo }): Promise<number> => {
    await ctx.runMutation(verifyShopAccessRef, { shopId });
    const shops: Array<{ _id: string; apiKey: string }> = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s: { _id: string }) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");

    const count = await ctx.runAction(internal.sync.syncAnalytics.fetchAnalyticsForRange, {
      shopId,
      apiKey: shop.apiKey,
      dateFrom,
      dateTo,
    });
    return count;
  },
});
