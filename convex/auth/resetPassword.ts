import { action, internalMutation, internalQuery } from "../_generated/server";
import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { tokensEqual, validatePassword } from "../../src/lib/auth-utils";

// Pre-resolved refs обходят TS2589
const lookupResetTokenRef = "auth/resetPassword:lookupResetToken" as unknown as FunctionReference<
  "query",
  "internal",
  { token: string },
  { tokenRecordId: Id<"resetTokens">; userId: Id<"users">; email: string } | null
>;
const consumeResetTokenRef = "auth/resetPassword:consumeResetToken" as unknown as FunctionReference<
  "mutation",
  "internal",
  { tokenRecordId: Id<"resetTokens"> }
>;

export const lookupResetToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const records = await ctx.db
      .query("resetTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .collect();
    const record = records.find((r) => tokensEqual(r.token, token));
    if (!record) return null;
    if (record.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(record.userId);
    if (!user) return null;
    return {
      tokenRecordId: record._id,
      userId: user._id,
      email: user.email ?? "",
    };
  },
});

export const consumeResetToken = internalMutation({
  args: { tokenRecordId: v.id("resetTokens") },
  handler: async (ctx, { tokenRecordId }) => {
    await ctx.db.delete(tokenRecordId);
  },
});

export const resetPassword = action({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (
    ctx,
    { token, newPassword }
  ): Promise<{ ok: true; userId: Id<"users"> }> => {
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.ok) throw new Error(pwCheck.error);

    const lookup = await ctx.runQuery(lookupResetTokenRef, { token });
    if (!lookup) throw new Error("Невалидный или истёкший токен");

    // Смена пароля идёт через Convex Auth signIn("password",
    // {flow: "reset-verification", email, code: <token>, newPassword}) на
    // клиенте. Здесь только освобождаем reset-token, чтобы он не мог быть
    // переиспользован.
    await ctx.runMutation(consumeResetTokenRef, {
      tokenRecordId: lookup.tokenRecordId,
    });
    return { ok: true, userId: lookup.userId };
  },
});
