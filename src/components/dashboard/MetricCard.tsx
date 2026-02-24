import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number | string;
  prevValue?: number | string;
  delta?: number;        // % change
  unit?: "₽" | "шт" | "%";
  tooltip?: string;
  invertColors?: boolean; // red is good (e.g. returns/cancels)
};

function formatNum(v: number, unit?: string): string {
  if (unit === "%") return `${v.toFixed(2)} %`;
  if (unit === "шт") return `${Math.round(v).toLocaleString("ru")} шт`;
  // ₽
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} млн ₽`;
  return `${Math.round(v).toLocaleString("ru")} ₽`;
}

export function MetricCard({ label, value, prevValue, delta, unit, invertColors }: Props) {
  const isPositive = (delta ?? 0) >= 0;
  const goodColor = invertColors ? "text-red-500" : "text-green-600";
  const badColor = invertColors ? "text-green-600" : "text-red-500";
  const deltaColor = isPositive ? goodColor : badColor;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-1">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-gray-900">
        {typeof value === "number" ? formatNum(value, unit) : value}
      </div>
      {prevValue !== undefined && (
        <div className="text-xs text-gray-400">
          В прошлом периоде:{" "}
          {typeof prevValue === "number" ? formatNum(prevValue, unit) : prevValue}
        </div>
      )}
      {delta !== undefined && (
        <div className={cn("flex items-center gap-1 text-sm font-semibold", deltaColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          {delta >= 0 ? "+" : ""}{delta.toFixed(2)} %
        </div>
      )}
    </div>
  );
}
