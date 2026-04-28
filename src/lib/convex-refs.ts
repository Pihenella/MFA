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
export const shopsListMineRef = "shops:listMine" as unknown as Q<
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

// ───────────────── users
export type CurrentUser = {
  _id: Id<"users">;
  email: string;
  name: string;
  phone: string;
  businessName: string;
  shopsCountWB: number;
  shopsCountOzon: number;
  skuCount: number;
  status: "pending" | "approved" | "rejected";
  isSystemAdmin: boolean;
  emailVerifiedAt: number | null;
  rejectionReason: string | null;
  createdAt: number;
  themePreference: "light" | "dark" | "system";
  tavernMode: boolean;
  monthlyProfitGoal: number | null;
};

export const usersCurrentRef = "users:current" as unknown as Q<
  Record<string, never>,
  CurrentUser | null
>;
export const usersUpdateThemePreferenceRef =
  "users:updateThemePreference" as unknown as Mut<{
    themePreference: "light" | "dark" | "system";
  }>;
export const usersUpdateTavernModeRef =
  "users:updateTavernMode" as unknown as Mut<{
    tavernMode: boolean;
  }>;
export const usersUpdateMonthlyProfitGoalRef =
  "users:updateMonthlyProfitGoal" as unknown as Mut<{
    monthlyProfitGoal: number | null;
  }>;

// ───────────────── auth
export const verifyEmailRef = "auth/verifyEmail:verifyEmail" as unknown as Mut<
  { token: string },
  { ok: true; alreadyVerified: boolean }
>;
export const forgotPasswordRef = "auth/forgotPassword:forgotPassword" as unknown as Act<
  { email: string },
  { ok: true }
>;

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

// ───────────────── orgs
export const orgListMineRef = "org/me:listMine" as unknown as Q<
  Record<string, never>,
  Array<{
    orgId: Id<"organizations">;
    name: string;
    role: "owner" | "member";
    ownerId: Id<"users">;
  }>
>;

// ───────────────── admin/users
export const adminUsersListByStatusRef =
  "admin/users:listByStatus" as unknown as Q<
    {
      status?: "pending" | "approved" | "rejected";
      search?: string;
    },
    Doc<"users">[]
  >;
export const adminUsersCountsByStatusRef =
  "admin/users:countsByStatus" as unknown as Q<
    Record<string, never>,
    { total: number; pending: number; approved: number; rejected: number }
  >;
export const adminApproveUserRef = "admin/users:approveUser" as unknown as Mut<
  { userId: Id<"users"> },
  { ok: true; orgId: Id<"organizations"> }
>;
export const adminRejectUserRef = "admin/users:rejectUser" as unknown as Mut<
  { userId: Id<"users">; reason?: string },
  { ok: true }
>;

// ───────────────── org/invites
export type InvitePublic = {
  email: string;
  orgName: string;
  inviterName: string;
};
export const orgInvitesListRef = "org/invites:listInvitesForOrg" as unknown as Q<
  { orgId: Id<"organizations"> },
  Doc<"invites">[]
>;
export const orgInviteByTokenRef =
  "org/invites:getInviteByToken" as unknown as Q<
    { token: string },
    | { ok: true; invite: InvitePublic }
    | { ok: false; error: "not_found" | "expired" | "revoked" | "already_accepted" }
  >;
export const orgInviteCreateRef = "org/invites:createInvite" as unknown as Mut<
  { orgId: Id<"organizations">; email: string },
  { inviteId: Id<"invites"> }
>;
export const orgInviteRevokeRef = "org/invites:revokeInvite" as unknown as Mut<
  { inviteId: Id<"invites"> },
  { ok: true }
>;
export const orgInviteResendRef = "org/invites:resendInvite" as unknown as Mut<
  { inviteId: Id<"invites"> },
  { ok: true }
>;
export const orgInviteAcceptRef = "org/invites:acceptInvite" as unknown as Mut<
  { token: string },
  { ok: true; alreadyMember: boolean }
>;

// ───────────────── org/team
export type TeamMember = {
  membershipId: Id<"memberships">;
  userId: Id<"users">;
  email: string;
  name: string;
  role: "owner" | "member";
  joinedAt: number;
};
export const orgTeamListMembersRef = "org/team:listMembers" as unknown as Q<
  { orgId: Id<"organizations"> },
  TeamMember[]
>;
export const orgTeamRemoveMemberRef = "org/team:removeMember" as unknown as Mut<
  { membershipId: Id<"memberships"> },
  { ok: true }
>;
export const orgTeamLeaveRef = "org/team:leaveOrg" as unknown as Mut<
  { orgId: Id<"organizations"> },
  { ok: true }
>;
export const orgTeamTransferOwnershipRef =
  "org/team:transferOwnership" as unknown as Mut<
    {
      orgId: Id<"organizations">;
      newOwnerMembershipId: Id<"memberships">;
    },
    { ok: true }
  >;

// ───────────────── org/settings
export const orgRenameRef = "org/settings:renameOrg" as unknown as Mut<
  { orgId: Id<"organizations">; newName: string },
  { ok: true }
>;
