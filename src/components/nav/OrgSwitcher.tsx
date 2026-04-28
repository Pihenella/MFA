"use client";
import { useQuery, useConvexAuth } from "convex/react";
import { orgListMineRef } from "@/lib/convex-refs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function OrgSwitcher() {
  const { isAuthenticated } = useConvexAuth();
  const orgs = useQuery(orgListMineRef, isAuthenticated ? {} : "skip");
  if (!orgs || orgs.length < 2) return null;
  const active = orgs[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm px-2 py-1 hover:bg-gray-100 rounded-md">
        {active.name} <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {orgs.map((o) => (
          <DropdownMenuItem key={o.orgId}>
            {o.name}
            {o.orgId === active.orgId && (
              <span className="ml-2 text-xs text-violet-600">·</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
