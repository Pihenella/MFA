import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import {
  generateRandomToken,
  normalizeEmail,
  validateEmail,
} from "../../src/lib/auth-utils";

export const createResetToken = internalMutation({
  args: { email: v.string() },
  handler: async (
    ctx,
    { email }
  ): Promise<{ email: string; name: string; token: string } | null> => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) return null;
    const token = generateRandomToken(32);
    await ctx.db.insert("resetTokens", {
      userId: user._id,
      token,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
    return { email: user.email ?? "", name: user.name ?? "", token };
  },
});

export const forgotPassword = action({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<{ ok: true }> => {
    const normalized = normalizeEmail(email);
    if (!validateEmail(normalized).ok) {
      return { ok: true };
    }
    const result = await ctx.runMutation(
      internal.auth.forgotPassword.createResetToken,
      { email: normalized }
    );
    if (result) {
      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      await ctx.runAction(internal.email.actions.sendReset, {
        email: result.email,
        name: result.name,
        resetUrl: `${appUrl}/reset-password?token=${result.token}`,
      });
    }
    return { ok: true };
  },
});
