import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import {
  chunk,
  BATCH_SIZE,
  fetchWithRetry,
  assertOk,
  clearWbRateLimitGuardForEndpoint,
  recordWbRateLimitGuardFromError,
  skipIfWbRateLimited,
} from "./helpers";
import { upsertProductCardsRef, logSyncRef } from "../lib/syncRefs";

export const upsertProductCards = internalMutation({
  args: { shopId: v.id("shops"), cards: v.array(v.any()) },
  handler: async (ctx, { shopId, cards }) => {
    for (const c of cards) {
      const nmId = c.nmID ?? c.nmId ?? 0;
      const existing = await ctx.db
        .query("productCards")
        .withIndex("by_shop_nm", (q) => q.eq("shopId", shopId).eq("nmId", nmId))
        .first();
      const photos: string[] = Array.isArray(c.photos)
        ? c.photos.map((p: any) => (typeof p === "string" ? p : p.big ?? p.small ?? "")).filter(Boolean)
        : [];
      const row = {
        shopId,
        nmId,
        title: c.title ?? "",
        brand: c.brand ?? "",
        vendorCode: c.vendorCode ?? "",
        subjectName: c.subjectName ?? "",
        photos,
        updatedAt: Date.now(),
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("productCards", row);
      }
    }
  },
});

export const syncContent = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    if (await skipIfWbRateLimited(ctx, shopId, "content")) return;

    const headers: Record<string, string> = { Authorization: apiKey };

    try {
      let cursor = "";
      let totalCount = 0;
      while (true) {
        const body: any = {
          settings: { cursor: { limit: 100 }, filter: { withPhoto: -1 } },
        };
        if (cursor) body.settings.cursor.updatedAt = cursor;

        const res = await fetchWithRetry(
          `https://content-api.wildberries.ru/content/v2/get/cards/list`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        await assertOk(res);
        const data = await res.json();
        const cards = data.cards ?? data.data?.cards ?? [];
        if (!Array.isArray(cards) || cards.length === 0) break;
        totalCount += cards.length;
        const batches = chunk(cards, BATCH_SIZE);
        for (const batch of batches) {
          await ctx.runMutation(upsertProductCardsRef, { shopId, cards: batch });
        }
        cursor = data.cursor?.updatedAt ?? "";
        if (!cursor || cards.length < 100) break;
      }
      await clearWbRateLimitGuardForEndpoint(ctx, shopId, "content");
      await ctx.runMutation(logSyncRef, {
        shopId, endpoint: "content", status: "ok" as const, count: totalCount,
      });
    } catch (e: any) {
      await recordWbRateLimitGuardFromError(ctx, shopId, "content", e);
      await ctx.runMutation(logSyncRef, {
        shopId, endpoint: "content", status: "error" as const, error: e.message,
      });
    }
  },
});
