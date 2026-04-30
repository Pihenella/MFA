"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FinlyButton, FinlyCard } from "@/components/finly";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scroll-ink/60 px-4">
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
        className="w-full max-w-md"
      >
        <FinlyCard
          accent="teal"
          className="space-y-4 bg-popover shadow-rune"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-team-title"
        >
          <div>
            <h2 id="invite-team-title" className="font-display text-xl font-semibold">
              Пригласить в команду
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Пользователь получит ссылку для входа в организацию.
            </p>
          </div>
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
          {error && <div className="text-sm text-rune-danger">{error}</div>}
          <div className="flex justify-end gap-2">
            <FinlyButton
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={submitting}
            >
              Отмена
            </FinlyButton>
            <FinlyButton type="submit" disabled={submitting}>
              {submitting ? "Отправляем…" : "Отправить приглашение"}
            </FinlyButton>
          </div>
        </FinlyCard>
      </form>
    </div>
  );
}
