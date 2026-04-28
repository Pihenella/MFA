"use client";

import { Beer } from "lucide-react";
import { useTavern } from "@/hooks/useTavern";

export function TavernToggle() {
  const { tavern, setTavern } = useTavern();

  return (
    <label className="inline-flex cursor-pointer items-center gap-3 rounded-frame border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
      <input
        type="checkbox"
        checked={tavern}
        onChange={(event) => setTavern(event.target.checked)}
        className="size-4 accent-primary"
        aria-label="Режим таверны"
      />
      <Beer size={16} aria-hidden="true" className="text-primary" />
      <span>Режим таверны</span>
    </label>
  );
}
