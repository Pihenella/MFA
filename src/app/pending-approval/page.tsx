"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  const user = useCurrentUser();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (user === undefined) {
    return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Загрузка…</div>;
  }
  if (user === null) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-5">
        <h1 className="text-2xl font-bold">Заявка на рассмотрении</h1>

        {!user.emailVerifiedAt && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 text-left">
            <strong>Подтвердите email.</strong> Письмо отправлено на <code>{user.email}</code>.
            Проверьте почту и перейдите по ссылке из письма.
          </div>
        )}

        <p className="text-gray-600">
          Здравствуйте, {user.name}! Мы получили вашу заявку и проверим её в ближайшее время.
          После одобрения админом вы получите письмо и сможете зайти в дашборд.
        </p>

        <Button variant="outline" onClick={handleLogout}>Выйти</Button>
      </div>
    </div>
  );
}
