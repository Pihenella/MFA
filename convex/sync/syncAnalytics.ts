import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { chunk, BATCH_SIZE } from "./helpers";

export const upsertNmReports = internalMutation({
  args: { shopId: v.id("shops"), reports: v.array(v.any()) },
  handler: async (ctx, { shopId, reports }) => {
    for (const r of reports) {
      const nmId = r.nmID ?? r.nmId ?? 0;
      const periodStart = r.periodStart ?? "";
      const periodEnd = r.periodEnd ?? "";
      // Ищем по (shopId, nmId, periodStart) — уникальная запись за период
      const existing = await ctx.db
        .query("nmReports")
        .withIndex("by_shop_nm_date", (q) =>
          q.eq("shopId", shopId).eq("nmId", Number(nmId) || 0).eq("periodStart", periodStart)
        )
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
        periodStart,
        periodEnd,
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

// Один запрос к WB Analytics API с простым retry (без fetchWithRetry)
async function fetchAnalyticsPage(
  headers: Record<string, string>,
  body: object,
  retries = 3,
): Promise<any> {
  const url = `https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 30_000));
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
      }
      return await res.json();
    } catch (e) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 20_000));
        continue;
      }
      throw e;
    }
  }
}

// Запросить аналитику по продуктам за указанный период (все страницы)
async function fetchAnalyticsForPeriod(
  headers: Record<string, string>,
  start: string,
  end: string,
): Promise<any[]> {
  const allProducts: any[] = [];
  let page = 1;
  while (true) {
    const body = {
      nmIds: [],
      brandNames: [],
      subjectIds: [],
      tagIds: [],
      selectedPeriod: { start, end },
      page,
    };
    const data = await fetchAnalyticsPage(headers, body);
    const products = data.data?.products ?? data.data?.cards ?? [];
    if (!Array.isArray(products) || products.length === 0) break;
    allProducts.push(...products);
    const isLastPage = data.data?.isNextPage === false || products.length < 20;
    if (isLastPage) break;
    page++;
    // Analytics API: 3 req/min + global limiter — ждём 30с между страницами
    await new Promise((r) => setTimeout(r, 30_000));
  }
  return allProducts;
}

function mapProducts(products: any[], start: string, end: string) {
  return products.map((p: any) => {
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
      periodStart: period.start ?? start,
      periodEnd: period.end ?? end,
    };
  });
}

// Основная синхронизация: один запрос за 30 дней
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
      const products = await fetchAnalyticsForPeriod(headers, thirtyDaysAgo, today);
      const mapped = mapProducts(products, thirtyDaysAgo, today);
      const batches = chunk(mapped, BATCH_SIZE);
      for (const batch of batches) {
        await ctx.runMutation(internal.sync.syncAnalytics.upsertNmReports, { shopId, reports: batch });
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "analytics", status: "ok" as const, count: mapped.length,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "analytics", status: "error" as const, error: e.message,
      });
    }
  },
});

// Запрос аналитики для конкретного периода (вызывается с фронтенда)
export const fetchAnalyticsForRange = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string(), dateFrom: v.string(), dateTo: v.string() },
  handler: async (ctx, { shopId, apiKey, dateFrom, dateTo }) => {
    const headers: Record<string, string> = {
      Authorization: apiKey,
      "Content-Type": "application/json",
    };

    const products = await fetchAnalyticsForPeriod(headers, dateFrom, dateTo);
    const mapped = mapProducts(products, dateFrom, dateTo);
    const batches = chunk(mapped, BATCH_SIZE);
    for (const batch of batches) {
      await ctx.runMutation(internal.sync.syncAnalytics.upsertNmReports, { shopId, reports: batch });
    }
    return mapped.length;
  },
});
