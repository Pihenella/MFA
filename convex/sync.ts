import { internalMutation, internalAction } from "./_generated/server";
import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import {
  syncStatisticsRef,
  syncPromotionRef,
  syncContentRef,
  syncAnalyticsRef,
  syncFeedbacksRef,
  syncPricesRef,
  syncReturnsRef,
  syncTariffsRef,
  shopsUpdateLastSyncRef,
} from "./lib/syncRefs";

// Pre-resolved refs обходят TS2589 (deep `internal` type instantiation).
const backfillPriceWithDiscBatchRef =
  "sync:backfillPriceWithDiscBatch" as unknown as FunctionReference<
    "mutation",
    "internal",
    Record<string, never>,
    number
  >;
const deleteEmptyOrderIdBatchRef =
  "sync:deleteEmptyOrderIdBatch" as unknown as FunctionReference<
    "mutation",
    "internal",
    Record<string, never>,
    number
  >;

const DEFAULT_CATEGORIES = ["statistics", "promotion", "analytics"];

// ---- Orchestrator ----

export const syncShop = internalAction({
  args: {
    shopId: v.id("shops"),
    apiKey: v.string(),
    enabledCategories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { shopId, apiKey, enabledCategories }) => {
    const categories = enabledCategories ?? DEFAULT_CATEGORIES;

    for (let i = 0; i < categories.length; i++) {
      // Пауза между категориями чтобы не превышать глобальный лимит WB на продавца
      if (i > 0) await new Promise((r) => setTimeout(r, 25000));
      const category = categories[i];
      switch (category) {
        case "statistics":
          await ctx.runAction(syncStatisticsRef, { shopId, apiKey });
          break;
        case "promotion":
          await ctx.runAction(syncPromotionRef, { shopId, apiKey });
          break;
        case "content":
          await ctx.runAction(syncContentRef, { shopId, apiKey });
          break;
        case "analytics":
          await ctx.runAction(syncAnalyticsRef, { shopId, apiKey });
          break;
        case "feedbacks":
          await ctx.runAction(syncFeedbacksRef, { shopId, apiKey });
          break;
        case "prices":
          await ctx.runAction(syncPricesRef, { shopId, apiKey });
          break;
        case "returns":
          await ctx.runAction(syncReturnsRef, { shopId, apiKey });
          break;
        case "tariffs":
          await ctx.runAction(syncTariffsRef, { shopId, apiKey });
          break;
      }
    }

    // Update lastSyncAt
    await ctx.runMutation(shopsUpdateLastSyncRef, { id: shopId });
  },
});

// ---- Backfill: add priceWithDisc to existing orders ----

export const backfillPriceWithDiscBatch = internalMutation({
  handler: async (ctx) => {
    const batch = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("priceWithDisc"), undefined))
      .take(500);
    for (const o of batch) {
      const priceWithDisc = o.totalPrice * (1 - o.discountPercent / 100);
      await ctx.db.patch(o._id, { priceWithDisc });
    }
    return batch.length;
  },
});

export const backfillPriceWithDisc = internalAction({
  args: {},
  handler: async (ctx) => {
    let total = 0;
    for (let i = 0; i < 100; i++) {
      const patched: number = await ctx.runMutation(
        backfillPriceWithDiscBatchRef
      );
      total += patched;
      if (patched === 0) break;
    }
    return total;
  },
});

// ---- Cleanup: delete duplicate orders with empty orderId ----

export const deleteEmptyOrderIdBatch = internalMutation({
  handler: async (ctx) => {
    const batch = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", ""))
      .take(500);
    for (const o of batch) await ctx.db.delete(o._id);
    return batch.length;
  },
});

export const cleanupDuplicateOrders = internalAction({
  args: { maxBatches: v.optional(v.number()) },
  handler: async (ctx, { maxBatches }) => {
    const limit = maxBatches ?? 50;
    let total = 0;
    for (let i = 0; i < limit; i++) {
      const deleted: number = await ctx.runMutation(
        deleteEmptyOrderIdBatchRef
      );
      total += deleted;
      if (deleted === 0) break;
    }
    return total;
  },
});
