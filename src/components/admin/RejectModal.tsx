"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold">Отклонить заявку — {userName}</h2>
        <div className="space-y-1">
          <Label>Причина (опционально)</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-sm min-h-[80px]"
            placeholder="Например: не соответствует профилю"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Отмена
          </Button>
          <Button
            variant="destructive"
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
          </Button>
        </div>
      </div>
    </div>
  );
}
