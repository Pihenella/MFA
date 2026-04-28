"use client";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{user.name || "(без имени)"}</h3>
          <div className="text-sm text-gray-500">
            {user.email} · {user.phone || "—"} · {user.businessName || "—"}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {verified ? (
            <Badge>EMAIL ✓</Badge>
          ) : (
            <Badge variant="secondary">NOT VERIFIED</Badge>
          )}
          <Badge variant="outline">
            WB·{user.shopsCountWB ?? 0} + OZ·{user.shopsCountOzon ?? 0} ·{" "}
            {user.skuCount ?? 0} SKU
          </Badge>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Регистрация: {formatDate(user.createdAt)} · Email подтверждён:{" "}
        {formatDate(user.emailVerifiedAt)}
        {user.status === "rejected" && user.rejectionReason && (
          <> · Причина отклонения: {user.rejectionReason}</>
        )}
      </div>
      {user.status === "pending" && (
        <div className="flex gap-2">
          <Button onClick={onApprove} disabled={!verified}>
            Одобрить
          </Button>
          <Button variant="destructive" onClick={onReject}>
            Отклонить
          </Button>
        </div>
      )}
    </div>
  );
}
