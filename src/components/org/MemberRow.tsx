"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import type { TeamMember } from "@/lib/convex-refs";

export function MemberRow({
  member,
  canManage,
  isSelf,
  onRemove,
  onMakeOwner,
}: {
  member: TeamMember;
  canManage: boolean;
  isSelf: boolean;
  onRemove: () => void;
  onMakeOwner: () => void;
}) {
  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-md p-3">
      <div>
        <div className="font-medium">{member.name || "(без имени)"}</div>
        <div className="text-sm text-gray-500">{member.email}</div>
      </div>
      <div className="flex items-center gap-2">
        {member.role === "owner" ? (
          <Badge>{isSelf ? "Вы — owner" : "Owner"}</Badge>
        ) : (
          <Badge variant="secondary">Member</Badge>
        )}
        {canManage && member.role === "member" && (
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-gray-100 rounded">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onMakeOwner}>
                Сделать владельцем
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRemove}>
                Удалить из команды
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
