import { action, internalMutation, internalQuery } from "../_generated/server";
import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { tokensEqual, validatePassword } from "../../src/lib/auth-utils";
import {
  createAccount,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";

// Pre-resolved refs обходят TS2589
const lookupResetTokenRef = "auth/resetPassword:lookupResetToken" as unknown as FunctionReference<
  "query",
  "internal",
  { token: string },
  {
    tokenRecordId: Id<"resetTokens">;
    user: Doc<"users">;
  } | null
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
      user,
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

    const { user } = lookup;
    const email = user.email ?? "";
    if (!email) throw new Error("У юзера нет email");

    // Сначала пытаемся обновить креды существующего authAccount.
    try {
      await modifyAccountCredentials(ctx, {
        provider: "password",
        account: { id: email, secret: newPassword },
      });
    } catch {
      // authAccount нет (legacy-юзер из A.1 миграции) — создаём account
      // и связываем с существующим user через email-link.
      const profile: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(user)) {
        if (k === "_id" || k === "_creationTime") continue;
        profile[k] = val;
      }
      await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: newPassword },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profile: profile as any,
        shouldLinkViaEmail: true,
      });
    }

    await ctx.runMutation(consumeResetTokenRef, {
      tokenRecordId: lookup.tokenRecordId,
    });
    return { ok: true, userId: user._id };
  },
});
