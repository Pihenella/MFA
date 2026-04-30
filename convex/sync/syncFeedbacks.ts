import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import {
  chunk,
  BATCH_SIZE,
  fetchWithRetry,
  assertOk,
  clearWbRateLimitGuardForEndpoint,
  getLatestWbSyncAttempt,
  isWbBaseToken,
  logSyncFailure,
  skipIfWbRateLimited,
  skipIfWbSyncTooSoon,
} from "./helpers";
import { upsertFeedbacksRef, upsertQuestionsRef, logSyncRef } from "../lib/syncRefs";

export const upsertFeedbacks = internalMutation({
  args: { shopId: v.id("shops"), feedbacks: v.array(v.any()) },
  handler: async (ctx, { shopId, feedbacks }) => {
    for (const f of feedbacks) {
      const feedbackId = String(f.id ?? f.feedbackId ?? "");
      const existing = await ctx.db
        .query("feedbacks")
        .withIndex("by_shop_feedback", (q) =>
          q.eq("shopId", shopId).eq("feedbackId", feedbackId)
        )
        .first();
      const row = {
        shopId,
        feedbackId,
        nmId: Number(f.nmId ?? f.productDetails?.nmId) || 0,
        text: String(f.text ?? ""),
        productValuation: Number(f.productValuation) || 0,
        answer: f.answer?.text ?? undefined,
        createdDate: f.createdDate ?? "",
        isAnswered: !!(f.answer?.text),
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("feedbacks", row);
      }
    }
  },
});

export const upsertQuestions = internalMutation({
  args: { shopId: v.id("shops"), questions: v.array(v.any()) },
  handler: async (ctx, { shopId, questions }) => {
    for (const q of questions) {
      const questionId = String(q.id ?? q.questionId ?? "");
      const existing = await ctx.db
        .query("questions")
        .withIndex("by_shop_question", (qb) =>
          qb.eq("shopId", shopId).eq("questionId", questionId)
        )
        .first();
      const row = {
        shopId,
        questionId,
        nmId: Number(q.nmId ?? q.productDetails?.nmId) || 0,
        text: String(q.text ?? ""),
        answer: q.answer?.text ?? undefined,
        createdDate: q.createdDate ?? "",
        isAnswered: !!(q.answer?.text),
      };
      if (existing) {
        await ctx.db.patch(existing._id, row);
      } else {
        await ctx.db.insert("questions", row);
      }
    }
  },
});

export const syncFeedbacks = internalAction({
  args: { shopId: v.id("shops"), apiKey: v.string() },
  handler: async (ctx, { shopId, apiKey }) => {
    const headers: Record<string, string> = { Authorization: apiKey };
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 86400000) / 1000);
    const baseToken = isWbBaseToken(apiKey);
    const communicationEndpoints = ["feedbacks", "questions"];

    const fetchPaged = async (
      kind: "feedbacks" | "questions",
      isAnswered: boolean,
      maxPages = Number.POSITIVE_INFINITY,
    ) => {
      let skip = 0;
      let pageCount = 0;
      const total: any[] = [];
      while (true) {
        const res = await fetchWithRetry(
          `https://feedbacks-api.wildberries.ru/api/v1/${kind}?isAnswered=${isAnswered}&take=5000&skip=${skip}&dateFrom=${thirtyDaysAgo}`,
          { headers },
        );
        await assertOk(res);
        const data = await res.json();
        const items = data.data?.[kind] ?? [];
        if (!Array.isArray(items) || items.length === 0) break;
        total.push(...items);
        pageCount++;
        if (pageCount >= maxPages) break;
        if (items.length < 5000) break;
        skip += items.length;
      }
      return total;
    };

    const latestCommunicationAttempt = baseToken
      ? await getLatestWbSyncAttempt(ctx, shopId, communicationEndpoints)
      : null;
    const order: Array<"feedbacks" | "questions"> =
      baseToken && latestCommunicationAttempt?.endpoint === "feedbacks"
        ? ["questions", "feedbacks"]
        : ["feedbacks", "questions"];
    const twoHourSlot = Math.floor(Date.now() / (2 * 60 * 60_000));

    for (const kind of order) {
      if (await skipIfWbRateLimited(ctx, shopId, kind)) continue;
      if (
        await skipIfWbSyncTooSoon(ctx, shopId, apiKey, kind, {
          cadenceEndpoints: communicationEndpoints,
        })
      ) {
        continue;
      }

      const answeredStates = baseToken
        ? [twoHourSlot % 2 === 1]
        : [false, true];
      try {
        const items: any[] = [];
        for (const isAnswered of answeredStates) {
          items.push(
            ...(await fetchPaged(
              kind,
              isAnswered,
              baseToken ? 1 : Number.POSITIVE_INFINITY,
            )),
          );
        }
        for (const batch of chunk(items, BATCH_SIZE)) {
          if (kind === "feedbacks") {
            await ctx.runMutation(upsertFeedbacksRef, { shopId, feedbacks: batch });
          } else {
            await ctx.runMutation(upsertQuestionsRef, { shopId, questions: batch });
          }
        }
        await clearWbRateLimitGuardForEndpoint(ctx, shopId, kind);
        await ctx.runMutation(logSyncRef, {
          shopId,
          endpoint: kind,
          status: "ok" as const,
          count: items.length,
        });
      } catch (e: any) {
        await logSyncFailure(ctx, shopId, kind, e);
      }
    }
  },
});
