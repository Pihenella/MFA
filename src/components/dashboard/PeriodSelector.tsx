"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="flex flex-wrap items-end gap-4 bg-white rounded-xl border border-gray-100 p-4">
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Период с</Label>
        <Input type="date" value={p.from} onChange={(e) => setP({ ...p, from: e.target.value })} className="w-38" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">по</Label>
        <Input type="date" value={p.to} onChange={(e) => setP({ ...p, to: e.target.value })} className="w-38" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Сравнение с</Label>
        <Input type="date" value={cp.from} onChange={(e) => setCp({ ...cp, from: e.target.value })} className="w-38" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">по</Label>
        <Input type="date" value={cp.to} onChange={(e) => setCp({ ...cp, to: e.target.value })} className="w-38" />
      </div>
      <Button onClick={apply} className="bg-violet-600 hover:bg-violet-700">Применить</Button>
      <Button onClick={clear} variant="outline">Очистить</Button>
    </div>
  );
}
