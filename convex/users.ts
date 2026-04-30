import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    // Не возвращаем internal/Convex Auth поля наружу
    return {
      _id: user._id,
      email: user.email ?? "",
      name: user.name ?? "",
      phone: user.phone ?? "",
      businessName: user.businessName ?? "",
      shopsCountWB: user.shopsCountWB ?? 0,
      shopsCountOzon: user.shopsCountOzon ?? 0,
      skuCount: user.skuCount ?? 0,
      status: (user.status === "approved" || user.status === "rejected") ? user.status : "pending" as const,
      isSystemAdmin: user.isSystemAdmin ?? false,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      rejectionReason: user.rejectionReason ?? null,
      createdAt: user.createdAt ?? 0,
      themePreference: user.themePreference ?? "system" as const,
      tavernMode: user.tavernMode ?? false,
      monthlyProfitGoal: user.monthlyProfitGoal ?? null,
    };
  },
});

export const updateThemePreference = mutation({
  args: {
    themePreference: v.union(
      v.literal("light"),
      v.literal("dark"),
      v.literal("system")
    ),
  },
  handler: async (ctx, { themePreference }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    await ctx.db.patch(userId, { themePreference });
  },
});

export const updateTavernMode = mutation({
  args: { tavernMode: v.boolean() },
  handler: async (ctx, { tavernMode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    await ctx.db.patch(userId, { tavernMode });
  },
});

export const updateMonthlyProfitGoal = mutation({
  args: { monthlyProfitGoal: v.union(v.number(), v.null()) },
  handler: async (ctx, { monthlyProfitGoal }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    if (monthlyProfitGoal === null) {
      await ctx.db.patch(userId, { monthlyProfitGoal: undefined });
    } else {
      await ctx.db.patch(userId, { monthlyProfitGoal });
    }
  },
});
