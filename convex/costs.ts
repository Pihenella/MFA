import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertCost = mutation({
  args: {
    shopId: v.id("shops"),
    nmId: v.number(),
    supplierArticle: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, { shopId, nmId, supplierArticle, cost }) => {
    const existing = await ctx.db
      .query("costs")
      .withIndex("by_shop_nm", (q) => q.eq("shopId", shopId).eq("nmId", nmId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { cost, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("costs", { shopId, nmId, supplierArticle, cost, updatedAt: Date.now() });
    }
  },
});

export const upsertBulk = mutation({
  args: {
    shopId: v.id("shops"),
    items: v.array(
      v.object({
        nmId: v.number(),
        supplierArticle: v.string(),
        cost: v.number(),
      })
    ),
  },
  handler: async (ctx, { shopId, items }) => {
    for (const item of items) {
      const existing = await ctx.db
        .query("costs")
        .withIndex("by_shop_nm", (q) => q.eq("shopId", shopId).eq("nmId", item.nmId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { cost: item.cost, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("costs", { ...item, shopId, updatedAt: Date.now() });
      }
    }
  },
});

export const listByShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    return await ctx.db
      .query("costs")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect();
  },
});
