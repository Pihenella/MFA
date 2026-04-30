"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DailyDataPoint } from "@/lib/dailyMetrics";
import { FinlyChartCard } from "@/components/finly/FinlyChartCard";

type Props = { data: DailyDataPoint[] };

export function FunnelChart({ data }: Props) {
  return (
    <FinlyChartCard title="Заказы / Продажи / Выкупы">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="ordersCount" name="Заказы" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="salesCount" name="Продажи" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="buyoutsCount" name="Выкупы" fill="var(--chart-4)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </FinlyChartCard>
  );
}
