import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Каждая функция синхронизирует одну категорию для всех активных магазинов.
// Вызываются из отдельных кронов со сдвигом по времени,
// чтобы не превышать глобальный rate limit WB на продавца.

export const syncAllOrders = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      await ctx.runAction(internal.sync.syncStatistics.syncOrders, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllSales = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      await ctx.runAction(internal.sync.syncStatistics.syncSales, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllStocks = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      await ctx.runAction(internal.sync.syncStatistics.syncStocks, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllFinancials = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      await ctx.runAction(internal.sync.syncStatistics.syncFinancials, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllPromotion = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      const categories = shop.enabledCategories ?? ["statistics", "promotion", "analytics"];
      if (!categories.includes("promotion")) continue;
      await ctx.runAction(internal.sync.syncPromotion.syncPromotion, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllAnalytics = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      const categories = shop.enabledCategories ?? ["statistics", "promotion", "analytics"];
      if (!categories.includes("analytics")) continue;
      await ctx.runAction(internal.sync.syncAnalytics.syncAnalytics, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllContent = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      const categories = shop.enabledCategories ?? ["statistics", "promotion", "analytics"];
      if (!categories.includes("content")) continue;
      await ctx.runAction(internal.sync.syncContent.syncContent, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllFeedbacks = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      const categories = shop.enabledCategories ?? ["statistics", "promotion", "analytics"];
      if (!categories.includes("feedbacks")) continue;
      await ctx.runAction(internal.sync.syncFeedbacks.syncFeedbacks, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllPrices = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      const categories = shop.enabledCategories ?? ["statistics", "promotion", "analytics"];
      if (!categories.includes("prices")) continue;
      await ctx.runAction(internal.sync.syncPrices.syncPrices, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllReturns = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      const categories = shop.enabledCategories ?? ["statistics", "promotion", "analytics"];
      if (!categories.includes("returns")) continue;
      await ctx.runAction(internal.sync.syncReturns.syncReturns, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

export const syncAllTariffs = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      const categories = shop.enabledCategories ?? ["statistics", "promotion", "analytics"];
      if (!categories.includes("tariffs")) continue;
      await ctx.runAction(internal.sync.syncTariffs.syncTariffs, {
        shopId: shop._id, apiKey: shop.apiKey,
      });
    }
  },
});

// Обновить lastSyncAt для всех магазинов (вызывается последним кроном в цикле)
export const updateAllLastSync = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      await ctx.runMutation(internal.shops.updateLastSync, { id: shop._id });
    }
  },
});
