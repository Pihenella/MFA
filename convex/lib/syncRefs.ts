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
    Array<{ _id: Id<"shops">; apiKey: string; name: string }>
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
