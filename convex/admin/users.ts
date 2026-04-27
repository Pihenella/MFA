import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureAdmin } from "../lib/helpers";
import { sendApprovedRef, sendRejectedRef } from "../lib/emailRefs";

const STATUS = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

export const listByStatus = query({
  args: { status: v.optional(STATUS), search: v.optional(v.string()) },
  handler: async (ctx, { status, search }) => {
    await ensureAdmin(ctx);
    let users;
    if (status) {
      users = await ctx.db
        .query("users")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      users = await ctx.db.query("users").collect();
    }
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(s) ||
          (u.name ?? "").toLowerCase().includes(s) ||
          (u.phone ?? "").toLowerCase().includes(s)
      );
    }
    users.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return users;
  },
});

export const countsByStatus = query({
  args: {},
  handler: async (ctx) => {
    await ensureAdmin(ctx);
    const all = await ctx.db.query("users").collect();
    return {
      total: all.length,
      pending: all.filter((u) => u.status === "pending").length,
      approved: all.filter((u) => u.status === "approved").length,
      rejected: all.filter((u) => u.status === "rejected").length,
    };
  },
});

export const approveUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const admin = await ensureAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Пользователь не найден");
    if (user.status === "approved") throw new Error("Уже одобрен");
    if (!user.emailVerifiedAt) throw new Error("Email не подтверждён");

    const orgId = await ctx.db.insert("organizations", {
      name: user.businessName ?? "",
      ownerId: userId,
      createdAt: Date.now(),
    });
    await ctx.db.insert("memberships", {
      userId,
      orgId,
      role: "owner",
      createdAt: Date.now(),
    });
    await ctx.db.patch(userId, {
      status: "approved",
      approvedAt: Date.now(),
      approvedBy: admin._id,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await ctx.scheduler.runAfter(0, sendApprovedRef, {
      email: user.email ?? "",
      name: user.name ?? "",
      loginUrl: `${appUrl}/login`,
    });

    return { ok: true, orgId };
  },
});

export const rejectUser = mutation({
  args: { userId: v.id("users"), reason: v.optional(v.string()) },
  handler: async (ctx, { userId, reason }) => {
    await ensureAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Пользователь не найден");
    if (user.status === "rejected") throw new Error("Уже отклонён");

    await ctx.db.patch(userId, {
      status: "rejected",
      rejectionReason: reason,
    });

    await ctx.scheduler.runAfter(0, sendRejectedRef, {
      email: user.email ?? "",
      name: user.name ?? "",
      reason,
      supportContact: "@Virtuozick",
    });

    return { ok: true };
  },
});
