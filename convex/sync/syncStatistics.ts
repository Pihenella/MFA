import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { chunk, BATCH_SIZE, fetchWithRetry, assertOk } from "./helpers";

// ---- Upsert mutations ----

export const upsertOrders = internalMutation({
  args: { shopId: v.id("shops"), orders: v.array(v.any()) },
  handler: async (ctx, { shopId, orders }) => {
    for (const o of orders) {
      const srid = String(o.srid ?? "");
      const existing = await ctx.db
        .query("orders")
        .withIndex("by_order_id", (q) => q.eq("orderId", srid))
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
        orderId: srid,
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

export const clearStocks = internalMutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const existing = await ctx.db
      .query("stocks")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);
  },
});

export const insertStocks = internalMutation({
  args: { shopId: v.id("shops"), stocks: v.array(v.any()) },
  handler: async (ctx, { shopId, stocks }) => {
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

// ---- Sync action ----

export const syncStatistics = internalAction({
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
        await ctx.runMutation(internal.sync.syncStatistics.upsertOrders, { shopId, orders: batch });
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "orders", status: "ok" as const, count: data.length ?? 0,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
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
        await ctx.runMutation(internal.sync.syncStatistics.upsertSales, { shopId, sales: batch });
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "sales", status: "ok" as const, count: data.length ?? 0,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
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
      await ctx.runMutation(internal.sync.syncStatistics.clearStocks, { shopId });
      const batches = chunk(Array.isArray(data) ? data : [], BATCH_SIZE);
      for (const batch of batches) {
        await ctx.runMutation(internal.sync.syncStatistics.insertStocks, { shopId, stocks: batch });
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "stocks", status: "ok" as const, count: data.length ?? 0,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "stocks", status: "error" as const, error: e.message,
      });
    }

    // 4. Financial reports (paginated)
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
          await ctx.runMutation(internal.sync.syncStatistics.upsertFinancials, { shopId, rows: batch });
        }
        rrdid = data[data.length - 1].rrd_id;
        if (data.length < 1000) break;
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "financials", status: "ok" as const, count: totalCount,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "financials", status: "error" as const, error: e.message,
      });
    }
  },
});
