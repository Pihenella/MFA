import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Convex Auth: authSessions, authAccounts, authVerificationCodes,
  // authRefreshTokens, authVerifiers (users — переопределяем ниже).
  ...authTables,

  // Расширенный users — сохраняем поля Convex Auth + наши бизнес-поля.
  users: defineTable({
    // Поля от Convex Auth (все optional, как в authTables.users):
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Наши поля:
    businessName: v.optional(v.string()),
    shopsCountWB: v.optional(v.number()),
    shopsCountOzon: v.optional(v.number()),
    skuCount: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
    isSystemAdmin: v.optional(v.boolean()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    // emailVerifiedAt — наш custom email-verification (Convex Auth uses
    // emailVerificationTime для своего flow). Мы используем свой.
    emailVerifiedAt: v.optional(v.number()),
    // A.4 redesign: theme + tavern mode + monthly profit goal
    themePreference: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    tavernMode: v.optional(v.boolean()),
    monthlyProfitGoal: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_status", ["status"]),

  userAchievements: defineTable({
    userId: v.id("users"),
    kind: v.union(
      v.literal("firstShop"),
      v.literal("firstThousandSales"),
      v.literal("monthlyPlanHit"),
      v.literal("firstMillionProfit"),
      v.literal("tenKSold"),
      v.literal("zeroReturnsWeek"),
      v.literal("firstReviewFiveStar"),
      v.literal("storeAnniversary")
    ),
    achievedAt: v.number(),
    payload: v.optional(v.any()),
    seenAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_kind", ["userId", "kind"])
    .index("by_user_unseen", ["userId", "seenAt"]),

  organizations: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  memberships: defineTable({
    userId: v.id("users"),
    orgId: v.id("organizations"),
    role: v.union(v.literal("owner"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgId"])
    .index("by_user_org", ["userId", "orgId"]),

  invites: defineTable({
    orgId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked")
    ),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_org", ["orgId"])
    .index("by_email_status", ["email", "status"]),

  emailSendLog: defineTable({
    email: v.string(),
    kind: v.union(
      v.literal("verify"),
      v.literal("reset"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("teamInvite"),
      v.literal("inviteAccepted")
    ),
    sentAt: v.number(),
  }).index("by_email_kind", ["email", "kind"]),

  loginAttempts: defineTable({
    email: v.string(),
    attemptedAt: v.number(),
    success: v.boolean(),
  }).index("by_email_time", ["email", "attemptedAt"]),

  verifyTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  resetTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  shops: defineTable({
    orgId: v.id("organizations"),
    marketplace: v.union(v.literal("wb"), v.literal("ozon")),
    name: v.string(),
    apiKey: v.string(),
    ozonClientId: v.optional(v.string()),
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    enabledCategories: v.optional(v.array(v.string())),
  })
    .index("by_org", ["orgId"])
    .index("by_org_marketplace", ["orgId", "marketplace"]),

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
    .index("by_order_id", ["orderId"])
    .index("by_shop_order", ["shopId", "orderId"]),

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
    .index("by_sale_id", ["saleID"])
    .index("by_shop_sale", ["shopId", "saleID"]),

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
    rrdId: v.optional(v.number()),
    realizationreportId: v.number(),
    dateFrom: v.string(),
    dateTo: v.string(),
    rrDt: v.optional(v.string()),    // Дата операции (rr_dt из WB API) — для точной фильтрации по дате
    saleDt: v.optional(v.string()),  // Дата продажи (sale_dt из WB API)
    supplierArticle: v.string(),
    nmId: v.number(),
    subject: v.string(),
    retailAmount: v.number(),
    retailPrice: v.optional(v.number()),
    returnAmount: v.number(),
    deliveryAmount: v.number(),
    deliveryRub: v.optional(v.number()),
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
    supplierOperName: v.optional(v.string()),
    bonusTypeName: v.optional(v.string()),
  }).index("by_shop", ["shopId"])
    .index("by_shop_report", ["shopId", "realizationreportId"])
    .index("by_shop_date", ["shopId", "dateFrom"])
    .index("by_shop_rrd", ["shopId", "rrdId"])
    .index("by_shop_rrdt", ["shopId", "rrDt"]),

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
    .index("by_campaign_id", ["campaignId"])
    .index("by_shop_campaign", ["shopId", "campaignId"]),

  syncLog: defineTable({
    shopId: v.id("shops"),
    syncedAt: v.number(),
    endpoint: v.string(),
    status: v.union(v.literal("ok"), v.literal("error"), v.literal("skipped")),
    error: v.optional(v.string()),
    count: v.optional(v.number()),
  }).index("by_shop", ["shopId"])
    .index("by_synced_at", ["syncedAt"]),

  wbRateLimitGuards: defineTable({
    shopId: v.id("shops"),
    endpoint: v.string(),
    blockedUntil: v.number(),
    retryAfterSeconds: v.number(),
    statusCode: v.optional(v.number()),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_shop_endpoint", ["shopId", "endpoint"])
    .index("by_blocked_until", ["blockedUntil"]),

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
    .index("by_feedback_id", ["feedbackId"])
    .index("by_shop_feedback", ["shopId", "feedbackId"]),

  questions: defineTable({
    shopId: v.id("shops"),
    questionId: v.string(),
    nmId: v.number(),
    text: v.string(),
    answer: v.optional(v.string()),
    createdDate: v.string(),
    isAnswered: v.boolean(),
  }).index("by_shop", ["shopId"])
    .index("by_question_id", ["questionId"])
    .index("by_shop_question", ["shopId", "questionId"]),

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
    .index("by_return_id", ["returnId"])
    .index("by_shop_return", ["shopId", "returnId"]),

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
    .index("by_shop_nm_date", ["shopId", "nmId", "periodStart"])
    .index("by_shop_period", ["shopId", "periodStart"]),
});
