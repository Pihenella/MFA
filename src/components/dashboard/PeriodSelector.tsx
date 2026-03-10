"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, subDays } from "date-fns";

type Period = { from: string; to: string };

type Props = {
  period: Period;
  comparePeriod: Period;
  onChange: (period: Period, comparePeriod: Period) => void;
};

export function PeriodSelector({ period, comparePeriod, onChange }: Props) {
  const [p, setP] = useState(period);
  const [cp, setCp] = useState(comparePeriod);

  const apply = () => onChange(p, cp);

  const clear = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const week = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const prevWeekEnd = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const prevWeekStart = format(subDays(new Date(), 13), "yyyy-MM-dd");
    setP({ from: week, to: today });
    setCp({ from: prevWeekStart, to: prevWeekEnd });
    onChange({ from: week, to: today }, { from: prevWeekStart, to: prevWeekEnd });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      {/* Строка 1: Текущий период */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700 w-20">Период</span>
        <Input type="date" value={p.from} onChange={(e) => setP({ ...p, from: e.target.value })} className="w-40" />
        <span className="text-sm text-gray-400">—</span>
        <Input type="date" value={p.to} onChange={(e) => setP({ ...p, to: e.target.value })} className="w-40" />
        <Button onClick={apply} size="sm" className="bg-violet-600 hover:bg-violet-700">Применить</Button>
        <Button onClick={clear} size="sm" variant="outline">Сбросить</Button>
      </div>
      {/* Строка 2: Период сравнения */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700 w-20">Сравнение</span>
        <Input type="date" value={cp.from} onChange={(e) => setCp({ ...cp, from: e.target.value })} className="w-40" />
        <span className="text-sm text-gray-400">—</span>
        <Input type="date" value={cp.to} onChange={(e) => setCp({ ...cp, to: e.target.value })} className="w-40" />
      </div>
    </div>
  );
}
