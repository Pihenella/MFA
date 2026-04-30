"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DailyDataPoint } from "@/lib/dailyMetrics";
import { FinlyChartCard } from "@/components/finly/FinlyChartCard";

type Props = { data: DailyDataPoint[] };

export function MarginChart({ data }: Props) {
  return (
    <FinlyChartCard title="Маржинальность">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
          <Legend />
          <Line type="monotone" dataKey="profitPercent" name="% прибыли" stroke="var(--rune-success)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="returnRate" name="% возвратов" stroke="var(--rune-danger)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </FinlyChartCard>
  );
}
