"use client";
import type { Doc } from "../../../convex/_generated/dataModel";
import { FinlyBadge, FinlyButton } from "@/components/finly";

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
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm font-medium text-foreground">{invite.email}</div>
        <div className="text-xs text-muted-foreground">
          Приглашение действительно до{" "}
          {new Date(invite.expiresAt).toLocaleDateString("ru-RU")}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FinlyBadge tone="gold">pending</FinlyBadge>
        <FinlyButton variant="secondary" size="sm" onClick={onResend}>
          Отправить повторно
        </FinlyButton>
        <FinlyButton
          variant="ghost"
          size="sm"
          className="text-rune-danger"
          onClick={onRevoke}
        >
          Отозвать
        </FinlyButton>
      </div>
    </div>
  );
}
