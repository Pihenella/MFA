"use client";
import { cn } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected" | "all";
type Counts = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

const TABS: Array<{ key: Status; label: string }> = [
  { key: "pending", label: "Ожидают" },
  { key: "approved", label: "Одобрены" },
  { key: "rejected", label: "Отклонены" },
  { key: "all", label: "Все" },
];

export function StatusTabs({
  active,
  counts,
  onChange,
}: {
  active: Status;
  counts: Counts;
  onChange: (s: Status) => void;
}) {
  const count = (k: Status) => (k === "all" ? counts.total : counts[k]);
  return (
    <div className="flex flex-wrap gap-1 rounded-frame border border-border bg-card p-1">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "rounded-sm px-4 py-2 text-sm font-medium transition-colors",
            active === t.key
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          {t.label} <span className="text-muted-foreground">({count(t.key)})</span>
        </button>
      ))}
    </div>
  );
}
