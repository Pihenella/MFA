import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shops: defineTable({
    name: v.string(),
    apiKey: v.string(),
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    enabledCategories: v.optional(v.array(v.string())),
  }),

  orders: defineTable({
    shopId: v.id("shops"),
    date: v.string(),
    nmId: v.number(),
    supplierArticle: v.string(),
    quantity: v.number(),
    totalPrice: v.number(),
    priceWithDisc: v.optional(v.number()),
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
    ppvzSalesTotal: v.optional(v.number()),
    acceptance: v.optional(v.number()),
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

  // --- New tables for extended WB API categories ---

  productCards: defineTable({
    shopId: v.id("shops"),
    nmId: v.number(),
    title: v.string(),
    brand: v.string(),
    vendorCode: v.string(),
    subjectName: v.string(),
    photos: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_shop", ["shopId"])
    .index("by_shop_nm", ["shopId", "nmId"]),

  feedbacks: defineTable({
    shopId: v.id("shops"),
    feedbackId: v.string(),
    nmId: v.number(),
    text: v.string(),
    productValuation: v.number(),
    answer: v.optional(v.string()),
    createdDate: v.string(),
    isAnswered: v.boolean(),
  }).index("by_shop", ["shopId"])
    .index("by_feedback_id", ["feedbackId"]),

  questions: defineTable({
    shopId: v.id("shops"),
    questionId: v.string(),
    nmId: v.number(),
    text: v.string(),
    answer: v.optional(v.string()),
    createdDate: v.string(),
    isAnswered: v.boolean(),
  }).index("by_shop", ["shopId"])
    .index("by_question_id", ["questionId"]),

  prices: defineTable({
    shopId: v.id("shops"),
    nmId: v.number(),
    supplierArticle: v.string(),
    price: v.number(),
    discount: v.number(),
    promoCode: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_shop", ["shopId"])
    .index("by_shop_nm", ["shopId", "nmId"]),

  returns: defineTable({
    shopId: v.id("shops"),
    returnId: v.string(),
    nmId: v.number(),
    orderId: v.string(),
    returnDate: v.string(),
    warehouseName: v.string(),
    status: v.string(),
  }).index("by_shop", ["shopId"])
    .index("by_return_id", ["returnId"]),

  tariffs: defineTable({
    shopId: v.id("shops"),
    warehouseName: v.string(),
    boxDeliveryBase: v.number(),
    boxDeliveryLiter: v.number(),
    boxStorageBase: v.number(),
    boxStorageLiter: v.number(),
    updatedAt: v.number(),
  }).index("by_shop", ["shopId"]),

  nmReports: defineTable({
    shopId: v.id("shops"),
    nmId: v.number(),
    openCardCount: v.number(),
    addToCartCount: v.number(),
    ordersCount: v.number(),
    buyoutsCount: v.number(),
    convOpenToCart: v.number(),
    convCartToOrder: v.number(),
    periodStart: v.string(),
    periodEnd: v.string(),
    updatedAt: v.number(),
  }).index("by_shop", ["shopId"])
    .index("by_shop_nm", ["shopId", "nmId"])
    .index("by_shop_nm_date", ["shopId", "nmId", "periodStart"]),
});
