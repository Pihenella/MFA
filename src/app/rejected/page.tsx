"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";

export default function RejectedPage() {
  const user = useCurrentUser();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (user === undefined) return null;
  if (user === null) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-5">
        <h1 className="text-2xl font-bold text-red-600">Заявка отклонена</h1>
        <p className="text-gray-600">
          К сожалению, ваша заявка не была одобрена.
        </p>
        {user.status === "rejected" && user.rejectionReason && (
          <p className="text-sm text-gray-500 italic">
            Причина: {user.rejectionReason}
          </p>
        )}
        <p className="text-sm text-gray-500">
          Связь с поддержкой: <a href="https://t.me/Virtuozick" className="underline">@Virtuozick</a>
        </p>
        <Button variant="outline" onClick={handleLogout}>Выйти</Button>
      </div>
    </div>
  );
}
