"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AuthGate } from "./AuthGate";

function AdminCheck({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  useEffect(() => {
    if (isAdmin === false) router.replace("/");
  }, [isAdmin, router]);
  if (isAdmin === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Загрузка…
      </div>
    );
  }
  if (!isAdmin) return null;
  return <>{children}</>;
}

export function AdminGate({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AdminCheck>{children}</AdminCheck>
    </AuthGate>
  );
}
