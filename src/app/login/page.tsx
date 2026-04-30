"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { FinlyAuthLayout } from "@/components/finly/FinlyAuthLayout";
import { FinlyButton } from "@/components/finly/FinlyButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/");
    } catch (err) {
      setError((err as Error).message || "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FinlyAuthLayout
      mascotPose="hero"
      title="Вход в Лигу"
      subtitle="Присоединяйтесь к исследователям маркетплейсов"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="mb-2 hidden font-display text-2xl font-semibold text-foreground md:block">
          Войти
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
        <div className="space-y-1">
          <Label>Пароль</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error ? <p className="text-sm text-rune-danger">{error}</p> : null}
        <FinlyButton type="submit" disabled={submitting} className="w-full">
          {submitting ? "Вход…" : "Войти"}
        </FinlyButton>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-orange-flame hover:underline">
            Забыли пароль?
          </Link>
          {" · "}
          <Link href="/register" className="text-orange-flame hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </FinlyAuthLayout>
  );
}
