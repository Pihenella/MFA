import { internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

export const logSync = internalMutation({
  args: {
    shopId: v.id("shops"),
    endpoint: v.string(),
    status: v.union(v.literal("ok"), v.literal("error")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("syncLog", { ...args, syncedAt: Date.now() });
  },
});

// ---- WB API fetch action ----

export const syncShop = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers = { Authorization: apiKey };
    const today = new Date().toISOString().slice(0, 10);
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    // 1. Orders
    try {
      const res = await fetch(
        `https://statistics-api.wildberries.ru/api/v1/supplier/orders?dateFrom=${fiveDaysAgo}T00:00:00`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        await ctx.runMutation(internal.sync.upsertOrders, { shopId, orders: data });
        await ctx.runMutation(internal.sync.logSync, { shopId, endpoint: "orders", status: "ok" });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      await ctx.runMutation(internal.sync.logSync, { shopId, endpoint: "orders", status: "error", error: e.message });
    }

    // 2. Sales
    try {
      const res = await fetch(
        `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${fiveDaysAgo}T00:00:00`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        await ctx.runMutation(internal.sync.upsertSales, { shopId, sales: data });
        await ctx.runMutation(internal.sync.logSync, { shopId, endpoint: "sales", status: "ok" });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      await ctx.runMutation(internal.sync.logSync, { shopId, endpoint: "sales", status: "error", error: e.message });
    }

    // 3. Stocks
    try {
      const res = await fetch(
        `https://statistics-api.wildberries.ru/api/v1/supplier/stocks?dateFrom=${fiveDaysAgo}T00:00:00`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        await ctx.runMutation(internal.sync.upsertStocks, { shopId, stocks: data });
        await ctx.runMutation(internal.sync.logSync, { shopId, endpoint: "stocks", status: "ok" });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      await ctx.runMutation(internal.sync.logSync, { shopId, endpoint: "stocks", status: "error", error: e.message });
    }

    // 4. Financial reports
    try {
      const res = await fetch(
        `https://statistics-api.wildberries.ru/api/v5/supplier/reportDetailByPeriod?dateFrom=${thirtyDaysAgo}&dateTo=${today}&limit=100000`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          await ctx.runMutation(internal.sync.upsertFinancials, { shopId, rows: data });
        }
        await ctx.runMutation(internal.sync.logSync, { shopId, endpoint: "financials", status: "ok" });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      await ctx.runMutation(internal.sync.logSync, { shopId, endpoint: "financials", status: "error", error: e.message });
    }

    // Update lastSyncAt
    await ctx.runMutation(internal.shops.updateLastSync, { id: shopId });
  },
});
