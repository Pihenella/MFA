"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold">Передать владение</h2>
        <p className="text-sm text-gray-700">
          Подтвердите передачу владения организацией пользователю{" "}
          <strong>{targetName}</strong>. После передачи вы станете обычным
          членом команды.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Отмена
          </Button>
          <Button
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
          </Button>
        </div>
      </div>
    </div>
  );
}
