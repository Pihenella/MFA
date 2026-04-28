"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { FinlyAuthLayout } from "@/components/finly/FinlyAuthLayout";
import { FinlyButton } from "@/components/finly/FinlyButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordInner() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Naked Convex API call — `auth/resetPassword:resetPassword` action
  // валидирует токен + потребляет его. После успеха редиректим на /login,
  // юзер вводит новый пароль уже на /login обычным flow.
  const resetPassword = useAction(
    "auth/resetPassword:resetPassword" as unknown as import("convex/server").FunctionReference<
      "action",
      "public",
      { token: string; newPassword: string },
      { ok: true; userId: import("../../../convex/_generated/dataModel").Id<"users"> }
    >
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Минимум 8 символов");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword: password });
      router.push("/login?reset=ok");
    } catch (err) {
      setError((err as Error).message || "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <FinlyAuthLayout
        mascotPose="empty-data"
        title="Ссылка некорректна"
        subtitle="Запросите новую ссылку для сброса пароля"
      >
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            В этой ссылке нет токена восстановления.
          </p>
          <Link
            href="/forgot-password"
            className="text-sm text-orange-flame hover:underline"
          >
            К сбросу пароля
          </Link>
        </div>
      </FinlyAuthLayout>
    );
  }

  return (
    <FinlyAuthLayout
      mascotPose="empty-data"
      title="Новый пароль"
      subtitle="Придумайте новый ключ к карте Finly"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="mb-2 hidden font-display text-2xl font-semibold text-foreground md:block">
          Сменить пароль
        </h2>
        <div className="space-y-1">
          <Label>Новый пароль</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <Label>Повторите пароль</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {error ? <p className="text-sm text-rune-danger">{error}</p> : null}
        <FinlyButton type="submit" disabled={submitting} className="w-full">
          {submitting ? "Сохраняем…" : "Сменить пароль"}
        </FinlyButton>
      </form>
    </FinlyAuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
