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
    <div className="flex gap-1 border-b border-gray-200">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === t.key
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-gray-600 hover:text-gray-900"
          )}
        >
          {t.label} <span className="text-gray-400">({count(t.key)})</span>
        </button>
      ))}
    </div>
  );
}
