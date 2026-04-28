"use client";
import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Обёртка для приватных страниц: показывает loader пока юзер undefined,
 * редирект на /login при null, status-gate (pending/rejected), content при approved.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user === null && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    if (!user) return;
    if (user.status === "pending" && pathname !== "/pending-approval") {
      router.replace("/pending-approval");
      return;
    }
    if (user.status === "rejected" && pathname !== "/rejected") {
      router.replace("/rejected");
      return;
    }
  }, [user, pathname, router]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  if (user === null) return null;
  if (user.status !== "approved") return null;
  return <>{children}</>;
}
