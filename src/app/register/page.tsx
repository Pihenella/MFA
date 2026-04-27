"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Регистрация в MFA</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Email *">
            <Input type="email" value={form.email} onChange={update("email")} required autoComplete="email" />
          </Field>
          <Field label="Пароль * (мин. 8 символов, цифра + буква)">
            <Input type="password" value={form.password} onChange={update("password")} required autoComplete="new-password" minLength={8} />
          </Field>
          <Field label="Имя *">
            <Input value={form.name} onChange={update("name")} required minLength={2} />
          </Field>
          <Field label="Телефон *">
            <Input type="tel" value={form.phone} onChange={update("phone")} required autoComplete="tel" />
          </Field>
          <Field label="Название бизнеса *">
            <Input value={form.businessName} onChange={update("businessName")} required />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Магазинов WB">
              <Input type="number" min={0} value={form.shopsCountWB} onChange={update("shopsCountWB")} />
            </Field>
            <Field label="Магазинов Ozon">
              <Input type="number" min={0} value={form.shopsCountOzon} onChange={update("shopsCountOzon")} />
            </Field>
            <Field label="Количество SKU">
              <Input type="number" min={0} value={form.skuCount} onChange={update("skuCount")} />
            </Field>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Создаём аккаунт…" : "Создать аккаунт"}
          </Button>
        </form>
        <div className="text-sm text-center text-gray-600">
          Уже есть аккаунт? <Link href="/login" className="hover:underline text-violet-600">Войти</Link>
        </div>
      </div>
    </div>
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
