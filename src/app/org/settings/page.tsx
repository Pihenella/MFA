"use client";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { orgRenameRef } from "@/lib/convex-refs";
import { OwnerGate } from "@/components/auth/OwnerGate";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="max-w-screen-sm mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Настройки организации</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          setSaved(false);
          try {
            await rename({ orgId: org.orgId, newName: name });
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
        {error && <div className="text-sm text-red-600">{error}</div>}
        {saved && <div className="text-sm text-green-700">Сохранено.</div>}
        <Button type="submit" disabled={submitting || name.trim() === org.name}>
          {submitting ? "Сохраняем…" : "Сохранить"}
        </Button>
      </form>
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
