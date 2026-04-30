import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const DEFAULT_EMAIL = "pihenella@gmail.com";
const DEFAULT_NAME = "Юрий";
const DEFAULT_BUSINESS_NAME = "AID";

export const backfillLegacyOrg = internalMutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    businessName: v.optional(v.string()),
    marketplace: v.optional(v.union(v.literal("wb"), v.literal("ozon"))),
  },
  handler: async (
    ctx,
    {
      email = DEFAULT_EMAIL,
      name = DEFAULT_NAME,
      businessName = DEFAULT_BUSINESS_NAME,
      marketplace = "wb",
    },
  ) => {
    const now = Date.now();
    const shops = await ctx.db.query("shops").collect();

    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();

    let userCreated = false;
    let userId: Id<"users">;
    if (user) {
      userId = user._id;
      await ctx.db.patch(userId, {
        name: user.name ?? name,
        businessName: user.businessName ?? businessName,
        status: user.status ?? "approved",
        emailVerifiedAt: user.emailVerifiedAt ?? now,
        emailVerificationTime: user.emailVerificationTime ?? now,
        isSystemAdmin: user.isSystemAdmin ?? true,
        createdAt: user.createdAt ?? now,
        approvedAt: user.approvedAt ?? now,
        shopsCountWB: user.shopsCountWB ?? shops.length,
        shopsCountOzon: user.shopsCountOzon ?? 0,
      });
    } else {
      userId = await ctx.db.insert("users", {
        email,
        name,
        businessName,
        shopsCountWB: marketplace === "wb" ? shops.length : 0,
        shopsCountOzon: marketplace === "ozon" ? shops.length : 0,
        skuCount: 0,
        status: "approved",
        emailVerifiedAt: now,
        emailVerificationTime: now,
        isSystemAdmin: true,
        createdAt: now,
        approvedAt: now,
      });
      userCreated = true;
    }

    let org = await ctx.db
      .query("organizations")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();

    let orgCreated = false;
    let orgId: Id<"organizations">;
    if (org) {
      orgId = org._id;
    } else {
      orgId = await ctx.db.insert("organizations", {
        name: businessName,
        ownerId: userId,
        createdAt: now,
      });
      orgCreated = true;
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("orgId", orgId),
      )
      .unique();

    let membershipCreated = false;
    if (!membership) {
      await ctx.db.insert("memberships", {
        userId,
        orgId,
        role: "owner",
        createdAt: now,
      });
      membershipCreated = true;
    }

    let shopsUpdated = 0;
    for (const shop of shops) {
      const legacyShop = shop as typeof shop & {
        orgId?: Id<"organizations">;
        marketplace?: "wb" | "ozon";
      };
      const patch: {
        orgId?: Id<"organizations">;
        marketplace?: "wb" | "ozon";
      } = {};

      if (!legacyShop.orgId) patch.orgId = orgId;
      if (!legacyShop.marketplace) patch.marketplace = marketplace;

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(shop._id, patch);
        shopsUpdated += 1;
      }
    }

    return {
      userCreated,
      orgCreated,
      membershipCreated,
      shopsUpdated,
      userId,
      orgId,
    };
  },
});
