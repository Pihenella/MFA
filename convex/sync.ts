import { internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ---- Helpers ----

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const BATCH_SIZE = 50;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 1,
): Promise<Response> {
  const res = await fetch(url, options);
  if ((res.status === 429 || res.status >= 500) && retries > 0) {
    await new Promise((r) => setTimeout(r, 1000));
    return fetchWithRetry(url, options, retries - 1);
  }
  return res;
}

async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
}

// ---- Upsert mutations (called by action) ----

export const upsertOrders = internalMutation({
  args: { shopId: v.id("shops"), orders: v.array(v.any()) },
  handler: async (ctx, { shopId, orders }) => {
    for (const o of orders) {
      const existing = await ctx.db
        .query("orders")
        .withIndex("by_order_id", (q) => q.eq("orderId", String(o.orderId)))
        .first();
      const row = {
        shopId,
        date: o.date?.slice(0, 10) ?? "",
        nmId: o.nmId ?? 0,
        supplierArticle: o.supplierArticle ?? "",
        quantity: o.quantity ?? 0,
        totalPrice: o.totalPrice ?? 0,
        discountPercent: o.discountPercent ?? 0,
        warehouseName: o.warehouseName ?? "",
        status: o.status ?? "",
        orderId: String(o.orderId ?? ""),
        isCancel: o.isCancel ?? false,
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("orders", row);
      }
    }
  },
});

export const upsertSales = internalMutation({
  args: { shopId: v.id("shops"), sales: v.array(v.any()) },
  handler: async (ctx, { shopId, sales }) => {
    for (const s of sales) {
      const existing = await ctx.db
        .query("sales")
        .withIndex("by_sale_id", (q) => q.eq("saleID", String(s.saleID)))
        .first();
      const row = {
        shopId,
        date: s.date?.slice(0, 10) ?? "",
        nmId: s.nmId ?? 0,
        supplierArticle: s.supplierArticle ?? "",
        quantity: s.quantity ?? 0,
        priceWithDisc: s.priceWithDisc ?? 0,
        forPay: s.forPay ?? 0,
        finishedPrice: s.finishedPrice ?? 0,
        saleID: String(s.saleID ?? ""),
        isReturn: s.isReturn ?? s.saleID?.startsWith("R") ?? false,
        warehouseName: s.warehouseName ?? "",
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("sales", row);
      }
    }
  },
});

export const upsertStocks = internalMutation({
  args: { shopId: v.id("shops"), stocks: v.array(v.any()) },
  handler: async (ctx, { shopId, stocks }) => {
    // Clear existing stocks for shop, re-insert fresh
    const existing = await ctx.db
      .query("stocks")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);
    for (const s of stocks) {
      await ctx.db.insert("stocks", {
        shopId,
        warehouseName: s.warehouseName ?? "",
        nmId: s.nmId ?? 0,
        supplierArticle: s.supplierArticle ?? "",
        subject: s.subject ?? "",
        quantity: s.quantity ?? 0,
        updatedAt: Date.now(),
      });
    }
  },
});

export const upsertFinancials = internalMutation({
  args: { shopId: v.id("shops"), rows: v.array(v.any()) },
  handler: async (ctx, { shopId, rows }) => {
    for (const r of rows) {
      const row = {
        shopId,
        realizationreportId: r.realizationreport_id ?? 0,
        dateFrom: r.date_from?.slice(0, 10) ?? "",
        dateTo: r.date_to?.slice(0, 10) ?? "",
        supplierArticle: r.supplierArticle ?? r.sa_name ?? "",
        nmId: r.nm_id ?? 0,
        subject: r.subject_name ?? "",
        retailAmount: r.retail_amount ?? 0,
        returnAmount: r.return_amount ?? 0,
        deliveryAmount: r.delivery_amount ?? 0,
        stornoDeliveryAmount: r.storno_delivery_amount ?? 0,
        ppvzForPay: r.ppvz_for_pay ?? 0,
        penalty: r.penalty ?? 0,
        additionalPayment: r.additional_payment ?? 0,
        storageAmount: r.storage_amount ?? r.storage_fee ?? 0,
        deductionAmount: r.deduction ?? 0,
        siteCountry: r.site_country ?? "",
        warehouseName: r.office_name ?? "",
        realizationreportDate: r.create_dt?.slice(0, 10) ?? "",
        docTypeName: r.doc_type_name ?? "",
      };
      // Dedup by realizationreportId + nmId + docTypeName
      const existing = await ctx.db
        .query("financials")
        .withIndex("by_shop_report", (q) =>
          q.eq("shopId", shopId).eq("realizationreportId", row.realizationreportId)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("nmId"), row.nmId),
            q.eq(q.field("docTypeName"), row.docTypeName),
            q.eq(q.field("supplierArticle"), row.supplierArticle)
          )
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("financials", row);
      }
    }
  },
});

export const upsertCampaigns = internalMutation({
  args: { shopId: v.id("shops"), campaigns: v.array(v.any()) },
  handler: async (ctx, { shopId, campaigns }) => {
    for (const c of campaigns) {
      const existing = await ctx.db
        .query("campaigns")
        .withIndex("by_campaign_id", (q) => q.eq("campaignId", c.campaignId))
        .first();
      const row = {
        shopId,
        campaignId: c.campaignId,
        name: c.name ?? "",
        budget: c.budget ?? 0,
        spent: c.spent ?? 0,
        impressions: c.impressions ?? 0,
        clicks: c.clicks ?? 0,
        updatedAt: Date.now(),
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("campaigns", row);
      }
    }
  },
});

export const logSync = internalMutation({
  args: {
    shopId: v.id("shops"),
    endpoint: v.string(),
    status: v.union(v.literal("ok"), v.literal("error")),
    error: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("syncLog", {
      shopId: args.shopId,
      endpoint: args.endpoint,
      status: args.status,
      error: args.error,
      syncedAt: Date.now(),
    });
  },
});

// ---- WB API fetch action ----

export const syncShop = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers: Record<string, string> = { Authorization: apiKey };
    const today = new Date().toISOString().slice(0, 10);
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    // 1. Orders
    try {
      const res = await fetchWithRetry(
        `https://statistics-api.wildberries.ru/api/v1/supplier/orders?dateFrom=${fiveDaysAgo}T00:00:00`,
        { headers },
      );
      await assertOk(res);
      const data = await res.json();
      const batches = chunk(Array.isArray(data) ? data : [], BATCH_SIZE);
      for (const batch of batches) {
        await ctx.runMutation(internal.sync.upsertOrders, { shopId, orders: batch });
      }
      await ctx.runMutation(internal.sync.logSync, {
        shopId, endpoint: "orders", status: "ok" as const, count: data.length ?? 0,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.logSync, {
        shopId, endpoint: "orders", status: "error" as const, error: e.message,
      });
    }

    // 2. Sales
    try {
      const res = await fetchWithRetry(
        `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${fiveDaysAgo}T00:00:00`,
        { headers },
      );
      await assertOk(res);
      const data = await res.json();
      const batches = chunk(Array.isArray(data) ? data : [], BATCH_SIZE);
      for (const batch of batches) {
        await ctx.runMutation(internal.sync.upsertSales, { shopId, sales: batch });
      }
      await ctx.runMutation(internal.sync.logSync, {
        shopId, endpoint: "sales", status: "ok" as const, count: data.length ?? 0,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.logSync, {
        shopId, endpoint: "sales", status: "error" as const, error: e.message,
      });
    }

    // 3. Stocks
    try {
      const res = await fetchWithRetry(
        `https://statistics-api.wildberries.ru/api/v1/supplier/stocks?dateFrom=${fiveDaysAgo}T00:00:00`,
        { headers },
      );
      await assertOk(res);
      const data = await res.json();
      const batches = chunk(Array.isArray(data) ? data : [], BATCH_SIZE);
      for (const batch of batches) {
        await ctx.runMutation(internal.sync.upsertStocks, { shopId, stocks: batch });
      }
      await ctx.runMutation(internal.sync.logSync, {
        shopId, endpoint: "stocks", status: "ok" as const, count: data.length ?? 0,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.logSync, {
        shopId, endpoint: "stocks", status: "error" as const, error: e.message,
      });
    }

    // 4. Financial reports (paginated via rrdid)
    try {
      let rrdid = 0;
      let totalCount = 0;
      while (true) {
        const res = await fetchWithRetry(
          `https://statistics-api.wildberries.ru/api/v5/supplier/reportDetailByPeriod?dateFrom=${thirtyDaysAgo}&dateTo=${today}&limit=1000&rrdid=${rrdid}`,
          { headers },
        );
        await assertOk(res);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        totalCount += data.length;
        const batches = chunk(data, BATCH_SIZE);
        for (const batch of batches) {
          await ctx.runMutation(internal.sync.upsertFinancials, { shopId, rows: batch });
        }
        rrdid = data[data.length - 1].rrd_id;
        if (data.length < 1000) break;
      }
      await ctx.runMutation(internal.sync.logSync, {
        shopId, endpoint: "financials", status: "ok" as const, count: totalCount,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.logSync, {
        shopId, endpoint: "financials", status: "error" as const, error: e.message,
      });
    }

    // 5. Advertising campaigns
    try {
      // Fetch campaign list (active=7, paused=9, completed=11)
      const listRes = await fetchWithRetry(
        `https://advert-api.wildberries.ru/adv/v1/promotion/adverts?status=7&status=9&status=11`,
        { headers },
      );
      await assertOk(listRes);
      const adverts: any[] = await listRes.json();
      if (Array.isArray(adverts) && adverts.length > 0) {
        const campaignIds = adverts.map((a: any) => a.advertId);
        // Fetch full stats in batches of 100 (API limit)
        const allCampaigns: any[] = [];
        const idBatches = chunk(campaignIds, 100);
        for (const idBatch of idBatches) {
          const statsRes = await fetchWithRetry(
            `https://advert-api.wildberries.ru/adv/v2/fullstats`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify(idBatch),
            },
          );
          if (!statsRes.ok) continue;
          const statsData: any[] = await statsRes.json();
          if (!Array.isArray(statsData)) continue;
          for (const stat of statsData) {
            const advert = adverts.find((a: any) => a.advertId === stat.advertId);
            // Sum stats across all days/apps/platforms
            let impressions = 0;
            let clicks = 0;
            let spent = 0;
            if (Array.isArray(stat.days)) {
              for (const day of stat.days) {
                if (Array.isArray(day.apps)) {
                  for (const app of day.apps) {
                    if (Array.isArray(app.nm)) {
                      for (const nm of app.nm) {
                        impressions += nm.views ?? 0;
                        clicks += nm.clicks ?? 0;
                        spent += nm.sum ?? 0;
                      }
                    }
                  }
                }
              }
            }
            allCampaigns.push({
              campaignId: stat.advertId,
              name: advert?.name ?? advert?.changeTime ?? `Campaign ${stat.advertId}`,
              budget: advert?.dailyBudget ?? 0,
              spent,
              impressions,
              clicks,
            });
          }
        }
        const campaignBatches = chunk(allCampaigns, BATCH_SIZE);
        for (const batch of campaignBatches) {
          await ctx.runMutation(internal.sync.upsertCampaigns, { shopId, campaigns: batch });
        }
        await ctx.runMutation(internal.sync.logSync, {
          shopId, endpoint: "campaigns", status: "ok" as const, count: allCampaigns.length,
        });
      } else {
        await ctx.runMutation(internal.sync.logSync, {
          shopId, endpoint: "campaigns", status: "ok" as const, count: 0,
        });
      }
    } catch (e: any) {
      await ctx.runMutation(internal.sync.logSync, {
        shopId, endpoint: "campaigns", status: "error" as const, error: e.message,
      });
    }

    // Update lastSyncAt
    await ctx.runMutation(internal.shops.updateLastSync, { id: shopId });
  },
});
