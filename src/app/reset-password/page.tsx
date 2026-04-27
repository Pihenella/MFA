"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAction } from "convex/react";
import { Button } from "@/components/ui/button";
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
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Ссылка некорректна</h1>
          <p className="text-gray-600">Запросите новую ссылку для сброса пароля.</p>
          <Link href="/forgot-password" className="text-violet-600 hover:underline">К сбросу</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Новый пароль</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Новый пароль</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          <div className="space-y-1">
            <Label>Повторите пароль</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Сохраняем…" : "Сменить пароль"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
