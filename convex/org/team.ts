import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureOrgMember, ensureOrgOwner } from "../lib/helpers";

export const listMembers = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await ensureOrgMember(ctx, orgId);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const members = await Promise.all(
      memberships.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return u
          ? {
              membershipId: m._id,
              userId: u._id,
              email: u.email ?? "",
              name: u.name ?? "",
              role: m.role,
              joinedAt: m.createdAt,
            }
          : null;
      })
    );
    return members.filter((m): m is NonNullable<typeof m> => m !== null);
  },
});

export const removeMember = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new Error("Membership не найден");
    const { user } = await ensureOrgOwner(ctx, membership.orgId);
    if (membership.userId === user._id) {
      throw new Error("Owner не может удалить сам себя — передайте ownership");
    }
    if (membership.role === "owner") {
      throw new Error("Нельзя удалить owner-а напрямую");
    }
    await ctx.db.delete(membershipId);
    return { ok: true };
  },
});

export const leaveOrg = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const { membership } = await ensureOrgMember(ctx, orgId);
    if (membership.role === "owner") {
      throw new Error("Owner не может покинуть org — передайте ownership");
    }
    await ctx.db.delete(membership._id);
    return { ok: true };
  },
});

export const transferOwnership = mutation({
  args: {
    orgId: v.id("organizations"),
    newOwnerMembershipId: v.id("memberships"),
  },
  handler: async (ctx, { orgId, newOwnerMembershipId }) => {
    const { user, membership: ownerMembership } = await ensureOrgOwner(
      ctx,
      orgId
    );
    const target = await ctx.db.get(newOwnerMembershipId);
    if (!target) throw new Error("Целевой member не найден");
    if (target.orgId !== orgId) throw new Error("Член другой org");
    if (target.userId === user._id) throw new Error("Уже owner");

    // Convex mutation атомарна — все 3 patch'а в одной транзакции.
    await ctx.db.patch(ownerMembership._id, { role: "member" });
    await ctx.db.patch(target._id, { role: "owner" });
    await ctx.db.patch(orgId, { ownerId: target.userId });

    return { ok: true };
  },
});
