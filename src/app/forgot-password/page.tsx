"use client";
import { useState } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { forgotPasswordRef } from "@/lib/convex-refs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Сброс пароля</h1>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-gray-700">
              Если такой email существует — письмо со ссылкой отправлено.
              Проверьте почту в течение часа.
            </p>
            <Link href="/login" className="text-violet-600 hover:underline text-sm">
              Назад ко входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Отправляем…" : "Отправить ссылку"}
            </Button>
            <Link href="/login" className="block text-center text-sm text-gray-600 hover:underline">
              Вспомнили? Войти
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
