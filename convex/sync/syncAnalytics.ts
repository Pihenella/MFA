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
        const cards = data.data?.cards ?? data.cards ?? [];
        if (!Array.isArray(cards) || cards.length === 0) break;
        totalCount += cards.length;
        // Map v3 field names to our schema
        const mapped = cards.map((c: any) => ({
          nmID: c.nmID ?? c.nmId,
          statistics: {
            selectedPeriod: {
              openCardCount: c.openCardCount ?? 0,
              addToCartCount: c.addToCartCount ?? 0,
              ordersCount: c.ordersCount ?? 0,
              buyoutsCount: c.buyoutsCount ?? 0,
              conversions: {
                addToCartPercent: c.addToCartConversion ?? 0,
                cartToOrderPercent: c.cartToOrderConversion ?? 0,
              },
            },
          },
          periodStart: thirtyDaysAgo,
          periodEnd: today,
        }));
        const batches = chunk(mapped, BATCH_SIZE);
        for (const batch of batches) {
          await ctx.runMutation(internal.sync.syncAnalytics.upsertNmReports, { shopId, reports: batch });
        }
        const isLastPage = data.data?.isNextPage === false || cards.length < 20;
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
