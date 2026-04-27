"use client";
import { useQuery } from "convex/react";
import { orgListMineRef } from "@/lib/convex-refs";

export type CurrentOrg = {
  orgId: import("../../convex/_generated/dataModel").Id<"organizations">;
  name: string;
  role: "owner" | "member";
  ownerId: import("../../convex/_generated/dataModel").Id<"users">;
};

/**
 * Возвращает первую orgId юзера (для MVP при единственной org на юзера).
 * undefined — loading; null — нет org-ы (новый юзер до approval).
 */
export function useCurrentOrg(): CurrentOrg | null | undefined {
  const orgs = useQuery(orgListMineRef);
  if (orgs === undefined) return undefined;
  if (orgs.length === 0) return null;
  return orgs[0];
}
