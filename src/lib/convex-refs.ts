// Pre-resolved refs обходят TS2589 (deep useQuery/useMutation/useAction
// inference после расширения api в MFA-A.1).
//
// Все runtime references — действительные имена Convex-функций. Сигнатуры
// должны соответствовать args в convex/<module>.ts. Суффикс Ref избегает
// конфликта имён с локальными useMutation/useAction-биндингами.

import type { FunctionReference } from "convex/server";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type Q<Args extends Record<string, unknown>, R> = FunctionReference<
  "query",
  "public",
  Args,
  R
>;
type Mut<Args extends Record<string, unknown>, R = unknown> = FunctionReference<
  "mutation",
  "public",
  Args,
  R
>;
type Act<Args extends Record<string, unknown>, R = unknown> = FunctionReference<
  "action",
  "public",
  Args,
  R
>;

// ───────────────── shops
export const shopsListRef = "shops:list" as unknown as Q<
  Record<string, never>,
  Doc<"shops">[]
>;
export const shopsGetSyncLogRef = "shops:getSyncLog" as unknown as Q<
  { shopId?: Id<"shops"> },
  Doc<"syncLog">[]
>;
export const shopsAddRef = "shops:add" as unknown as Mut<
  {
    orgId: Id<"organizations">;
    marketplace: "wb" | "ozon";
    name: string;
    apiKey: string;
    ozonClientId?: string;
  },
  Id<"shops">
>;
export const shopsRemoveRef = "shops:remove" as unknown as Mut<{
  id: Id<"shops">;
}>;
export const shopsUpdateCategoriesRef =
  "shops:updateCategories" as unknown as Mut<{
    id: Id<"shops">;
    enabledCategories: string[];
  }>;

// ───────────────── dashboard
type DateArgs = { shopId?: Id<"shops">; dateFrom: string; dateTo: string };
export const getOrdersRef = "dashboard:getOrders" as unknown as Q<
  DateArgs,
  Doc<"orders">[]
>;
export const getSalesRef = "dashboard:getSales" as unknown as Q<
  DateArgs,
  Doc<"sales">[]
>;
export const getFinancialsRef = "dashboard:getFinancials" as unknown as Q<
  DateArgs & { byOperationDate?: boolean },
  Doc<"financials">[]
>;
export const getCostsRef = "dashboard:getCosts" as unknown as Q<
  { shopId?: Id<"shops"> },
  Doc<"costs">[]
>;
export const getCampaignsRef = "dashboard:getCampaigns" as unknown as Q<
  DateArgs,
  Doc<"campaigns">[]
>;
export const getNmReportsRef = "dashboard:getNmReports" as unknown as Q<
  DateArgs,
  Doc<"nmReports">[]
>;
export const getPricesRef = "dashboard:getPrices" as unknown as Q<
  { shopId?: Id<"shops"> },
  Doc<"prices">[]
>;
export const getReturnsRef = "dashboard:getReturns" as unknown as Q<
  DateArgs,
  Doc<"returns">[]
>;
export const getFeedbacksRef = "dashboard:getFeedbacks" as unknown as Q<
  {
    shopId?: Id<"shops">;
    isAnswered?: boolean;
    nmId?: number;
    dateFrom?: string;
    dateTo?: string;
  },
  Doc<"feedbacks">[]
>;
export const getQuestionsRef = "dashboard:getQuestions" as unknown as Q<
  {
    shopId?: Id<"shops">;
    isAnswered?: boolean;
    nmId?: number;
    dateFrom?: string;
    dateTo?: string;
  },
  Doc<"questions">[]
>;
export const getStocksRef = "dashboard:getStocks" as unknown as Q<
  { shopId: Id<"shops"> },
  Doc<"stocks">[]
>;
export const getProductCardsRef =
  "dashboard:getProductCards" as unknown as Q<
    { shopId: Id<"shops"> },
    Doc<"productCards">[]
  >;

// ───────────────── analytics
export const getSalesAnalyticsRef =
  "analytics:getSalesAnalytics" as unknown as Q<
    {
      shopId?: Id<"shops">;
      dateFrom: string;
      dateTo: string;
      groupBy:
        | "article"
        | "size"
        | "store"
        | "day"
        | "week"
        | "month"
        | "brand"
        | "subject"
        | "group";
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any[]
  >;

// ───────────────── costs
export const upsertCostRef = "costs:upsertCost" as unknown as Mut<{
  shopId: Id<"shops">;
  nmId: number;
  supplierArticle: string;
  cost: number;
}>;
export const upsertBulkRef = "costs:upsertBulk" as unknown as Mut<{
  shopId: Id<"shops">;
  items: Array<{ nmId: number; supplierArticle: string; cost: number }>;
}>;
export const costsListByShopRef = "costs:listByShop" as unknown as Q<
  { shopId: Id<"shops"> },
  Doc<"costs">[]
>;

// ───────────────── financials
export const getFinancialReportsRef = "financials:getReports" as unknown as Q<
  { shopId?: Id<"shops">; dateFrom: string; dateTo: string },
  Doc<"financials">[]
>;

// ───────────────── actions
export const fetchAnalyticsRef = "actions:fetchAnalytics" as unknown as Act<
  { shopId: Id<"shops">; dateFrom: string; dateTo: string },
  number
>;
export const triggerSyncRef = "actions:triggerSync" as unknown as Act<
  { shopId: Id<"shops">; categories?: string[] },
  unknown
>;
