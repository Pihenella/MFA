// Pre-resolved string refs обходят TS2589 (deep `internal` type instantiation
// после расширения api/internal в MFA-A.1).

import type { FunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";

type SyncArgs = { shopId: Id<"shops">; apiKey: string };
type SyncAction = FunctionReference<"action", "internal", SyncArgs>;

export const syncStatisticsRef = "sync/syncStatistics:syncStatistics" as unknown as SyncAction;
export const syncPromotionRef = "sync/syncPromotion:syncPromotion" as unknown as SyncAction;
export const syncContentRef = "sync/syncContent:syncContent" as unknown as SyncAction;
export const syncAnalyticsRef = "sync/syncAnalytics:syncAnalytics" as unknown as SyncAction;
export const syncFeedbacksRef = "sync/syncFeedbacks:syncFeedbacks" as unknown as SyncAction;
export const syncPricesRef = "sync/syncPrices:syncPrices" as unknown as SyncAction;
export const syncReturnsRef = "sync/syncReturns:syncReturns" as unknown as SyncAction;
export const syncTariffsRef = "sync/syncTariffs:syncTariffs" as unknown as SyncAction;

// shops:listInternal — для action которому нужен список shop'ов
export const shopsListInternalRef =
  "shops:listInternal" as unknown as FunctionReference<
    "query",
    "internal",
    Record<string, never>,
    Array<{
      _id: Id<"shops">;
      apiKey: string;
      name: string;
      isActive: boolean;
      enabledCategories?: string[];
    }>
  >;

// shops:updateLastSync
export const shopsUpdateLastSyncRef =
  "shops:updateLastSync" as unknown as FunctionReference<
    "mutation",
    "internal",
    { id: Id<"shops"> }
  >;

// sync:syncShop — orchestrator
export const syncShopRef = "sync:syncShop" as unknown as FunctionReference<
  "action",
  "internal",
  { shopId: Id<"shops">; apiKey: string; enabledCategories?: string[] }
>;

// sync.syncAnalytics.fetchAnalyticsForRange
export const fetchAnalyticsForRangeRef =
  "sync/syncAnalytics:fetchAnalyticsForRange" as unknown as FunctionReference<
    "action",
    "internal",
    {
      shopId: Id<"shops">;
      apiKey: string;
      dateFrom: string;
      dateTo: string;
    }
  >;

// lib/authActions:verifyShopAccess — auth check для action-ов
export const verifyShopAccessRef =
  "lib/authActions:verifyShopAccess" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops"> },
    { ok: true }
  >;

// sync/syncAnalytics:upsertNmReports
export const upsertNmReportsRef =
  "sync/syncAnalytics:upsertNmReports" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; reports: unknown[] }
  >;

// sync/helpers:logSync
export const logSyncRef =
  "sync/helpers:logSync" as unknown as FunctionReference<
    "mutation",
    "internal",
    {
      shopId: Id<"shops">;
      endpoint: string;
      status: "ok" | "error" | "skipped";
      error?: string;
      count?: number;
    }
  >;

// sync/helpers:rate-limit guard
export const getWbRateLimitGuardRef =
  "sync/helpers:getWbRateLimitGuard" as unknown as FunctionReference<
    "query",
    "internal",
    { shopId: Id<"shops">; endpoint: string },
    { blockedUntil: number; retryAfterSeconds: number } | null
  >;
export const recordWbRateLimitGuardRef =
  "sync/helpers:recordWbRateLimitGuard" as unknown as FunctionReference<
    "mutation",
    "internal",
    {
      shopId: Id<"shops">;
      endpoint: string;
      blockedUntil: number;
      retryAfterSeconds: number;
      statusCode?: number;
      error?: string;
    }
  >;
export const clearWbRateLimitGuardRef =
  "sync/helpers:clearWbRateLimitGuard" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; endpoint: string }
  >;

// sync/syncContent:upsertProductCards
export const upsertProductCardsRef =
  "sync/syncContent:upsertProductCards" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; cards: unknown[] }
  >;

// sync/syncFeedbacks:upsertFeedbacks
export const upsertFeedbacksRef =
  "sync/syncFeedbacks:upsertFeedbacks" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; feedbacks: unknown[] }
  >;
// sync/syncFeedbacks:upsertQuestions
export const upsertQuestionsRef =
  "sync/syncFeedbacks:upsertQuestions" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; questions: unknown[] }
  >;

// sync/syncPromotion:upsertCampaigns
export const upsertCampaignsRef =
  "sync/syncPromotion:upsertCampaigns" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; campaigns: unknown[] }
  >;

// sync/syncPrices:upsertPrices
export const upsertPricesRef =
  "sync/syncPrices:upsertPrices" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; prices: unknown[] }
  >;

// sync/syncStatistics:* mutations
export const upsertOrdersRef =
  "sync/syncStatistics:upsertOrders" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; orders: unknown[] }
  >;
export const upsertSalesRef =
  "sync/syncStatistics:upsertSales" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; sales: unknown[] }
  >;
export const clearStocksRef =
  "sync/syncStatistics:clearStocks" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops"> }
  >;
export const insertStocksRef =
  "sync/syncStatistics:insertStocks" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; stocks: unknown[] }
  >;
export const upsertFinancialsRef =
  "sync/syncStatistics:upsertFinancials" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; rows: unknown[] }
  >;

// sync/syncTariffs:upsertTariffs
export const upsertTariffsRef =
  "sync/syncTariffs:upsertTariffs" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; tariffs: unknown[] }
  >;

// sync/syncReturns:upsertReturns
export const upsertReturnsRef =
  "sync/syncReturns:upsertReturns" as unknown as FunctionReference<
    "mutation",
    "internal",
    { shopId: Id<"shops">; returns: unknown[] }
  >;

// sync/syncStatistics:* actions (sub-functions)
type SyncStepArgs = { shopId: Id<"shops">; apiKey: string };
type SyncStepAction = FunctionReference<"action", "internal", SyncStepArgs>;
export const syncOrdersRef = "sync/syncStatistics:syncOrders" as unknown as SyncStepAction;
export const syncSalesRef = "sync/syncStatistics:syncSales" as unknown as SyncStepAction;
export const syncStocksRef = "sync/syncStatistics:syncStocks" as unknown as SyncStepAction;
export const syncFinancialsRef = "sync/syncStatistics:syncFinancials" as unknown as SyncStepAction;
