import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const ACHIEVEMENT_KINDS = [
  "firstShop",
  "firstThousandSales",
  "monthlyPlanHit",
  "firstMillionProfit",
  "tenKSold",
  "zeroReturnsWeek",
  "firstReviewFiveStar",
  "storeAnniversary",
] as const;

export type AchievementKind = (typeof ACHIEVEMENT_KINDS)[number];

const kindValidator = v.union(
  v.literal("firstShop"),
  v.literal("firstThousandSales"),
  v.literal("monthlyPlanHit"),
  v.literal("firstMillionProfit"),
  v.literal("tenKSold"),
  v.literal("zeroReturnsWeek"),
  v.literal("firstReviewFiveStar"),
  v.literal("storeAnniversary"),
);

type RecordAchievementArgs = {
  userId: Id<"users">;
  kind: AchievementKind;
  payload?: unknown;
};

const AD_BONUS_PREFIX = "Оказание услуг «WB Продвижение»";
const TAX_RATE = 0.06;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function recordAchievementIfNew(
  ctx: Pick<MutationCtx, "db">,
  { userId, kind, payload }: RecordAchievementArgs,
): Promise<Id<"userAchievements"> | null> {
  const existing = await ctx.db
    .query("userAchievements")
    .withIndex("by_user_kind", (q) => q.eq("userId", userId).eq("kind", kind))
    .first();

  if (existing) return null;

  return await ctx.db.insert("userAchievements", {
    userId,
    kind,
    achievedAt: Date.now(),
    payload,
    seenAt: undefined,
  });
}

export const recordIfNew = internalMutation({
  args: {
    userId: v.id("users"),
    kind: kindValidator,
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await recordAchievementIfNew(ctx, args);
  },
});

export const newSinceLastSeen = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("userAchievements")
      .withIndex("by_user_unseen", (q) =>
        q.eq("userId", userId).eq("seenAt", undefined),
      )
      .collect();
  },
});

export const markSeen = mutation({
  args: { achievementId: v.id("userAchievements") },
  handler: async (ctx, { achievementId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const achievement = await ctx.db.get(achievementId);
    if (!achievement || achievement.userId !== userId) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(achievementId, { seenAt: Date.now() });
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const recordShopMilestones = internalMutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await recordShopMilestonesForShop(ctx, shopId);
  },
});

export async function recordShopMilestonesForShop(
  ctx: Pick<MutationCtx, "db">,
  shopId: Id<"shops">,
): Promise<void> {
  const ownerId = await getShopOwnerId(ctx, shopId);
  if (!ownerId) return;

  const [sales, financials, costs, feedbacks] = await Promise.all([
    ctx.db
      .query("sales")
      .withIndex("by_shop_date", (q) => q.eq("shopId", shopId))
      .collect(),
    ctx.db
      .query("financials")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect(),
    ctx.db
      .query("costs")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect(),
    ctx.db
      .query("feedbacks")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .collect(),
  ]);

  const soldUnits = sales
    .filter((sale) => !sale.isReturn)
    .reduce((sum, sale) => sum + sale.quantity, 0);

  if (soldUnits >= 1_000) {
    await recordAchievementIfNew(ctx, {
      userId: ownerId,
      kind: "firstThousandSales",
      payload: { shopId, soldUnits },
    });
  }

  if (soldUnits >= 10_000) {
    await recordAchievementIfNew(ctx, {
      userId: ownerId,
      kind: "tenKSold",
      payload: { shopId, soldUnits },
    });
  }

  if (feedbacks.some((feedback) => feedback.productValuation >= 5)) {
    await recordAchievementIfNew(ctx, {
      userId: ownerId,
      kind: "firstReviewFiveStar",
      payload: { shopId },
    });
  }

  const totalMetrics = calculateProfit(financials, costs);
  if (totalMetrics.profit >= 1_000_000) {
    await recordAchievementIfNew(ctx, {
      userId: ownerId,
      kind: "firstMillionProfit",
      payload: { shopId, actual: totalMetrics.profit },
    });
  }

  const user = await ctx.db.get(ownerId);
  const monthlyProfitGoal = user?.monthlyProfitGoal;
  if (monthlyProfitGoal && monthlyProfitGoal > 0) {
    const monthLabel = new Date().toISOString().slice(0, 7);
    const monthMetrics = calculateProfit(
      financials.filter((row) => financialDate(row).startsWith(monthLabel)),
      costs,
    );

    if (monthMetrics.profit >= monthlyProfitGoal) {
      await recordAchievementIfNew(ctx, {
        userId: ownerId,
        kind: "monthlyPlanHit",
        payload: {
          shopId,
          monthLabel,
          target: monthlyProfitGoal,
          actual: monthMetrics.profit,
        },
      });
    }
  }

  const weekStart = new Date(Date.now() - 7 * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const recentFinancials = financials.filter(
    (row) => financialDate(row) >= weekStart,
  );
  const recentMetrics = calculateProfit(recentFinancials, costs);
  if (recentMetrics.salesCount > 0 && recentMetrics.returnsCount === 0) {
    await recordAchievementIfNew(ctx, {
      userId: ownerId,
      kind: "zeroReturnsWeek",
      payload: { shopId, weekStart, salesCount: recentMetrics.salesCount },
    });
  }
}

export const recordStoreAnniversaries = internalMutation({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").collect();
    const now = new Date();
    const todayMonthDay = utcMonthDay(now);
    let recorded = 0;

    for (const shop of shops) {
      const createdAt = new Date(shop._creationTime);
      const years = now.getUTCFullYear() - createdAt.getUTCFullYear();
      if (years < 1 || utcMonthDay(createdAt) !== todayMonthDay) continue;

      const ownerId = await getShopOwnerId(ctx, shop._id);
      if (!ownerId) continue;

      const id = await recordAchievementIfNew(ctx, {
        userId: ownerId,
        kind: "storeAnniversary",
        payload: { shopId: shop._id, shopName: shop.name, years },
      });
      if (id) recorded++;
    }

    return recorded;
  },
});

async function getShopOwnerId(
  ctx: Pick<MutationCtx, "db">,
  shopId: Id<"shops">,
): Promise<Id<"users"> | null> {
  const shop = await ctx.db.get(shopId);
  if (!shop) return null;
  const org = await ctx.db.get(shop.orgId);
  return org?.ownerId ?? null;
}

function calculateProfit(
  financials: Doc<"financials">[],
  costs: Doc<"costs">[],
): { profit: number; salesCount: number; returnsCount: number } {
  const costMap = new Map<number, number>();
  for (const cost of costs) costMap.set(cost.nmId, cost.cost);

  const salesFin = financials.filter(
    (row) =>
      row.docTypeName === "Продажа" &&
      (row.retailAmount > 0 || (row.retailPrice ?? 0) > 0),
  );
  const returnsFin = financials.filter(
    (row) => row.docTypeName === "Возврат" && row.nmId > 0,
  );

  const salesSeller = salesFin.reduce(
    (sum, row) => sum + (row.retailPrice ?? row.retailAmount ?? 0),
    0,
  );
  const returnsSeller = returnsFin.reduce(
    (sum, row) => sum + Math.abs(row.retailPrice ?? row.retailAmount ?? 0),
    0,
  );
  const revenueSeller = salesSeller - returnsSeller;

  const forPaySales = salesFin.reduce(
    (sum, row) => sum + (row.ppvzForPay || 0),
    0,
  );
  const forPayReturns = returnsFin.reduce(
    (sum, row) => sum + Math.abs(row.ppvzForPay || 0),
    0,
  );
  const forPayTotal = forPaySales - forPayReturns;

  const salesByNm = new Map<number, number>();
  const returnsByNm = new Map<number, number>();
  for (const row of salesFin) {
    salesByNm.set(row.nmId, (salesByNm.get(row.nmId) ?? 0) + 1);
  }
  for (const row of returnsFin) {
    returnsByNm.set(row.nmId, (returnsByNm.get(row.nmId) ?? 0) + 1);
  }

  let cogs = 0;
  const allNmIds = new Set([...salesByNm.keys(), ...returnsByNm.keys()]);
  for (const nmId of allNmIds) {
    const sold = salesByNm.get(nmId) ?? 0;
    const returned = returnsByNm.get(nmId) ?? 0;
    cogs += (costMap.get(nmId) ?? 0) * (sold - returned);
  }

  const commission = revenueSeller - forPayTotal;
  const logistics = financials.reduce((sum, row) => sum + (row.deliveryRub ?? 0), 0);
  const storage = financials.reduce((sum, row) => sum + (row.storageAmount || 0), 0);
  const acceptance = financials.reduce((sum, row) => sum + (row.acceptance || 0), 0);
  const penalties = financials.reduce((sum, row) => sum + (row.penalty || 0), 0);
  const compensation = financials.reduce(
    (sum, row) => sum + (row.additionalPayment || 0),
    0,
  );

  let ads = 0;
  let otherDeductions = 0;
  for (const row of financials) {
    const deduction = row.deductionAmount || 0;
    if (deduction === 0) continue;
    if (row.bonusTypeName?.startsWith(AD_BONUS_PREFIX)) {
      ads += deduction;
    } else {
      otherDeductions += deduction;
    }
  }

  const grossProfit = revenueSeller - cogs;
  const mpExpenses =
    commission +
    logistics +
    storage +
    acceptance +
    penalties +
    ads +
    otherDeductions -
    compensation;
  const profitBeforeTax = grossProfit - mpExpenses;
  const tax = profitBeforeTax > 0 ? profitBeforeTax * TAX_RATE : 0;

  return {
    profit: profitBeforeTax - tax,
    salesCount: salesFin.length,
    returnsCount: returnsFin.length,
  };
}

function financialDate(row: Doc<"financials">): string {
  return row.rrDt ?? row.dateFrom ?? "";
}

function utcMonthDay(date: Date): string {
  return date.toISOString().slice(5, 10);
}
