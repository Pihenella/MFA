"use client";
import { ReactNode } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Обёртка для приватных страниц: показывает loader пока юзер undefined,
 * редирект на /login при null, content при наличии user.
 * Реальная блокировка по статусу (pending/rejected) — в Phase 3 (Task 14).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const user = useCurrentUser();

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Загрузка…
      </div>
    );
  }

  if (user === null) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return <>{children}</>;
}
