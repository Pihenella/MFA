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

export function ExpensesChart({ data }: Props) {
  return (
    <FinlyChartCard title="Расходы маркетплейса">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatRub} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${Math.round(Number(v)).toLocaleString("ru")} ₽`} />
          <Legend />
          <Area type="monotone" dataKey="commission" name="Комиссия" stackId="1" stroke="var(--chart-1)" fill="var(--tide-glow)" />
          <Area type="monotone" dataKey="logistics" name="Логистика" stackId="1" stroke="var(--chart-2)" fill="var(--tavern-bg)" />
          <Area type="monotone" dataKey="storage" name="Хранение" stackId="1" stroke="var(--chart-3)" fill="var(--tavern-surface)" />
          <Area type="monotone" dataKey="ads" name="Реклама" stackId="1" stroke="var(--chart-5)" fill="var(--tavern-elevated)" />
        </AreaChart>
      </ResponsiveContainer>
    </FinlyChartCard>
  );
}
