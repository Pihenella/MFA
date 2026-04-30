"use client";
import { useState } from "react";
import { FinlyButton } from "@/components/finly/FinlyButton";
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
    <div className="space-y-3 rounded-frame border border-gold-frame/30 bg-card p-4 shadow-rune">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 font-display text-sm font-semibold text-foreground">
          Период
        </span>
        <Input
          type="date"
          value={p.from}
          onChange={(e) => setP({ ...p, from: e.target.value })}
          className="w-40 bg-background"
        />
        <span className="text-sm text-muted-foreground">—</span>
        <Input
          type="date"
          value={p.to}
          onChange={(e) => setP({ ...p, to: e.target.value })}
          className="w-40 bg-background"
        />
        <FinlyButton onClick={apply} size="sm">
          Применить
        </FinlyButton>
        <FinlyButton onClick={clear} size="sm" variant="secondary">
          Сбросить
        </FinlyButton>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 font-display text-sm font-semibold text-foreground">
          Сравнение
        </span>
        <Input
          type="date"
          value={cp.from}
          onChange={(e) => setCp({ ...cp, from: e.target.value })}
          className="w-40 bg-background"
        />
        <span className="text-sm text-muted-foreground">—</span>
        <Input
          type="date"
          value={cp.to}
          onChange={(e) => setCp({ ...cp, to: e.target.value })}
          className="w-40 bg-background"
        />
      </div>
    </div>
  );
}
