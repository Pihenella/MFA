import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const triggerSync = action({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    const shop = shops.find((s) => s._id === shopId);
    if (!shop) throw new Error("Shop not found");
    await ctx.runAction(internal.sync.syncShop, { shopId, apiKey: shop.apiKey });
  },
});
