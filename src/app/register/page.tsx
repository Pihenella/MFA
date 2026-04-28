"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { FinlyAuthLayout } from "@/components/finly/FinlyAuthLayout";
import { FinlyButton } from "@/components/finly/FinlyButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    businessName: "",
    shopsCountWB: "0",
    shopsCountOzon: "0",
    skuCount: "0",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn("password", {
        flow: "signUp",
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        businessName: form.businessName,
        shopsCountWB: Number(form.shopsCountWB),
        shopsCountOzon: Number(form.shopsCountOzon),
        skuCount: Number(form.skuCount),
      });
      router.push("/pending-approval");
    } catch (err) {
      setError((err as Error).message || "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FinlyAuthLayout
      mascotPose="hero"
      title="Стать Исследователем"
      subtitle="Создайте аккаунт и подключите магазины"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <h2 className="mb-2 hidden font-display text-2xl font-semibold text-foreground md:block">
          Регистрация
        </h2>
        <Field label="Email *">
          <Input
            type="email"
            value={form.email}
            onChange={update("email")}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Пароль * (мин. 8 символов, цифра + буква)">
          <Input
            type="password"
            value={form.password}
            onChange={update("password")}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </Field>
        <Field label="Имя *">
          <Input value={form.name} onChange={update("name")} required minLength={2} />
        </Field>
        <Field label="Телефон *">
          <Input
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            required
            autoComplete="tel"
          />
        </Field>
        <Field label="Название бизнеса *">
          <Input
            value={form.businessName}
            onChange={update("businessName")}
            required
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Магазинов WB">
            <Input
              type="number"
              min={0}
              value={form.shopsCountWB}
              onChange={update("shopsCountWB")}
            />
          </Field>
          <Field label="Магазинов Ozon">
            <Input
              type="number"
              min={0}
              value={form.shopsCountOzon}
              onChange={update("shopsCountOzon")}
            />
          </Field>
          <Field label="SKU">
            <Input
              type="number"
              min={0}
              value={form.skuCount}
              onChange={update("skuCount")}
            />
          </Field>
        </div>
        {error ? <p className="text-sm text-rune-danger">{error}</p> : null}
        <FinlyButton type="submit" disabled={submitting} className="w-full">
          {submitting ? "Создаём аккаунт…" : "Создать аккаунт"}
        </FinlyButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-orange-flame hover:underline">
          Войти
        </Link>
      </p>
    </FinlyAuthLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
