"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { AuthGate } from "./AuthGate";

function OwnerCheck({ children }: { children: ReactNode }) {
  const org = useCurrentOrg();
  const router = useRouter();
  useEffect(() => {
    if (org && org.role !== "owner") router.replace("/");
  }, [org, router]);
  if (org === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Загрузка…
      </div>
    );
  }
  if (!org || org.role !== "owner") return null;
  return <>{children}</>;
}

export function OwnerGate({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <OwnerCheck>{children}</OwnerCheck>
    </AuthGate>
  );
}
