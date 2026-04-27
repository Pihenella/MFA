// Pre-resolved string refs обходят TS2589 (deep `internal` type instantiation).
// Convex принимает строки формата "<module>:<func>" для модулей в подпапках.
// Сигнатуры здесь должны соответствовать args в convex/email/actions.ts.

import type { FunctionReference } from "convex/server";

export const sendVerifyRef = "email/actions:sendVerify" as unknown as FunctionReference<
  "action",
  "internal",
  { email: string; name: string; verifyUrl: string }
>;

export const sendApprovedRef = "email/actions:sendApproved" as unknown as FunctionReference<
  "action",
  "internal",
  { email: string; name: string; loginUrl: string }
>;

export const sendRejectedRef = "email/actions:sendRejected" as unknown as FunctionReference<
  "action",
  "internal",
  { email: string; name: string; reason?: string; supportContact: string }
>;

export const sendResetRef = "email/actions:sendReset" as unknown as FunctionReference<
  "action",
  "internal",
  { email: string; name: string; resetUrl: string }
>;

export const sendTeamInviteRef = "email/actions:sendTeamInvite" as unknown as FunctionReference<
  "action",
  "internal",
  { email: string; inviterName: string; orgName: string; acceptUrl: string }
>;

export const sendInviteAcceptedRef = "email/actions:sendInviteAccepted" as unknown as FunctionReference<
  "action",
  "internal",
  { email: string; ownerName: string; inviteeName: string; orgName: string }
>;
