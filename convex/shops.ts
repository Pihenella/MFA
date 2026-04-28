import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  ensureApproved,
  ensureOrgOwner,
  ensureShopAccess,
  listUserShopIds,
} from "./lib/helpers";
import {
  recordAchievementIfNew,
  recordShopMilestonesForShop,
} from "./achievements";

/** @deprecated Use shops.listMine. Удалится в A.3 после миграции UI. */
export const list = query({
  handler: async (ctx) => {
    await ensureApproved(ctx);
    const shopIds = await listUserShopIds(ctx);
    const shops = await Promise.all(shopIds.map((id) => ctx.db.get(id)));
    return shops.filter((s): s is NonNullable<typeof s> => s !== null);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    await ensureApproved(ctx);
    const shopIds = await listUserShopIds(ctx);
    const shops = await Promise.all(shopIds.map((id) => ctx.db.get(id)));
    return shops.filter((s): s is NonNullable<typeof s> => s !== null);
  },
});

export const listInternal = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("shops").collect();
  },
});

export const add = mutation({
  args: {
    orgId: v.id("organizations"),
    marketplace: v.union(v.literal("wb"), v.literal("ozon")),
    name: v.string(),
    apiKey: v.string(),
    ozonClientId: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, marketplace, name, apiKey, ozonClientId }) => {
    const { user } = await ensureOrgOwner(ctx, orgId);
    const shopId = await ctx.db.insert("shops", {
      orgId,
      marketplace,
      name,
      apiKey,
      ozonClientId,
      isActive: true,
      lastSyncAt: undefined,
    });
    try {
      await recordAchievementIfNew(ctx, {
        userId: user._id,
        kind: "firstShop",
        payload: { shopId },
      });
    } catch (error) {
      console.error("Failed to record firstShop achievement", error);
    }
    return shopId;
  },
});

export const remove = mutation({
  args: { id: v.id("shops") },
  handler: async (ctx, { id }) => {
    const { shop, membership } = await ensureShopAccess(ctx, id);
    if (membership.role !== "owner") throw new Error("forbidden: only owner can delete shops");
    void shop;
    await ctx.db.delete(id);
  },
});

export const setActive = mutation({
  args: { id: v.id("shops"), isActive: v.boolean() },
  handler: async (ctx, { id, isActive }) => {
    await ensureShopAccess(ctx, id);
    await ctx.db.patch(id, { isActive });
  },
});

export const updateLastSync = internalMutation({
  args: { id: v.id("shops") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { lastSyncAt: Date.now() });
    try {
      await recordShopMilestonesForShop(ctx, id);
    } catch (error) {
      console.error("Failed to record achievement milestones", error);
    }
  },
});

export const updateCategories = mutation({
  args: {
    id: v.id("shops"),
    enabledCategories: v.array(v.string()),
  },
  handler: async (ctx, { id, enabledCategories }) => {
    await ensureShopAccess(ctx, id);
    await ctx.db.patch(id, { enabledCategories });
  },
});

export const enableAllCategoriesForAll = internalMutation({
  handler: async (ctx) => {
    const all = [
      "statistics", "promotion", "analytics",
      "content", "feedbacks", "prices", "returns", "tariffs",
    ];
    const shops = await ctx.db.query("shops").collect();
    for (const s of shops) {
      await ctx.db.patch(s._id, { enabledCategories: all });
    }
  },
});

export const getSyncLog = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await ensureShopAccess(ctx, shopId);
    const logs = await ctx.db
      .query("syncLog")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .take(100);
    return logs;
  },
});
