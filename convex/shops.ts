import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ensureApproved, listUserShopIds } from "./lib/helpers";

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
    return await ctx.db.insert("shops", {
      orgId,
      marketplace,
      name,
      apiKey,
      ozonClientId,
      isActive: true,
      lastSyncAt: undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("shops") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const setActive = mutation({
  args: { id: v.id("shops"), isActive: v.boolean() },
  handler: async (ctx, { id, isActive }) => {
    await ctx.db.patch(id, { isActive });
  },
});

export const updateLastSync = internalMutation({
  args: { id: v.id("shops") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { lastSyncAt: Date.now() });
  },
});

export const updateCategories = mutation({
  args: {
    id: v.id("shops"),
    enabledCategories: v.array(v.string()),
  },
  handler: async (ctx, { id, enabledCategories }) => {
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
    // Берём достаточно записей, чтобы покрыть все эндпоинты (12+ эндпоинтов × 2-3 цикла)
    const logs = await ctx.db
      .query("syncLog")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .take(100);
    return logs;
  },
});
