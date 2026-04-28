"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (email: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          try {
            await onConfirm(email.trim());
          } catch (err) {
            setError((err as Error).message || "Ошибка отправки");
          } finally {
            setSubmitting(false);
          }
        }}
        className="bg-white rounded-lg max-w-md w-full p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold">Пригласить в команду</h2>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Отправляем…" : "Отправить приглашение"}
          </Button>
        </div>
      </form>
    </div>
  );
}
