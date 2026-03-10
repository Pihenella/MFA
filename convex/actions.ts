import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const triggerSync = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");
    await ctx.runAction(internal.sync.syncShop, {
      shopId,
      apiKey: shop.apiKey,
      enabledCategories: shop.enabledCategories ?? undefined,
    });
  },
});

// Запрос аналитики для конкретного периода (вызывается с фронтенда при смене дат)
// Прямой fetch без вложенных actions чтобы избежать таймаутов Cloudflare
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

    if (!res.ok) return 0; // Тихо пропускаем ошибки (429 и др.)

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
