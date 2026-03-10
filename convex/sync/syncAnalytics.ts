import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { chunk, BATCH_SIZE, fetchWithRetry, assertOk } from "./helpers";

export const upsertNmReports = internalMutation({
  args: { shopId: v.id("shops"), reports: v.array(v.any()) },
  handler: async (ctx, { shopId, reports }) => {
    for (const r of reports) {
      const nmId = r.nmID ?? r.nmId ?? 0;
      const existing = await ctx.db
        .query("nmReports")
        .withIndex("by_shop_nm", (q) => q.eq("shopId", shopId).eq("nmId", nmId))
        .first();
      const conversions = r.statistics?.selectedPeriod?.conversions ?? r.conversions ?? {};
      const stats = r.statistics?.selectedPeriod ?? r;
      const row = {
        shopId,
        nmId: Number(nmId) || 0,
        openCardCount: Number(stats.openCardCount) || 0,
        addToCartCount: Number(stats.addToCartCount) || 0,
        ordersCount: Number(stats.ordersCount) || 0,
        buyoutsCount: Number(stats.buyoutsCount) || 0,
        convOpenToCart: Number(conversions.addToCartPercent) || 0,
        convCartToOrder: Number(conversions.cartToOrderPercent) || 0,
        periodStart: r.periodStart ?? r.period?.begin ?? "",
        periodEnd: r.periodEnd ?? r.period?.end ?? "",
        updatedAt: Date.now(),
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("nmReports", row);
      }
    }
  },
});

export const syncAnalytics = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers: Record<string, string> = {
      Authorization: apiKey,
      "Content-Type": "application/json",
    };
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    try {
      let page = 1;
      let totalCount = 0;
      while (true) {
        const body = {
          nmIds: [],
          brandNames: [],
          subjectIds: [],
          tagIds: [],
          selectedPeriod: { start: thirtyDaysAgo, end: today },
          page,
        };
        const res = await fetchWithRetry(
          `https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          },
        );
        await assertOk(res);
        const data = await res.json();
        // v3 API returns data.products (not data.cards)
        const products = data.data?.products ?? data.data?.cards ?? [];
        if (!Array.isArray(products) || products.length === 0) break;
        totalCount += products.length;
        // Map v3 response: each item has product.nmId and statistic.selected
        const mapped = products.map((p: any) => {
          const stat = p.statistic?.selected ?? p.statistics?.selectedPeriod ?? p;
          const conv = stat.conversions ?? {};
          const period = stat.period ?? {};
          return {
            nmID: p.product?.nmId ?? p.nmID ?? p.nmId,
            statistics: {
              selectedPeriod: {
                openCardCount: stat.openCount ?? stat.openCardCount ?? 0,
                addToCartCount: stat.cartCount ?? stat.addToCartCount ?? 0,
                ordersCount: stat.orderCount ?? stat.ordersCount ?? 0,
                buyoutsCount: stat.buyoutCount ?? stat.buyoutsCount ?? 0,
                conversions: {
                  addToCartPercent: conv.addToCartPercent ?? 0,
                  cartToOrderPercent: conv.cartToOrderPercent ?? 0,
                },
              },
            },
            periodStart: period.start ?? thirtyDaysAgo,
            periodEnd: period.end ?? today,
          };
        });
        const batches = chunk(mapped, BATCH_SIZE);
        for (const batch of batches) {
          await ctx.runMutation(internal.sync.syncAnalytics.upsertNmReports, { shopId, reports: batch });
        }
        const isLastPage = data.data?.isNextPage === false || products.length < 20;
        if (isLastPage) break;
        page++;
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "analytics", status: "ok" as const, count: totalCount,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "analytics", status: "error" as const, error: e.message,
      });
    }
  },
});
