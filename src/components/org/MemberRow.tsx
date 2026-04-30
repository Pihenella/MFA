"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { TeamMember } from "@/lib/convex-refs";
import { FinlyBadge } from "@/components/finly";

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
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium text-foreground">{member.name || "(без имени)"}</div>
        <div className="text-sm text-muted-foreground">{member.email}</div>
      </div>
      <div className="flex items-center gap-2">
        {member.role === "owner" ? (
          <FinlyBadge tone="gold">{isSelf ? "Вы — owner" : "Owner"}</FinlyBadge>
        ) : (
          <FinlyBadge tone="info">Member</FinlyBadge>
        )}
        {canManage && member.role === "member" && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Действия участника"
              className="rounded-frame p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
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
