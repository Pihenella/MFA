"use client";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PendingInviteRow({
  invite,
  onResend,
  onRevoke,
}: {
  invite: Doc<"invites">;
  onResend: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center justify-between border border-dashed border-gray-300 rounded-md p-3">
      <div>
        <div className="text-sm">{invite.email}</div>
        <div className="text-xs text-gray-500">
          Приглашение действительно до{" "}
          {new Date(invite.expiresAt).toLocaleDateString("ru-RU")}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">pending</Badge>
        <Button variant="outline" size="sm" onClick={onResend}>
          Отправить повторно
        </Button>
        <Button variant="destructive" size="sm" onClick={onRevoke}>
          Отозвать
        </Button>
      </div>
    </div>
  );
}
