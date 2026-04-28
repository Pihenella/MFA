"use client";
import { useQuery, useConvexAuth } from "convex/react";
import { orgListMineRef } from "@/lib/convex-refs";

export type CurrentOrg = {
  orgId: import("../../convex/_generated/dataModel").Id<"organizations">;
  name: string;
  role: "owner" | "member";
  ownerId: import("../../convex/_generated/dataModel").Id<"users">;
};

export function useCurrentOrg(): CurrentOrg | null | undefined {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const orgs = useQuery(orgListMineRef, isAuthenticated ? {} : "skip");
  if (isLoading || (isAuthenticated && orgs === undefined)) return undefined;
  if (!isAuthenticated || !orgs || orgs.length === 0) return null;
  return orgs[0];
}
