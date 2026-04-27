"use node";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { sendEmailViaResend } from "./resend";
import {
  renderVerifyEmail,
  renderApprovedEmail,
  renderRejectedEmail,
  renderResetPasswordEmail,
  renderTeamInviteEmail,
  renderInviteAcceptedEmail,
} from "../../src/lib/email-templates";

export const sendVerify = internalAction({
  args: { email: v.string(), name: v.string(), verifyUrl: v.string() },
  handler: async (ctx, { email, name, verifyUrl }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "verify",
    });
    const tpl = renderVerifyEmail({ name, verifyUrl });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendApproved = internalAction({
  args: { email: v.string(), name: v.string(), loginUrl: v.string() },
  handler: async (ctx, { email, name, loginUrl }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "approved",
    });
    const tpl = renderApprovedEmail({ name, loginUrl });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendRejected = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    reason: v.optional(v.string()),
    supportContact: v.string(),
  },
  handler: async (ctx, { email, name, reason, supportContact }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "rejected",
    });
    const tpl = renderRejectedEmail({ name, reason, supportContact });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendReset = internalAction({
  args: { email: v.string(), name: v.string(), resetUrl: v.string() },
  handler: async (ctx, { email, name, resetUrl }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "reset",
    });
    const tpl = renderResetPasswordEmail({ name, resetUrl });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendTeamInvite = internalAction({
  args: {
    email: v.string(),
    inviterName: v.string(),
    orgName: v.string(),
    acceptUrl: v.string(),
  },
  handler: async (ctx, { email, inviterName, orgName, acceptUrl }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "teamInvite",
    });
    const tpl = renderTeamInviteEmail({ inviterName, orgName, acceptUrl });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendInviteAccepted = internalAction({
  args: {
    email: v.string(),
    ownerName: v.string(),
    inviteeName: v.string(),
    orgName: v.string(),
  },
  handler: async (ctx, { email, ownerName, inviteeName, orgName }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "inviteAccepted",
    });
    const tpl = renderInviteAcceptedEmail({ ownerName, inviteeName, orgName });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});
