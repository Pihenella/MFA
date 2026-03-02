import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { chunk, BATCH_SIZE, fetchWithRetry, assertOk } from "./helpers";

export const upsertFeedbacks = internalMutation({
  args: { shopId: v.id("shops"), feedbacks: v.array(v.any()) },
  handler: async (ctx, { shopId, feedbacks }) => {
    for (const f of feedbacks) {
      const feedbackId = String(f.id ?? f.feedbackId ?? "");
      const existing = await ctx.db
        .query("feedbacks")
        .withIndex("by_feedback_id", (q) => q.eq("feedbackId", feedbackId))
        .first();
      const row = {
        shopId,
        feedbackId,
        nmId: f.nmId ?? f.productDetails?.nmId ?? 0,
        text: f.text ?? "",
        productValuation: f.productValuation ?? 0,
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
        .withIndex("by_question_id", (qb) => qb.eq("questionId", questionId))
        .first();
      const row = {
        shopId,
        questionId,
        nmId: q.nmId ?? q.productDetails?.nmId ?? 0,
        text: q.text ?? "",
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    // Feedbacks
    try {
      let skip = 0;
      let totalCount = 0;
      while (true) {
        const res = await fetchWithRetry(
          `https://feedbacks-api.wildberries.ru/api/v1/feedbacks?isAnswered=false&take=5000&skip=${skip}&dateFrom=${thirtyDaysAgo}`,
          { headers },
        );
        await assertOk(res);
        const data = await res.json();
        const feedbacks = data.data?.feedbacks ?? [];
        if (!Array.isArray(feedbacks) || feedbacks.length === 0) break;
        totalCount += feedbacks.length;
        const batches = chunk(feedbacks, BATCH_SIZE);
        for (const batch of batches) {
          await ctx.runMutation(internal.sync.syncFeedbacks.upsertFeedbacks, { shopId, feedbacks: batch });
        }
        if (feedbacks.length < 5000) break;
        skip += feedbacks.length;
      }
      // Also fetch answered
      const answeredRes = await fetchWithRetry(
        `https://feedbacks-api.wildberries.ru/api/v1/feedbacks?isAnswered=true&take=5000&skip=0&dateFrom=${thirtyDaysAgo}`,
        { headers },
      );
      if (answeredRes.ok) {
        const answeredData = await answeredRes.json();
        const answered = answeredData.data?.feedbacks ?? [];
        if (Array.isArray(answered) && answered.length > 0) {
          totalCount += answered.length;
          const batches = chunk(answered, BATCH_SIZE);
          for (const batch of batches) {
            await ctx.runMutation(internal.sync.syncFeedbacks.upsertFeedbacks, { shopId, feedbacks: batch });
          }
        }
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "feedbacks", status: "ok" as const, count: totalCount,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "feedbacks", status: "error" as const, error: e.message,
      });
    }

    // Questions
    try {
      let totalCount = 0;
      const res = await fetchWithRetry(
        `https://feedbacks-api.wildberries.ru/api/v1/questions?isAnswered=false&take=5000&skip=0&dateFrom=${thirtyDaysAgo}`,
        { headers },
      );
      await assertOk(res);
      const data = await res.json();
      const questions = data.data?.questions ?? [];
      if (Array.isArray(questions) && questions.length > 0) {
        totalCount += questions.length;
        const batches = chunk(questions, BATCH_SIZE);
        for (const batch of batches) {
          await ctx.runMutation(internal.sync.syncFeedbacks.upsertQuestions, { shopId, questions: batch });
        }
      }
      // Answered questions
      const answeredRes = await fetchWithRetry(
        `https://feedbacks-api.wildberries.ru/api/v1/questions?isAnswered=true&take=5000&skip=0&dateFrom=${thirtyDaysAgo}`,
        { headers },
      );
      if (answeredRes.ok) {
        const answeredData = await answeredRes.json();
        const answered = answeredData.data?.questions ?? [];
        if (Array.isArray(answered) && answered.length > 0) {
          totalCount += answered.length;
          const batches = chunk(answered, BATCH_SIZE);
          for (const batch of batches) {
            await ctx.runMutation(internal.sync.syncFeedbacks.upsertQuestions, { shopId, questions: batch });
          }
        }
      }
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "questions", status: "ok" as const, count: totalCount,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.sync.helpers.logSync, {
        shopId, endpoint: "questions", status: "error" as const, error: e.message,
      });
    }
  },
});
