import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shops: defineTable({
    name: v.string(),
    apiKey: v.string(),
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
  }),

  orders: defineTable({
    shopId: v.id("shops"),
    date: v.string(),
    nmId: v.number(),
    supplierArticle: v.string(),
    quantity: v.number(),
    totalPrice: v.number(),
    discountPercent: v.number(),
    warehouseName: v.string(),
    status: v.string(),
    orderId: v.string(),
    isCancel: v.boolean(),
  }).index("by_shop_date", ["shopId", "date"])
    .index("by_order_id", ["orderId"]),

  sales: defineTable({
    shopId: v.id("shops"),
    date: v.string(),
    nmId: v.number(),
    supplierArticle: v.string(),
    quantity: v.number(),
    priceWithDisc: v.number(),
    forPay: v.number(),
    finishedPrice: v.number(),
    saleID: v.string(),
    isReturn: v.boolean(),
    warehouseName: v.string(),
  }).index("by_shop_date", ["shopId", "date"])
    .index("by_sale_id", ["saleID"]),

  stocks: defineTable({
    shopId: v.id("shops"),
    warehouseName: v.string(),
    nmId: v.number(),
    supplierArticle: v.string(),
    subject: v.string(),
    quantity: v.number(),
    updatedAt: v.number(),
  }).index("by_shop", ["shopId"])
    .index("by_shop_nm", ["shopId", "nmId"]),

  financials: defineTable({
    shopId: v.id("shops"),
    realizationreportId: v.number(),
    dateFrom: v.string(),
    dateTo: v.string(),
    supplierArticle: v.string(),
    nmId: v.number(),
    subject: v.string(),
    retailAmount: v.number(),
    returnAmount: v.number(),
    deliveryAmount: v.number(),
    stornoDeliveryAmount: v.number(),
    ppvzForPay: v.number(),
    penalty: v.number(),
    additionalPayment: v.number(),
    storageAmount: v.number(),
    deductionAmount: v.number(),
    siteCountry: v.string(),
    warehouseName: v.string(),
    realizationreportDate: v.string(),
    docTypeName: v.string(),
  }).index("by_shop", ["shopId"])
    .index("by_shop_report", ["shopId", "realizationreportId"])
    .index("by_shop_date", ["shopId", "dateFrom"]),

  costs: defineTable({
    shopId: v.id("shops"),
    nmId: v.number(),
    supplierArticle: v.string(),
    cost: v.number(),
    updatedAt: v.number(),
  }).index("by_shop", ["shopId"])
    .index("by_shop_nm", ["shopId", "nmId"]),

  campaigns: defineTable({
    shopId: v.id("shops"),
    campaignId: v.number(),
    name: v.string(),
    budget: v.number(),
    spent: v.number(),
    impressions: v.number(),
    clicks: v.number(),
    updatedAt: v.number(),
  }).index("by_shop", ["shopId"])
    .index("by_campaign_id", ["campaignId"]),

  syncLog: defineTable({
    shopId: v.id("shops"),
    syncedAt: v.number(),
    endpoint: v.string(),
    status: v.union(v.literal("ok"), v.literal("error")),
    error: v.optional(v.string()),
  }).index("by_shop", ["shopId"])
    .index("by_synced_at", ["syncedAt"]),
});
