import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { tokensEqual } from "../../src/lib/auth-utils";

export const verifyEmail = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const records = await ctx.db
      .query("verifyTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .collect();
    const record = records.find((r) => tokensEqual(r.token, token));
    if (!record) throw new Error("Невалидный токен");
    if (record.expiresAt < Date.now()) {
      await ctx.db.delete(record._id);
      throw new Error("Токен истёк, запросите подтверждение заново");
    }
    const user = await ctx.db.get(record.userId);
    if (!user) {
      await ctx.db.delete(record._id);
      throw new Error("Пользователь не найден");
    }
    if (user.emailVerifiedAt) {
      await ctx.db.delete(record._id);
      return { ok: true, alreadyVerified: true };
    }
    const now = Date.now();
    await ctx.db.patch(user._id, {
      emailVerifiedAt: now,
      emailVerificationTime: now,
    });
    await ctx.db.delete(record._id);
    return { ok: true, alreadyVerified: false };
  },
});
