"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Обёртка для приватных страниц: показывает loader пока юзер undefined,
 * редирект на /login при null, status-gate (pending/rejected), content при approved.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const auth = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (user === undefined && !auth.isLoading && !auth.isAuthenticated && pathname !== "/login") {
      router.replace("/login");
      return;
    }
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
  }, [auth.isAuthenticated, auth.isLoading, user, pathname, router]);

  useEffect(() => {
    if (user !== undefined) {
      setShowRecovery(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(`finly-auth-reload:${pathname}`);
      }
      return;
    }

    const timer = window.setTimeout(() => setShowRecovery(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [pathname, user]);

  useEffect(() => {
    if (!showRecovery || user !== undefined || typeof window === "undefined") return;
    const key = `finly-auth-reload:${pathname}`;
    if (window.sessionStorage.getItem(key) === "done") return;
    window.sessionStorage.setItem(key, "done");
    window.location.reload();
  }, [pathname, showRecovery, user]);

  const resetSession = async () => {
    if (typeof window === "undefined") return;
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("__convexAuth")) {
        window.localStorage.removeItem(key);
      }
    }
    try {
      await fetch("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "auth:signOut", args: {} }),
      });
    } finally {
      window.location.href = "/login";
    }
  };

  if (user === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <div className="max-w-md space-y-3 text-center">
          <div>Загрузка…</div>
          {showRecovery && (
            <div className="space-y-3 rounded-frame border border-border bg-card p-4 text-sm">
              <p>
                Сессия загружается дольше обычного. Можно обновить страницу или войти заново.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-foreground hover:bg-muted"
                  onClick={() => window.location.reload()}
                >
                  Обновить
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-foreground hover:bg-muted"
                  onClick={() => void resetSession()}
                >
                  Войти заново
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (user === null) return null;
  if (user.status !== "approved") return null;
  return <>{children}</>;
}
