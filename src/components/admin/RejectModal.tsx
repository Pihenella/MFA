"use client";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { FinlyButton, FinlyCard } from "@/components/finly";

export function RejectModal({
  userName,
  onConfirm,
  onCancel,
}: {
  userName: string;
  onConfirm: (reason: string | undefined) => Promise<void>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scroll-ink/60 px-4">
      <FinlyCard
        accent="flame"
        className="w-full max-w-md space-y-4 bg-popover shadow-rune"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-user-title"
      >
        <h2 id="reject-user-title" className="font-display text-xl font-semibold">
          Отклонить заявку — {userName}
        </h2>
        <div className="space-y-1">
          <Label>Причина (опционально)</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[96px] w-full rounded-md border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Например: не соответствует профилю"
          />
        </div>
        <div className="flex justify-end gap-2">
          <FinlyButton variant="ghost" onClick={onCancel} disabled={submitting}>
            Отмена
          </FinlyButton>
          <FinlyButton
            variant="ghost"
            className="text-rune-danger"
            onClick={async () => {
              setSubmitting(true);
              try {
                await onConfirm(reason.trim() || undefined);
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? "Отклоняем…" : "Отклонить"}
          </FinlyButton>
        </div>
      </FinlyCard>
    </div>
  );
}
