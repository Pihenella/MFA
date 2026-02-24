import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const syncAll = internalAction({
  handler: async (ctx) => {
    const shops = await ctx.runQuery(internal.shops.listInternal);
    for (const shop of shops) {
      if (!shop.isActive) continue;
      await ctx.runAction(internal.sync.syncShop, {
        shopId: shop._id,
        apiKey: shop.apiKey,
      });
    }
  },
});
