import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import type { FunctionReference } from "convex/server";
import {
  generateRandomToken,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "../src/lib/auth-utils";

// Pre-resolved ref обходит TS2589 (deep `internal` type инстанциация
// в auth-callback контексте). Convex принимает строковые refs формата
// "<module>:<func>" для модулей в подпапках.
const sendVerifyRef = "email/actions:sendVerify" as unknown as FunctionReference<
  "action",
  "internal",
  { email: string; name: string; verifyUrl: string }
>;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = normalizeEmail((params.email as string) ?? "");
        const emailCheck = validateEmail(email);
        if (!emailCheck.ok) throw new Error(emailCheck.error);

        const name = String(params.name ?? "").trim();
        if (name.length < 2) throw new Error("Имя обязательно (мин. 2 символа)");

        const phone = String(params.phone ?? "").trim();
        if (phone.length < 5) throw new Error("Телефон обязателен");

        const businessName = String(params.businessName ?? "").trim();
        if (businessName.length < 1)
          throw new Error("Название бизнеса обязательно");

        const shopsCountWB = Number(params.shopsCountWB ?? 0);
        const shopsCountOzon = Number(params.shopsCountOzon ?? 0);
        const skuCount = Number(params.skuCount ?? 0);
        if (
          !Number.isFinite(shopsCountWB) ||
          shopsCountWB < 0 ||
          !Number.isFinite(shopsCountOzon) ||
          shopsCountOzon < 0 ||
          !Number.isFinite(skuCount) ||
          skuCount < 0
        ) {
          throw new Error("Числа магазинов и SKU не могут быть отрицательными");
        }

        return {
          email,
          name,
          phone,
          businessName,
          shopsCountWB,
          shopsCountOzon,
          skuCount,
          status: "pending" as const,
          isSystemAdmin: false,
          createdAt: Date.now(),
        };
      },
      validatePasswordRequirements(password) {
        const result = validatePassword(password);
        if (!result.ok) throw new Error(result.error);
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId, type }) {
      // Только для нового signUp (не для login существующего юзера, не для reset)
      if (existingUserId !== null) return;
      if (type !== "credentials") return;

      const user = await ctx.db.get(userId);
      if (!user || user.emailVerificationTime) return;
      if (!user.email) return;

      const token = generateRandomToken(32);
      await ctx.db.insert("verifyTokens", {
        userId,
        token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });

      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      const verifyUrl = `${appUrl}/verify-email?token=${token}`;
      await ctx.scheduler.runAfter(0, sendVerifyRef, {
        email: user.email,
        name: user.name ?? "",
        verifyUrl,
      });
    },
  },
});
