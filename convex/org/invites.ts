import {
  query,
  mutation,
  internalMutation,
} from "../_generated/server";
import { v } from "convex/values";
import {
  generateRandomToken,
  normalizeEmail,
  validateEmail,
} from "../../src/lib/auth-utils";
import { ensureOrgOwner, getCurrentUser } from "../lib/helpers";
import {
  sendTeamInviteRef,
  sendInviteAcceptedRef,
} from "../lib/emailRefs";

const INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export const listInvitesForOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await ensureOrgOwner(ctx, orgId);
    const all = await ctx.db
      .query("invites")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    return all.filter((i) => i.status === "pending");
  },
});

export const createInvite = mutation({
  args: { orgId: v.id("organizations"), email: v.string() },
  handler: async (ctx, { orgId, email }) => {
    const { user, org } = await ensureOrgOwner(ctx, orgId);
    const normalized = normalizeEmail(email);
    if (!validateEmail(normalized).ok) throw new Error("Некорректный email");

    const existingMembers = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    for (const m of existingMembers) {
      const u = await ctx.db.get(m.userId);
      if (u && u.email === normalized) {
        throw new Error("Этот юзер уже в команде");
      }
    }

    const existingInvites = await ctx.db
      .query("invites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", normalized).eq("status", "pending")
      )
      .collect();
    if (existingInvites.some((i) => i.orgId === orgId)) {
      throw new Error("Активное приглашение уже существует");
    }

    const token = generateRandomToken(32);
    const inviteId = await ctx.db.insert("invites", {
      orgId,
      email: normalized,
      role: "member",
      token,
      status: "pending",
      invitedBy: user._id,
      createdAt: Date.now(),
      expiresAt: Date.now() + INVITE_TTL_MS,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await ctx.scheduler.runAfter(0, sendTeamInviteRef, {
      email: normalized,
      inviterName: user.name ?? "",
      orgName: org.name,
      acceptUrl: `${appUrl}/invite/${token}`,
    });

    return { inviteId };
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Приглашение не найдено");
    await ensureOrgOwner(ctx, invite.orgId);
    if (invite.status !== "pending") throw new Error("Уже не pending");
    await ctx.db.patch(inviteId, { status: "revoked" });
    return { ok: true };
  },
});

export const resendInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Приглашение не найдено");
    const { user, org } = await ensureOrgOwner(ctx, invite.orgId);
    if (invite.status !== "pending")
      throw new Error("Только pending можно переотправлять");

    await ctx.db.patch(inviteId, { expiresAt: Date.now() + INVITE_TTL_MS });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await ctx.scheduler.runAfter(0, sendTeamInviteRef, {
      email: invite.email,
      inviterName: user.name ?? "",
      orgName: org.name,
      acceptUrl: `${appUrl}/invite/${invite.token}`,
    });

    return { ok: true };
  },
});

export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite) return { ok: false as const, error: "not_found" as const };
    if (invite.status === "accepted")
      return { ok: false as const, error: "already_accepted" as const };
    if (invite.status === "revoked")
      return { ok: false as const, error: "revoked" as const };
    if (invite.status === "expired" || invite.expiresAt < Date.now())
      return { ok: false as const, error: "expired" as const };

    const org = await ctx.db.get(invite.orgId);
    const inviter = await ctx.db.get(invite.invitedBy);
    return {
      ok: true as const,
      invite: {
        email: invite.email,
        orgName: org?.name ?? "",
        inviterName: inviter?.name ?? "",
      },
    };
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await getCurrentUser(ctx);
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite || invite.status !== "pending")
      throw new Error("Приглашение недействительно");
    if (invite.expiresAt < Date.now()) throw new Error("Приглашение истекло");

    if (user.email !== invite.email) {
      throw new Error("Этот инвайт для другого email");
    }

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user._id).eq("orgId", invite.orgId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(invite._id, {
        status: "accepted",
        acceptedAt: Date.now(),
      });
      return { ok: true, alreadyMember: true };
    }

    // Если invitee пришёл с status=pending — invite даёт fast-track approve
    if (user.status !== "approved") {
      await ctx.db.patch(user._id, {
        status: "approved",
        emailVerifiedAt: user.emailVerifiedAt ?? Date.now(),
        approvedAt: Date.now(),
      });
    }

    await ctx.db.insert("memberships", {
      userId: user._id,
      orgId: invite.orgId,
      role: invite.role,
      createdAt: Date.now(),
    });
    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    // Письмо owner-у
    const org = await ctx.db.get(invite.orgId);
    if (org) {
      const owner = await ctx.db.get(org.ownerId);
      if (owner) {
        await ctx.scheduler.runAfter(0, sendInviteAcceptedRef, {
          email: owner.email ?? "",
          ownerName: owner.name ?? "",
          inviteeName: user.name ?? "",
          orgName: org.name,
        });
      }
    }

    return { ok: true, alreadyMember: false };
  },
});

export const expireOldInvites = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db
      .query("invites")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .collect();
    for (const i of stale) {
      await ctx.db.patch(i._id, { status: "expired" });
    }
    return { expired: stale.length };
  },
});
