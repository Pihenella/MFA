"use client";
import { AuthGate } from "@/components/auth/AuthGate";
import { shopsListMineRef } from "@/lib/convex-refs";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { format, subDays } from "date-fns";
import { FinlyButton } from "@/components/finly/FinlyButton";
import { FinlyCard } from "@/components/finly/FinlyCard";
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
  return (
    <AuthGate>
      <PulseContent />
    </AuthGate>
  );
}

function PulseContent() {
  const shops = useQuery(shopsListMineRef) ?? [];
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Рука на пульсе
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Динамика выручки, заказов, расходов и маржинальности.
          </p>
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={selectedShop}
          onChange={(e) => setSelectedShop(e.target.value)}
        >
          <option value="">Все магазины</option>
          {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      <FinlyCard accent="teal" className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex gap-1 rounded-frame border border-border bg-background p-1">
          {PRESETS.map((p) => (
            <FinlyButton
              key={p.days}
              variant={days === p.days ? "primary" : "ghost"}
              size="sm"
              className={cn(
                "text-xs",
                days !== p.days && "text-muted-foreground",
              )}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </FinlyButton>
          ))}
        </div>

        <div className="flex gap-1 rounded-frame border border-border bg-background p-1">
          {GRANULARITIES.map((g) => (
            <FinlyButton
              key={g.value}
              variant={granularity === g.value ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "text-xs",
                granularity !== g.value && "text-muted-foreground",
              )}
              onClick={() => setGranularity(g.value as Granularity)}
            >
              {g.label}
            </FinlyButton>
          ))}
        </div>
      </FinlyCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart data={data} />
        <FunnelChart data={data} />
        <ExpensesChart data={data} />
        <MarginChart data={data} />
      </div>
    </div>
  );
}
