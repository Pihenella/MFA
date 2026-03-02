"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DailyDataPoint } from "@/lib/dailyMetrics";

type Props = { data: DailyDataPoint[] };

export function FunnelChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Заказы / Продажи / Выкупы</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="ordersCount" name="Заказы" fill="#7c3aed" radius={[2, 2, 0, 0]} />
          <Bar dataKey="salesCount" name="Продажи" fill="#2563eb" radius={[2, 2, 0, 0]} />
          <Bar dataKey="buyoutsCount" name="Выкупы" fill="#059669" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
