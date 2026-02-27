import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("shops").collect();
  },
});

export const listInternal = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("shops").collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, { name, apiKey }) => {
    return await ctx.db.insert("shops", {
      name,
      apiKey,
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

export const getSyncLog = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const logs = await ctx.db
      .query("syncLog")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .take(20);
    return logs;
  },
});
