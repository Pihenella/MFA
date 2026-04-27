import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { tokensEqual, validatePassword } from "../../src/lib/auth-utils";

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

    const lookup = await ctx.runQuery(
      internal.auth.resetPassword.lookupResetToken,
      { token }
    );
    if (!lookup) throw new Error("Невалидный или истёкший токен");

    // Менять пароль через Convex Auth — frontend вызывает signIn("password",
    // {flow: "reset-verification", email, code: <reset-token>, newPassword})
    // ИЛИ мы здесь делаем удаление токена и возвращаем userId, а смена
    // пароля происходит через resetVerify ниже. В текущей реализации
    // используем второй подход — клиент обрабатывает это через signIn.
    await ctx.runMutation(internal.auth.resetPassword.consumeResetToken, {
      tokenRecordId: lookup.tokenRecordId,
    });
    return { ok: true, userId: lookup.userId };
  },
});
