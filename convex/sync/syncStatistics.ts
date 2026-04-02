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
      const totalPrice = Number(o.totalPrice) || 0;
      const discountPercent = Number(o.discountPercent) || 0;
      const priceWithDisc = Number(o.priceWithDisc) || (totalPrice * (1 - discountPercent / 100));
      const row = {
        shopId,
        date: o.date?.slice(0, 10) ?? "",
        nmId: Number(o.nmId) || 0,
        supplierArticle: String(o.supplierArticle ?? ""),
        quantity: Number(o.quantity) || 0,
        totalPrice,
        priceWithDisc,
        discountPercent,
        warehouseName: String(o.warehouseName ?? ""),
        status: String(o.status ?? ""),
        orderId: srid,
        isCancel: !!o.isCancel,
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
        nmId: Number(s.nmId) || 0,
        supplierArticle: String(s.supplierArticle ?? ""),
        quantity: Number(s.quantity) || 0,
        priceWithDisc: Number(s.priceWithDisc) || 0,
        forPay: Number(s.forPay) || 0,
        finishedPrice: Number(s.finishedPrice) || 0,
        saleID: String(s.saleID ?? ""),
        isReturn: !!(s.isReturn ?? s.saleID?.startsWith("R")),
        warehouseName: String(s.warehouseName ?? ""),
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
        warehouseName: String(s.warehouseName ?? ""),
        nmId: Number(s.nmId) || 0,
        supplierArticle: String(s.supplierArticle ?? ""),
        subject: String(s.subject ?? ""),
        quantity: Number(s.quantity) || 0,
        updatedAt: Date.now(),
      });
    }
  },
});

export const upsertFinancials = internalMutation({
  args: { shopId: v.id("shops"), rows: v.array(v.any()) },
  handler: async (ctx, { shopId, rows }) => {
    for (const r of rows) {
      const rrdId = Number(r.rrd_id) || 0;
      const row = {
        shopId,
        rrdId,
        realizationreportId: Number(r.realizationreport_id) || 0,
        dateFrom: r.date_from?.slice(0, 10) ?? "",
        dateTo: r.date_to?.slice(0, 10) ?? "",
        supplierArticle: String(r.supplierArticle ?? r.sa_name ?? ""),
        nmId: Number(r.nm_id) || 0,
        subject: String(r.subject_name ?? ""),
        retailAmount: Number(r.retail_amount) || 0,
        returnAmount: Number(r.return_amount) || 0,
        deliveryAmount: Number(r.delivery_amount) || 0,
        stornoDeliveryAmount: Number(r.storno_delivery_amount) || 0,
        ppvzForPay: Number(r.ppvz_for_pay) || 0,
        ppvzSalesTotal: r.ppvz_sales_total != null ? Number(r.ppvz_sales_total) : undefined,
        acceptance: r.acceptance != null ? Number(r.acceptance) : undefined,
        penalty: Number(r.penalty) || 0,
        additionalPayment: Number(r.additional_payment) || 0,
        storageAmount: Number(r.storage_amount ?? r.storage_fee) || 0,
        deductionAmount: Number(r.deduction) || 0,
        siteCountry: String(r.site_country ?? ""),
        warehouseName: String(r.office_name ?? ""),
        realizationreportDate: r.create_dt?.slice(0, 10) ?? "",
        docTypeName: String(r.doc_type_name ?? ""),
      };
      const existing = await ctx.db
        .query("financials")
        .withIndex("by_shop_rrd", (q) =>
          q.eq("shopId", shopId).eq("rrdId", rrdId)
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

// ---- Отдельные actions для каждого эндпоинта ----
// Statistics API: 1 req/min, burst 1 — каждый action делает ровно 1 запрос

export const syncOrders = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers: Record<string, string> = { Authorization: apiKey };
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
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
  },
});

export const syncSales = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers: Record<string, string> = { Authorization: apiKey };
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
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
  },
});

export const syncStocks = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers: Record<string, string> = { Authorization: apiKey };
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
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
  },
});

export const syncFinancials = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers: Record<string, string> = { Authorization: apiKey };
    const today = new Date().toISOString().slice(0, 10);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    try {
      let rrdid = 0;
      let totalCount = 0;
      let pageNum = 0;
      while (true) {
        // Statistics API: 1 req/min — пауза перед каждой страницей кроме первой
        if (pageNum > 0) await new Promise((r) => setTimeout(r, 61000));
        pageNum++;
        const res = await fetchWithRetry(
          `https://statistics-api.wildberries.ru/api/v5/supplier/reportDetailByPeriod?dateFrom=${ninetyDaysAgo}&dateTo=${today}&limit=1000&rrdid=${rrdid}`,
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

// Сохраняем старый syncStatistics для обратной совместимости с sync.ts
export const syncStatistics = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (_ctx, { shopId: _shopId, apiKey: _apiKey }) => {
    // Больше не используется — категории вызываются отдельно из кронов
    // Оставлен чтобы не ломать импорты в sync.ts
  },
});
