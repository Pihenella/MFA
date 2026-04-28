import { FinlyMetricTile } from "@/components/finly/FinlyMetricTile";

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
  const formatted =
    typeof value === "number" ? formatNum(value, unit) : String(value);
  const comparison =
    prevValue !== undefined
      ? `В прошлом периоде: ${
          typeof prevValue === "number" ? formatNum(prevValue, unit) : prevValue
        }`
      : undefined;

  return (
    <FinlyMetricTile
      label={label}
      value={value}
      formatted={formatted}
      deltaPct={delta}
      comparison={comparison}
      invertDeltaColors={invertColors}
      accent={invertColors ? "flame" : "gold"}
    />
  );
}
