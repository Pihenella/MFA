"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { FinlyAuthLayout } from "@/components/finly/FinlyAuthLayout";
import { FinlyButton } from "@/components/finly/FinlyButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordRef } from "@/lib/convex-refs";

export default function ForgotPasswordPage() {
  const forgotPassword = useAction(forgotPasswordRef);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FinlyAuthLayout
      mascotPose="empty-data"
      title="Вернуть доступ"
      subtitle="Укажите email, и мы отправим ссылку для сброса пароля"
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Проверьте почту
          </h2>
          <p className="text-muted-foreground">
            Если такой email существует — письмо со ссылкой отправлено.
            Проверьте почту в течение часа.
          </p>
          <Link href="/login" className="text-sm text-orange-flame hover:underline">
            Назад ко входу
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="mb-2 hidden font-display text-2xl font-semibold text-foreground md:block">
            Сброс пароля
          </h2>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <FinlyButton type="submit" disabled={submitting} className="w-full">
            {submitting ? "Отправляем…" : "Отправить ссылку"}
          </FinlyButton>
          <Link
            href="/login"
            className="block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Вспомнили? Войти
          </Link>
        </form>
      )}
    </FinlyAuthLayout>
  );
}
