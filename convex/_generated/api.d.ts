/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as auth_forgotPassword from "../auth/forgotPassword.js";
import type * as auth_resetPassword from "../auth/resetPassword.js";
import type * as auth_verifyEmail from "../auth/verifyEmail.js";
import type * as costs from "../costs.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as email_actions from "../email/actions.js";
import type * as email_rateLimit from "../email/rateLimit.js";
import type * as email_resend from "../email/resend.js";
import type * as financials from "../financials.js";
import type * as http from "../http.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as shops from "../shops.js";
import type * as sync from "../sync.js";
import type * as sync_helpers from "../sync/helpers.js";
import type * as sync_syncAnalytics from "../sync/syncAnalytics.js";
import type * as sync_syncContent from "../sync/syncContent.js";
import type * as sync_syncFeedbacks from "../sync/syncFeedbacks.js";
import type * as sync_syncPrices from "../sync/syncPrices.js";
import type * as sync_syncPromotion from "../sync/syncPromotion.js";
import type * as sync_syncReturns from "../sync/syncReturns.js";
import type * as sync_syncStatistics from "../sync/syncStatistics.js";
import type * as sync_syncTariffs from "../sync/syncTariffs.js";
import type * as syncAll from "../syncAll.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  analytics: typeof analytics;
  auth: typeof auth;
  "auth/forgotPassword": typeof auth_forgotPassword;
  "auth/resetPassword": typeof auth_resetPassword;
  "auth/verifyEmail": typeof auth_verifyEmail;
  costs: typeof costs;
  crons: typeof crons;
  dashboard: typeof dashboard;
  "email/actions": typeof email_actions;
  "email/rateLimit": typeof email_rateLimit;
  "email/resend": typeof email_resend;
  financials: typeof financials;
  http: typeof http;
  "lib/helpers": typeof lib_helpers;
  shops: typeof shops;
  sync: typeof sync;
  "sync/helpers": typeof sync_helpers;
  "sync/syncAnalytics": typeof sync_syncAnalytics;
  "sync/syncContent": typeof sync_syncContent;
  "sync/syncFeedbacks": typeof sync_syncFeedbacks;
  "sync/syncPrices": typeof sync_syncPrices;
  "sync/syncPromotion": typeof sync_syncPromotion;
  "sync/syncReturns": typeof sync_syncReturns;
  "sync/syncStatistics": typeof sync_syncStatistics;
  "sync/syncTariffs": typeof sync_syncTariffs;
  syncAll: typeof syncAll;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
