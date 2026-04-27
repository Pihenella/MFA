import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const seedLegacyUser = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const email = "pihenella@gmail.com";

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (existing && !force) {
      throw new Error(
        "Юзер уже создан. Используй force=true только в dev-режиме."
      );
    }
    if (existing && force) {
      // Перед удалением — снять связи: memberships, organizations с ownerId
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", existing._id))
        .collect();
      for (const m of memberships) await ctx.db.delete(m._id);
      const orgs = await ctx.db
        .query("organizations")
        .withIndex("by_owner", (q) => q.eq("ownerId", existing._id))
        .collect();
      for (const o of orgs) await ctx.db.delete(o._id);
      await ctx.db.delete(existing._id);
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email,
      name: "Юрий",
      phone: "",
      businessName: "AID",
      shopsCountWB: 2,
      shopsCountOzon: 0,
      skuCount: 62,
      status: "approved",
      emailVerifiedAt: now,
      emailVerificationTime: now,
      isSystemAdmin: true,
      createdAt: now,
      approvedAt: now,
    });

    const orgId = await ctx.db.insert("organizations", {
      name: "AID",
      ownerId: userId,
      createdAt: now,
    });

    await ctx.db.insert("memberships", {
      userId,
      orgId,
      role: "owner",
      createdAt: now,
    });

    // Привязать существующие shops к этой org как marketplace=wb
    const shops = await ctx.db.query("shops").collect();
    for (const s of shops) {
      await ctx.db.patch(s._id, { orgId, marketplace: "wb" });
    }

    return { userId, orgId, shopsUpdated: shops.length };
  },
});
