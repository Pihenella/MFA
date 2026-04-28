"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { orgInviteByTokenRef, orgInviteAcceptRef } from "@/lib/convex-refs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageProps = { params: Promise<{ token: string }> };

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Приглашение не найдено",
  expired: "Приглашение истекло",
  revoked: "Приглашение было отозвано",
  already_accepted: "Приглашение уже принято",
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
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Загрузка…
      </div>
    );
  }

  if (!inviteResult.ok) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-3">
        <h1 className="text-xl font-bold">{ERROR_MESSAGES[inviteResult.error]}</h1>
        <p className="text-sm text-gray-600">
          Попросите owner-а отправить приглашение заново.
        </p>
        <Link href="/login" className="text-violet-600 hover:underline text-sm">
          На главную
        </Link>
      </div>
    );
  }

  const { email: inviteEmail, orgName, inviterName } = inviteResult.invite;

  if (me && me.email !== inviteEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-3">
        <h1 className="text-xl font-bold">Этот инвайт для другого email</h1>
        <p className="text-sm text-gray-600">
          Приглашение отправлено на <strong>{inviteEmail}</strong>, но вы вошли как{" "}
          <strong>{me.email}</strong>. Выйдите и откройте ссылку под нужным
          аккаунтом.
        </p>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            router.refresh();
          }}
        >
          Выйти
        </Button>
      </div>
    );
  }

  if (me && me.email === inviteEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-3">
        <h1 className="text-xl font-bold">Приглашение в {orgName}</h1>
        <p className="text-sm text-gray-600">
          {inviterName} приглашает вас присоединиться к организации{" "}
          <strong>{orgName}</strong>.
        </p>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button
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
        </Button>
      </div>
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
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold">Приглашение в {orgName}</h1>
        <p className="text-sm text-gray-600">
          {inviterName} зовёт вас в команду. Email: <strong>{inviteEmail}</strong>
        </p>
      </div>

      <details className="border border-gray-200 rounded-md p-4 space-y-3" open>
        <summary className="font-medium cursor-pointer">
          У меня нет аккаунта — создать
        </summary>
        <form onSubmit={handleSignUp} className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={inviteEmail} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-1">
            <Label>Пароль</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1">
            <Label>Имя</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Телефон</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Название бизнеса (опционально)</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Создаём…" : "Создать аккаунт и принять"}
          </Button>
        </form>
      </details>

      <details className="border border-gray-200 rounded-md p-4 space-y-3">
        <summary className="font-medium cursor-pointer">
          У меня уже есть аккаунт — войти
        </summary>
        <form onSubmit={handleSignIn} className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={inviteEmail} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-1">
            <Label>Пароль</Label>
            <Input
              type="password"
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Входим…" : "Войти и принять"}
          </Button>
        </form>
      </details>

      {error && <div className="text-sm text-red-600 text-center">{error}</div>}
    </div>
  );
}
