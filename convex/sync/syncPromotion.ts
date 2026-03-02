import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { chunk, BATCH_SIZE, fetchWithRetry, assertOk } from "./helpers";

export const upsertCampaigns = internalMutation({
  args: { shopId: v.id("shops"), campaigns: v.array(v.any()) },
  handler: async (ctx, { shopId, campaigns }) => {
    for (const c of campaigns) {
      const existing = await ctx.db
        .query("campaigns")
        .withIndex("by_campaign_id", (q) => q.eq("campaignId", c.campaignId))
        .first();
      const row = {
        shopId,
        campaignId: c.campaignId,
        name: c.name ?? "",
        budget: c.budget ?? 0,
        spent: c.spent ?? 0,
        impressions: c.impressions ?? 0,
        clicks: c.clicks ?? 0,
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
    const headers: Record<string, string> = { Authorization: apiKey };

    try {
      const listRes = await fetchWithRetry(
        `https://advert-api.wildberries.ru/adv/v1/promotion/adverts?status=7&status=9&status=11`,
        { headers },
      );
      await assertOk(listRes);
      const adverts: any[] = await listRes.json();
      if (Array.isArray(adverts) && adverts.length > 0) {
        const campaignIds = adverts.map((a: any) => a.advertId);
        const allCampaigns: any[] = [];
        const idBatches = chunk(campaignIds, 100);
        for (const idBatch of idBatches) {
          const statsRes = await fetchWithRetry(
            `https://advert-api.wildberries.ru/adv/v2/fullstats`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify(idBatch),
            },
          );
          if (!statsRes.ok) continue;
          const statsData: any[] = await statsRes.json();
          if (!Array.isArray(statsData)) continue;
          for (const stat of statsData) {
            const advert = adverts.find((a: any) => a.advertId === stat.advertId);
            let impressions = 0;
            let clicks = 0;
            let spent = 0;
            if (Array.isArray(stat.days)) {
              for (const day of stat.days) {
                if (Array.isArray(day.apps)) {
                  for (const app of day.apps) {
                    if (Array.isArray(app.nm)) {
                      for (const nm of app.nm) {
                        impressions += nm.views ?? 0;
                        clicks += nm.clicks ?? 0;
                        spent += nm.sum ?? 0;
                      }
                    }
                  }
                }
              }
            }
            allCampaigns.push({
              campaignId: stat.advertId,
              name: advert?.name ?? advert?.changeTime ?? `Campaign ${stat.advertId}`,
              budget: advert?.dailyBudget ?? 0,
              spent,
              impressions,
              clicks,
            });
          }
        }
        const campaignBatches = chunk(allCampaigns, BATCH_SIZE);
        for (const batch of campaignBatches) {
          await ctx.runMutation(internal.sync.syncPromotion.upsertCampaigns, { shopId, campaigns: batch });
        }
        await ctx.runMutation(internal.sync.helpers.logSync, {
          shopId, endpoint: "campaigns", status: "ok" as const, count: allCampaigns.length,
        });
      } else {
        await ctx.runMutation(internal.sync.helpers.logSync, {
          shopId, endpoint: "campaigns", status: "ok" as const, count: 0,
        });
      }
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "campaigns", status: "error" as const, error: e.message,
      });
    }
  },
});
