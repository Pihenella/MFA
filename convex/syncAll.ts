import { internalAction } from "./_generated/server";
import {
  shopsListInternalRef,
  shopsUpdateLastSyncRef,
  syncOrdersRef,
  syncSalesRef,
  syncStocksRef,
  syncFinancialsRef,
  syncPromotionRef,
  syncAnalyticsRef,
  syncContentRef,
  syncFeedbacksRef,
  syncPricesRef,
  syncReturnsRef,
  syncTariffsRef,
} from "./lib/syncRefs";

// Каждая функция синхронизирует одну категорию для всех активных магазинов.
// Вызываются из отдельных кронов со сдвигом по времени,
// чтобы не превышать глобальный rate limit WB на продавца.
//
// Между магазинами — пауза 65с, чтобы не триггерить глобальный лимит.
const INTER_SHOP_DELAY = 65_000;

export const syncAllOrders = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    let first = true;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      if (!first) await new Promise((r) => setTimeout(r, INTER_SHOP_DELAY));
      first = false;
      await ctx.runAction(syncOrdersRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllSales = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    let first = true;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      if (!first) await new Promise((r) => setTimeout(r, INTER_SHOP_DELAY));
      first = false;
      await ctx.runAction(syncSalesRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllStocks = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    let first = true;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      if (!first) await new Promise((r) => setTimeout(r, INTER_SHOP_DELAY));
      first = false;
      await ctx.runAction(syncStocksRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllFinancials = internalAction({
  handler: async (ctx) => {
    // Финансовый отчёт для одного магазина может идти 5-6 минут (WB Statistics
    // API лимит 1 req/min × 5-6 страниц пагинации по 1000 rrdId). Два магазина
    // подряд превышают 10-минутный timeout Convex action — второй шоп обрезается
    // до первой записи в БД. Планируем каждый шоп отдельным action через
    // scheduler.runAfter, чтобы у каждого был свой 10-минутный бюджет.
    const shops = await ctx.runQuery(shopsListInternalRef);
    let delay = 0;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      await ctx.scheduler.runAfter(delay, syncFinancialsRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
      // Разнос по 8 минут — запас над 6-минутным синком одного шопа.
      delay += 8 * 60 * 1000;
    }
  },
});

export const syncAllPromotion = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    let first = true;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      if (!first) await new Promise((r) => setTimeout(r, INTER_SHOP_DELAY));
      first = false;
      await ctx.runAction(syncPromotionRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllAnalytics = internalAction({
  handler: async (ctx) => {
    // Аналогично syncAllFinancials — seller-analytics-api может долго паузиться
    // на 429 (до 4 retry × 60с+) + пагинация 30с/стр. Два шопа подряд упирались
    // в 10-мин timeout Convex action. Разносим по отдельным action через scheduler.
    const shops = await ctx.runQuery(shopsListInternalRef);
    let delay = 0;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      await ctx.scheduler.runAfter(delay, syncAnalyticsRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
      delay += 8 * 60 * 1000;
    }
  },
});

export const syncAllContent = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    let first = true;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      if (!first) await new Promise((r) => setTimeout(r, INTER_SHOP_DELAY));
      first = false;
      await ctx.runAction(syncContentRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllFeedbacks = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    let first = true;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      if (!first) await new Promise((r) => setTimeout(r, INTER_SHOP_DELAY));
      first = false;
      await ctx.runAction(syncFeedbacksRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllPrices = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    let first = true;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      if (!first) await new Promise((r) => setTimeout(r, INTER_SHOP_DELAY));
      first = false;
      await ctx.runAction(syncPricesRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllReturns = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    let first = true;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      if (!first) await new Promise((r) => setTimeout(r, INTER_SHOP_DELAY));
      first = false;
      await ctx.runAction(syncReturnsRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllTariffs = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    let first = true;
    for (const shop of shops) {
      if (!shop.isActive) continue;
      if (!first) await new Promise((r) => setTimeout(r, INTER_SHOP_DELAY));
      first = false;
      await ctx.runAction(syncTariffsRef, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

// Обновить lastSyncAt для всех магазинов (вызывается последним кроном в цикле)
export const updateAllLastSync = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(shopsListInternalRef);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      await ctx.runMutation(shopsUpdateLastSyncRef, { id: shop._id });
    }
  },
});
