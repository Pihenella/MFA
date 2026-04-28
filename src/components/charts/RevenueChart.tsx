"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DailyDataPoint } from "@/lib/dailyMetrics";
import { FinlyChartCard } from "@/components/finly/FinlyChartCard";

type Props = { data: DailyDataPoint[] };

function formatRub(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}М`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}К`;
  return String(Math.round(v));
}

export function RevenueChart({ data }: Props) {
  return (
    <FinlyChartCard title="Выручка и прибыль">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatRub} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${Math.round(Number(v)).toLocaleString("ru")} ₽`} />
          <Legend />
          <Area type="monotone" dataKey="revenueSeller" name="Выручка" stroke="var(--chart-1)" fill="var(--tide-glow)" strokeWidth={2} />
          <Area type="monotone" dataKey="profit" name="Прибыль" stroke="var(--rune-success)" fill="var(--tavern-bg)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </FinlyChartCard>
  );
}
