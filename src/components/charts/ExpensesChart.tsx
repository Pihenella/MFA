"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DailyDataPoint } from "@/lib/dailyMetrics";

type Props = { data: DailyDataPoint[] };

function formatRub(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}М`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}К`;
  return String(Math.round(v));
}

export function ExpensesChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Расходы маркетплейса</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatRub} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${Math.round(Number(v)).toLocaleString("ru")} ₽`} />
          <Legend />
          <Area type="monotone" dataKey="commission" name="Комиссия" stackId="1" stroke="#7c3aed" fill="#ede9fe" />
          <Area type="monotone" dataKey="logistics" name="Логистика" stackId="1" stroke="#2563eb" fill="#dbeafe" />
          <Area type="monotone" dataKey="storage" name="Хранение" stackId="1" stroke="#d97706" fill="#fef3c7" />
          <Area type="monotone" dataKey="ads" name="Реклама" stackId="1" stroke="#dc2626" fill="#fee2e2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
