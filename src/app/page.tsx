"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { format, subDays } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { computeDashboardMetrics } from "@/lib/metrics";

function pctDelta(now: number, prev: number) {
  if (prev === 0) return now === 0 ? 0 : 100;
  return ((now - prev) / Math.abs(prev)) * 100;
}

const TODAY = format(new Date(), "yyyy-MM-dd");
const WEEK_AGO = format(subDays(new Date(), 6), "yyyy-MM-dd");
const PREV_END = format(subDays(new Date(), 7), "yyyy-MM-dd");
const PREV_START = format(subDays(new Date(), 13), "yyyy-MM-dd");

export default function DashboardPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const [period, setPeriod] = useState({ from: WEEK_AGO, to: TODAY });
  const [comparePeriod, setComparePeriod] = useState({ from: PREV_START, to: PREV_END });
  const [tab, setTab] = useState<"all" | "wb" | "ozon">("all");

  const { now, prev } = useDashboardData(period, comparePeriod, shopId);

  const mNow = computeDashboardMetrics(now);
  const mPrev = computeDashboardMetrics(prev);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Дашборд</h1>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "wb" | "ozon")} className="mt-2">
            <TabsList>
              <TabsTrigger value="all">Общий</TabsTrigger>
              <TabsTrigger value="wb">Wildberries</TabsTrigger>
              <TabsTrigger value="ozon" disabled>Ozon</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={selectedShop}
          onChange={(e) => setSelectedShop(e.target.value)}
        >
          <option value="">Все магазины</option>
          {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      <PeriodSelector
        period={period}
        comparePeriod={comparePeriod}
        onChange={(p, cp) => { setPeriod(p); setComparePeriod(cp); }}
      />

      {/* 1. Заказы и отмены */}
      <DashboardSection title="Заказы и отмены">
        <MetricCard label="Заказы" value={mNow.ordersRevenue} prevValue={mPrev.ordersRevenue} delta={pctDelta(mNow.ordersRevenue, mPrev.ordersRevenue)} unit="₽" />
        <MetricCard label="Заказы" value={mNow.ordersCount} prevValue={mPrev.ordersCount} delta={pctDelta(mNow.ordersCount, mPrev.ordersCount)} unit="шт" />
        <MetricCard label="Отмен. заказы" value={-mNow.cancelledRevenue} prevValue={-mPrev.cancelledRevenue} delta={pctDelta(mNow.cancelledRevenue, mPrev.cancelledRevenue)} unit="₽" invertColors />
        <MetricCard label="Отмен. заказы" value={-mNow.cancelledCount} prevValue={-mPrev.cancelledCount} delta={pctDelta(mNow.cancelledCount, mPrev.cancelledCount)} unit="шт" invertColors />
        <MetricCard label="Отмен. заказы" value={-mNow.cancelRate} prevValue={-mPrev.cancelRate} delta={pctDelta(mNow.cancelRate, mPrev.cancelRate)} unit="%" invertColors />
      </DashboardSection>

      {/* 2. Выручка и валовая прибыль */}
      <DashboardSection title="Выручка и валовая прибыль">
        <MetricCard label="Продажи" value={mNow.salesRevenue} prevValue={mPrev.salesRevenue} delta={pctDelta(mNow.salesRevenue, mPrev.salesRevenue)} unit="₽" />
        <MetricCard label="Возвраты" value={-mNow.returnsRevenue} prevValue={-mPrev.returnsRevenue} delta={pctDelta(mNow.returnsRevenue, mPrev.returnsRevenue)} unit="₽" invertColors />
        <MetricCard label="Выручка" value={mNow.revenue} prevValue={mPrev.revenue} delta={pctDelta(mNow.revenue, mPrev.revenue)} unit="₽" />
        <MetricCard label="Средний чек" value={mNow.avgCheck} prevValue={mPrev.avgCheck} delta={pctDelta(mNow.avgCheck, mPrev.avgCheck)} unit="₽" />
        <MetricCard label="Продажи" value={mNow.salesCount} prevValue={mPrev.salesCount} delta={pctDelta(mNow.salesCount, mPrev.salesCount)} unit="шт" />
        <MetricCard label="Возвраты" value={-mNow.returnsCount} prevValue={-mPrev.returnsCount} delta={pctDelta(mNow.returnsCount, mPrev.returnsCount)} unit="шт" invertColors />
        <MetricCard label="Возвраты" value={-mNow.returnRate} prevValue={-mPrev.returnRate} delta={pctDelta(mNow.returnRate, mPrev.returnRate)} unit="%" invertColors />
        <MetricCard label="Выкупы" value={mNow.buyoutsCount} prevValue={mPrev.buyoutsCount} delta={pctDelta(mNow.buyoutsCount, mPrev.buyoutsCount)} unit="шт" />
        <MetricCard label="Выкупы" value={mNow.buyoutRate} prevValue={mPrev.buyoutRate} delta={pctDelta(mNow.buyoutRate, mPrev.buyoutRate)} unit="%" />
        <MetricCard label="Себестоимость" value={-mNow.cogs} prevValue={-mPrev.cogs} delta={pctDelta(mNow.cogs, mPrev.cogs)} unit="₽" invertColors />
        <MetricCard label="Себестоимость" value={-mNow.cogsPercent} prevValue={-mPrev.cogsPercent} delta={pctDelta(mNow.cogsPercent, mPrev.cogsPercent)} unit="%" invertColors />
        <MetricCard label="Средняя себестоимость" value={-mNow.avgCogs} prevValue={-mPrev.avgCogs} delta={pctDelta(mNow.avgCogs, mPrev.avgCogs)} unit="₽" invertColors />
      </DashboardSection>

      {/* 3. Валовая прибыль */}
      <DashboardSection title="Валовая прибыль">
        <MetricCard label="Валовая прибыль" value={mNow.grossProfit} prevValue={mPrev.grossProfit} delta={pctDelta(mNow.grossProfit, mPrev.grossProfit)} unit="₽" />
        <MetricCard label="Валовая прибыль" value={mNow.grossProfitPercent} prevValue={mPrev.grossProfitPercent} delta={pctDelta(mNow.grossProfitPercent, mPrev.grossProfitPercent)} unit="%" />
      </DashboardSection>

      {/* 4. Расходы маркетплейсов */}
      <DashboardSection title="Расходы маркетплейсов">
        <MetricCard label="Комиссия" value={-mNow.commission} prevValue={-mPrev.commission} delta={pctDelta(mNow.commission, mPrev.commission)} unit="₽" invertColors />
        <MetricCard label="Комиссия" value={-mNow.commissionPercent} prevValue={-mPrev.commissionPercent} delta={pctDelta(mNow.commissionPercent, mPrev.commissionPercent)} unit="%" invertColors />
        <MetricCard label="Логистика" value={-mNow.logistics} prevValue={-mPrev.logistics} delta={pctDelta(mNow.logistics, mPrev.logistics)} unit="₽" invertColors />
        <MetricCard label="Логистика" value={-mNow.logisticsPercent} prevValue={-mPrev.logisticsPercent} delta={pctDelta(mNow.logisticsPercent, mPrev.logisticsPercent)} unit="%" invertColors />
        <MetricCard label="Хранение" value={-mNow.storage} prevValue={-mPrev.storage} delta={pctDelta(mNow.storage, mPrev.storage)} unit="₽" invertColors />
        <MetricCard label="Реклама" value={-mNow.ads} prevValue={-mPrev.ads} delta={pctDelta(mNow.ads, mPrev.ads)} unit="₽" invertColors />
        <MetricCard label="Прочие услуги" value={-mNow.otherServices} prevValue={-mPrev.otherServices} delta={pctDelta(mNow.otherServices, mPrev.otherServices)} unit="₽" invertColors />
        <MetricCard label="Компенсация" value={mNow.compensation} prevValue={mPrev.compensation} delta={pctDelta(mNow.compensation, mPrev.compensation)} unit="₽" />
        <MetricCard label="Итого расходы" value={-mNow.totalExpenses} prevValue={-mPrev.totalExpenses} delta={pctDelta(mNow.totalExpenses, mPrev.totalExpenses)} unit="₽" invertColors />
        <MetricCard label="Итого расходы" value={-mNow.totalExpensesPercent} prevValue={-mPrev.totalExpensesPercent} delta={pctDelta(mNow.totalExpensesPercent, mPrev.totalExpensesPercent)} unit="%" invertColors />
      </DashboardSection>

      {/* 5. Маржинальная прибыль и налоги */}
      <DashboardSection title="Маржинальная прибыль и налоги">
        <MetricCard label="Маржин. прибыль" value={mNow.marginalProfit} prevValue={mPrev.marginalProfit} delta={pctDelta(mNow.marginalProfit, mPrev.marginalProfit)} unit="₽" />
        <MetricCard label="Маржин. прибыль" value={mNow.marginalProfitPercent} prevValue={mPrev.marginalProfitPercent} delta={pctDelta(mNow.marginalProfitPercent, mPrev.marginalProfitPercent)} unit="%" />
        <MetricCard label="Налог" value={-mNow.tax} prevValue={-mPrev.tax} delta={pctDelta(mNow.tax, mPrev.tax)} unit="₽" invertColors />
        <MetricCard label="Налог" value={-mNow.taxPercent} prevValue={-mPrev.taxPercent} delta={pctDelta(mNow.taxPercent, mPrev.taxPercent)} unit="%" invertColors />
        <MetricCard label="Прибыль" value={mNow.profit} prevValue={mPrev.profit} delta={pctDelta(mNow.profit, mPrev.profit)} unit="₽" />
        <MetricCard label="Прибыль" value={mNow.profitPercent} prevValue={mPrev.profitPercent} delta={pctDelta(mNow.profitPercent, mPrev.profitPercent)} unit="%" />
        <MetricCard label="ROI" value={mNow.roi} prevValue={mPrev.roi} delta={pctDelta(mNow.roi, mPrev.roi)} unit="%" />
      </DashboardSection>
    </div>
  );
}
