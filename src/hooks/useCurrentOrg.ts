"use client";
import { useQuery } from "convex/react";
import { orgListMineRef } from "@/lib/convex-refs";
import { useCurrentUser } from "./useCurrentUser";

export type CurrentOrg = {
  orgId: import("../../convex/_generated/dataModel").Id<"organizations">;
  name: string;
  role: "owner" | "member";
  ownerId: import("../../convex/_generated/dataModel").Id<"users">;
};

export function useCurrentOrg(): CurrentOrg | null | undefined {
  const user = useCurrentUser();
  const orgs = useQuery(
    orgListMineRef,
    user?.status === "approved" ? {} : "skip"
  );
  if (user === undefined) return undefined;
  if (!user || user.status !== "approved") return null;
  if (orgs === undefined) return undefined;
  if (orgs.length === 0) return null;
  return orgs[0];
}
