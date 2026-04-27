"use client";
import { shopsListRef } from "@/lib/convex-refs";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { usePulseData } from "@/hooks/usePulseData";
import { cn } from "@/lib/utils";

const RevenueChart = dynamic(() => import("@/components/charts/RevenueChart").then((m) => ({ default: m.RevenueChart })), { ssr: false });
const FunnelChart = dynamic(() => import("@/components/charts/FunnelChart").then((m) => ({ default: m.FunnelChart })), { ssr: false });
const ExpensesChart = dynamic(() => import("@/components/charts/ExpensesChart").then((m) => ({ default: m.ExpensesChart })), { ssr: false });
const MarginChart = dynamic(() => import("@/components/charts/MarginChart").then((m) => ({ default: m.MarginChart })), { ssr: false });

const PRESETS = [
  { label: "7 дней", days: 7 },
  { label: "14 дней", days: 14 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
] as const;

const GRANULARITIES = [
  { label: "По дням", value: "day" },
  { label: "По неделям", value: "week" },
  { label: "По месяцам", value: "month" },
] as const;

type Granularity = "day" | "week" | "month";

export default function PulsePage() {
  const shops = useQuery(shopsListRef) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const [days, setDays] = useState(30);
  const [granularity, setGranularity] = useState<Granularity>("day");

  const today = format(new Date(), "yyyy-MM-dd");
  const from = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
  const period = { from, to: today };

  const data = usePulseData(period, shopId, granularity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Рука на пульсе</h1>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={selectedShop}
          onChange={(e) => setSelectedShop(e.target.value)}
        >
          <option value="">Все магазины</option>
          {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {PRESETS.map((p) => (
            <Button
              key={p.days}
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs",
                days === p.days && "bg-violet-100 text-violet-700",
              )}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {GRANULARITIES.map((g) => (
            <Button
              key={g.value}
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs",
                granularity === g.value && "bg-violet-100 text-violet-700",
              )}
              onClick={() => setGranularity(g.value as Granularity)}
            >
              {g.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart data={data} />
        <FunnelChart data={data} />
        <ExpensesChart data={data} />
        <MarginChart data={data} />
      </div>
    </div>
  );
}
