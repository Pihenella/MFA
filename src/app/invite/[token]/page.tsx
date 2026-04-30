"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { FinlyAuthLayout } from "@/components/finly/FinlyAuthLayout";
import { FinlyButton } from "@/components/finly/FinlyButton";
import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orgInviteAcceptRef, orgInviteByTokenRef } from "@/lib/convex-refs";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type PageProps = { params: Promise<{ token: string }> };

const ERROR_STATES = {
  not_found: {
    pose: "empty-shops" as const,
    title: "Приглашение не найдено",
    body: "Попросите owner-а отправить приглашение заново.",
  },
  expired: {
    pose: "empty-shops" as const,
    title: "Приглашение истекло",
    body: "Срок действия ссылки закончился. Попросите owner-а отправить новое приглашение.",
  },
  revoked: {
    pose: "not-found" as const,
    title: "Приглашение отозвано",
    body: "Эта ссылка больше не открывает дверь в команду.",
  },
  already_accepted: {
    pose: "empty-data" as const,
    title: "Это приглашение уже использовано",
    body: "Похоже, команда уже пополнилась. Можно вернуться на главную.",
  },
};

export default function InvitePage({ params }: PageProps) {
  const { token } = use(params);
  const inviteResult = useQuery(orgInviteByTokenRef, { token });
  const me = useCurrentUser();
  const router = useRouter();
  const acceptInvite = useMutation(orgInviteAcceptRef);
  const { signIn, signOut } = useAuthActions();

  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (inviteResult === undefined || me === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  if (!inviteResult.ok) {
    const state = ERROR_STATES[inviteResult.error];
    return (
      <FinlyEmptyState
        pose={state.pose}
        title={state.title}
        body={state.body}
        cta={{ label: "На главную", href: "/" }}
      />
    );
  }

  const { email: inviteEmail, orgName, inviterName } = inviteResult.invite;

  if (me && me.email !== inviteEmail) {
    return (
      <FinlyEmptyState
        pose="not-found"
        title="Не тот email"
        body={`Это приглашение для ${inviteEmail}, а сейчас вы вошли как ${me.email}. Выйдите и откройте ссылку под нужным аккаунтом.`}
        cta={{
          label: "Выйти",
          onClick: async () => {
            await signOut();
            router.refresh();
          },
        }}
      />
    );
  }

  if (me && me.email === inviteEmail) {
    return (
      <FinlyAuthLayout
        mascotPose="hero"
        title="Приглашение в Лигу"
        subtitle={`${inviterName} приглашает вас в ${orgName}`}
      >
        <div className="space-y-4 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Приглашение в {orgName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Присоединиться как <strong>{inviteEmail}</strong>.
          </p>
          {error ? <p className="text-sm text-rune-danger">{error}</p> : null}
          <FinlyButton
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              setError(null);
              try {
                await acceptInvite({ token });
                router.push("/");
              } catch (err) {
                setError((err as Error).message || "Ошибка");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Принимаем…" : "Принять приглашение"}
          </FinlyButton>
        </div>
      </FinlyAuthLayout>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn("password", {
        email: inviteEmail,
        password,
        name,
        phone,
        businessName: businessName || "",
        flow: "signUp",
      });
      await acceptInvite({ token });
      router.push("/");
    } catch (err) {
      setError((err as Error).message || "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn("password", {
        email: inviteEmail,
        password: signInPassword,
        flow: "signIn",
      });
      await acceptInvite({ token });
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
      title="Приглашение в Лигу"
      subtitle={`${inviterName} зовёт вас в команду ${orgName}`}
    >
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Приглашение в {orgName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email: <strong>{inviteEmail}</strong>
          </p>
        </div>

        <details className="space-y-3 rounded-frame border border-border bg-card p-4" open>
          <summary className="cursor-pointer font-medium text-foreground">
            У меня нет аккаунта — создать
          </summary>
          <form onSubmit={handleSignUp} className="space-y-3 pt-2">
            <Field label="Email">
              <Input value={inviteEmail} readOnly className="bg-muted" />
            </Field>
            <Field label="Пароль">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field label="Имя">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Телефон">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </Field>
            <Field label="Название бизнеса (опционально)">
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </Field>
            <FinlyButton type="submit" disabled={submitting} className="w-full">
              {submitting ? "Создаём…" : "Создать аккаунт и принять"}
            </FinlyButton>
          </form>
        </details>

        <details className="space-y-3 rounded-frame border border-border bg-card p-4">
          <summary className="cursor-pointer font-medium text-foreground">
            У меня уже есть аккаунт — войти
          </summary>
          <form onSubmit={handleSignIn} className="space-y-3 pt-2">
            <Field label="Email">
              <Input value={inviteEmail} readOnly className="bg-muted" />
            </Field>
            <Field label="Пароль">
              <Input
                type="password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                required
              />
            </Field>
            <FinlyButton type="submit" disabled={submitting} className="w-full">
              {submitting ? "Входим…" : "Войти и принять"}
            </FinlyButton>
          </form>
        </details>

        {error ? <p className="text-center text-sm text-rune-danger">{error}</p> : null}
      </div>
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
