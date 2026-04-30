"use client";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { orgRenameRef } from "@/lib/convex-refs";
import { OwnerGate } from "@/components/auth/OwnerGate";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { FinlyButton, FinlyCard } from "@/components/finly";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Save } from "lucide-react";

function OrgSettingsInner() {
  const org = useCurrentOrg();
  const rename = useMutation(orgRenameRef);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (org) setName(org.name);
  }, [org]);

  if (!org) return null;

  return (
    <div className="mx-auto max-w-screen-md space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Настройки организации
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Название, владелец и критичные действия для текущей организации.
        </p>
      </div>

      <FinlyCard accent="teal" className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Профиль организации</h2>
          <p className="text-sm text-muted-foreground">
            Название используется в навигации, приглашениях и командных отчётах.
          </p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            setError(null);
            setSaved(false);
            try {
              await rename({ orgId: org.orgId, newName: name.trim() });
              setSaved(true);
            } catch (err) {
              setError((err as Error).message || "Ошибка сохранения");
            } finally {
              setSubmitting(false);
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label>Название организации</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              maxLength={100}
              required
            />
          </div>
          {error && <div className="text-sm text-rune-danger">{error}</div>}
          {saved && <div className="text-sm text-rune-success">Сохранено.</div>}
          <FinlyButton
            type="submit"
            disabled={submitting || name.trim() === org.name || name.trim().length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {submitting ? "Сохраняем…" : "Сохранить"}
          </FinlyButton>
        </form>
      </FinlyCard>

      <FinlyCard accent="flame" className="space-y-4 border-rune-danger/40">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-rune-danger" />
          <div>
            <h2 className="font-display text-xl font-semibold">Danger zone</h2>
            <p className="text-sm text-muted-foreground">
              Действия из этой зоны влияют на доступ всей команды.
            </p>
          </div>
        </div>
        <FinlyButton
          variant="ghost"
          className="text-rune-danger"
          onClick={() => alert("Удаление организации пока недоступно.")}
        >
          Удалить организацию
        </FinlyButton>
      </FinlyCard>
    </div>
  );
}

export default function OrgSettingsPage() {
  return (
    <OwnerGate>
      <OrgSettingsInner />
    </OwnerGate>
  );
}
