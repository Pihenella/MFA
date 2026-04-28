"use client";
import { useState } from "react";
import { FinlyButton, FinlyCard } from "@/components/finly";

export function TransferOwnershipModal({
  targetName,
  onConfirm,
  onCancel,
}: {
  targetName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scroll-ink/60 px-4">
      <FinlyCard
        accent="gold"
        className="w-full max-w-md space-y-4 bg-popover shadow-rune"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-owner-title"
      >
        <h2 id="transfer-owner-title" className="font-display text-xl font-semibold">
          Передать владение
        </h2>
        <p className="text-sm text-muted-foreground">
          Подтвердите передачу владения организацией пользователю{" "}
          <strong className="text-foreground">{targetName}</strong>. После передачи вы станете обычным
          членом команды.
        </p>
        <div className="flex justify-end gap-2">
          <FinlyButton variant="ghost" onClick={onCancel} disabled={submitting}>
            Отмена
          </FinlyButton>
          <FinlyButton
            onClick={async () => {
              setSubmitting(true);
              try {
                await onConfirm();
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? "Передаём…" : "Подтвердить"}
          </FinlyButton>
        </div>
      </FinlyCard>
    </div>
  );
}
