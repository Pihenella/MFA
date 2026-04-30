"use client";
import type { Doc } from "../../../convex/_generated/dataModel";
import { FinlyBadge, FinlyButton, FinlyCard } from "@/components/finly";

function formatDate(ms: number | null | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("ru-RU");
}

export function UserCard({
  user,
  onApprove,
  onReject,
}: {
  user: Doc<"users">;
  onApprove: () => void;
  onReject: () => void;
}) {
  const verified = !!user.emailVerifiedAt;
  return (
    <FinlyCard accent={user.status === "pending" ? "gold" : "teal"} className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{user.name || "(без имени)"}</h3>
          <div className="text-sm text-muted-foreground">
            {user.email} · {user.phone || "—"} · {user.businessName || "—"}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {verified ? (
            <FinlyBadge tone="success">EMAIL ✓</FinlyBadge>
          ) : (
            <FinlyBadge tone="muted">NOT VERIFIED</FinlyBadge>
          )}
          <FinlyBadge tone="info">
            WB·{user.shopsCountWB ?? 0} + OZ·{user.shopsCountOzon ?? 0} ·{" "}
            {user.skuCount ?? 0} SKU
          </FinlyBadge>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Регистрация: {formatDate(user.createdAt)} · Email подтверждён:{" "}
        {formatDate(user.emailVerifiedAt)}
        {user.status === "rejected" && user.rejectionReason && (
          <> · Причина отклонения: {user.rejectionReason}</>
        )}
      </div>
      {user.status === "pending" && (
        <div className="flex gap-2">
          <FinlyButton onClick={onApprove} disabled={!verified}>
            Одобрить
          </FinlyButton>
          <FinlyButton
            variant="ghost"
            className="text-rune-danger"
            onClick={onReject}
          >
            Отклонить
          </FinlyButton>
        </div>
      )}
    </FinlyCard>
  );
}
