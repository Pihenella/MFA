"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DailyDataPoint } from "@/lib/dailyMetrics";

type Props = { data: DailyDataPoint[] };

function formatRub(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}М`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}К`;
  return String(Math.round(v));
}

export function RevenueChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Выручка и прибыль</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatRub} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${Math.round(Number(v)).toLocaleString("ru")} ₽`} />
          <Legend />
          <Area type="monotone" dataKey="revenueSeller" name="Выручка" stroke="#7c3aed" fill="#ede9fe" strokeWidth={2} />
          <Area type="monotone" dataKey="profit" name="Прибыль" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
