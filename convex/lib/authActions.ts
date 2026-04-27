import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureShopAccess } from "./helpers";

export const verifyShopAccess = internalMutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await ensureShopAccess(ctx, shopId);
    return { ok: true } as const;
  },
});
