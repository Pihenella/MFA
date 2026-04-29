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
import { upsertCampaignsRef, logSyncRef } from "../lib/syncRefs";

export const upsertCampaigns = internalMutation({
  args: { shopId: v.id("shops"), campaigns: v.array(v.any()) },
  handler: async (ctx, { shopId, campaigns }) => {
    for (const c of campaigns) {
      const existing = await ctx.db
        .query("campaigns")
        .withIndex("by_shop_campaign", (q) =>
          q.eq("shopId", shopId).eq("campaignId", Number(c.campaignId) || 0)
        )
        .first();
      const row = {
        shopId,
        campaignId: Number(c.campaignId) || 0,
        name: String(c.name ?? ""),
        budget: Number(c.budget) || 0,
        spent: Number(c.spent) || 0,
        impressions: Number(c.impressions) || 0,
        clicks: Number(c.clicks) || 0,
        updatedAt: Date.now(),
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("campaigns", row);
      }
    }
  },
});

export const syncPromotion = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    if (await skipIfWbRateLimited(ctx, shopId, "campaigns")) return;

    const headers: Record<string, string> = { Authorization: apiKey };

    try {
      // List campaigns via v2 endpoint
      const listRes = await fetchWithRetry(
        `https://advert-api.wildberries.ru/api/advert/v2/adverts?statuses=7,9,11`,
        { headers },
      );
      await assertOk(listRes);
      const listData = await listRes.json();
      const adverts: any[] = listData.adverts ?? (Array.isArray(listData) ? listData : []);
      if (Array.isArray(adverts) && adverts.length > 0) {
        const campaignIds = adverts.map((a: any) => a.id ?? a.advertId);
        const allCampaigns: any[] = [];
        const today = new Date().toISOString().slice(0, 10);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        // Fetch stats via v3 GET endpoint (max 50 ids per request)
        // Пауза после list запроса перед fullstats
        await new Promise((r) => setTimeout(r, 21000));
        const idBatches = chunk(campaignIds, 50);
        for (let bi = 0; bi < idBatches.length; bi++) {
          // fullstats: 3 req/min, 20s interval
          if (bi > 0) await new Promise((r) => setTimeout(r, 21000));
          const idsParam = idBatches[bi].join(",");
          const statsRes = await fetchWithRetry(
            `https://advert-api.wildberries.ru/adv/v3/fullstats?ids=${idsParam}&beginDate=${thirtyDaysAgo}&endDate=${today}`,
            { headers },
          );
          await assertOk(statsRes);
          const statsData: any[] = await statsRes.json();
          if (!Array.isArray(statsData)) continue;
          for (const stat of statsData) {
            const advert = adverts.find((a: any) => (a.id ?? a.advertId) === (stat.advertId ?? stat.id));
            let impressions = 0;
            let clicks = 0;
            let spent = 0;
            if (Array.isArray(stat.days)) {
              for (const day of stat.days) {
                if (Array.isArray(day.apps)) {
                  for (const app of day.apps) {
                    if (Array.isArray(app.nm)) {
                      for (const nm of app.nm) {
                        impressions += Number(nm.views) || 0;
                        clicks += Number(nm.clicks) || 0;
                        spent += Number(nm.sum) || 0;
                      }
                    }
                  }
                }
              }
            }
            // Also check top-level stats fields
            impressions = impressions || Number(stat.views) || 0;
            clicks = clicks || Number(stat.clicks) || 0;
            spent = spent || Number(stat.sum ?? stat.spent) || 0;
            allCampaigns.push({
              campaignId: stat.advertId ?? stat.id,
              name: advert?.settings?.name ?? advert?.name ?? `Campaign ${stat.advertId ?? stat.id}`,
              budget: Number(advert?.dailyBudget ?? advert?.budget) || 0,
              spent,
              impressions,
              clicks,
            });
          }
        }
        const campaignBatches = chunk(allCampaigns, BATCH_SIZE);
        for (const batch of campaignBatches) {
          await ctx.runMutation(upsertCampaignsRef, { shopId, campaigns: batch });
        }
        await clearWbRateLimitGuardForEndpoint(ctx, shopId, "campaigns");
        await ctx.runMutation(logSyncRef, {
          shopId, endpoint: "campaigns", status: "ok" as const, count: allCampaigns.length,
        });
      } else {
        await clearWbRateLimitGuardForEndpoint(ctx, shopId, "campaigns");
        await ctx.runMutation(logSyncRef, {
          shopId, endpoint: "campaigns", status: "ok" as const, count: 0,
        });
      }
    } catch (e: any) {
      await recordWbRateLimitGuardFromError(ctx, shopId, "campaigns", e);
      await ctx.runMutation(logSyncRef, {
        shopId, endpoint: "campaigns", status: "error" as const, error: e.message,
      });
    }
  },
});
