import { action, internalMutation } from "../_generated/server";
import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import {
  generateRandomToken,
  normalizeEmail,
  validateEmail,
} from "../../src/lib/auth-utils";
import { sendResetRef } from "../lib/emailRefs";

// Pre-resolved ref обходит TS2589
const createResetTokenRef = "auth/forgotPassword:createResetToken" as unknown as FunctionReference<
  "mutation",
  "internal",
  { email: string },
  { email: string; name: string; token: string } | null
>;

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
    const result = await ctx.runMutation(createResetTokenRef, {
      email: normalized,
    });
    if (result) {
      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      await ctx.runAction(sendResetRef, {
        email: result.email,
        name: result.name,
        resetUrl: `${appUrl}/reset-password?token=${result.token}`,
      });
    }
    return { ok: true };
  },
});
