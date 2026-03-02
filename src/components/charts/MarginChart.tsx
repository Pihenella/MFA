"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DailyDataPoint } from "@/lib/dailyMetrics";

type Props = { data: DailyDataPoint[] };

export function MarginChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Маржинальность</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
          <Legend />
          <Line type="monotone" dataKey="profitPercent" name="% прибыли" stroke="#059669" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="returnRate" name="% возвратов" stroke="#dc2626" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
