"use client";
import { shopsListMineRef } from "@/lib/convex-refs";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { format, subDays, startOfMonth, subMonths } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Welcome } from "@/components/dashboard/Welcome";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { computeDashboardMetrics } from "@/lib/metrics";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

function pctDelta(now: number, prev: number) {
  if (prev === 0) return now === 0 ? 0 : 100;
  return ((now - prev) / Math.abs(prev)) * 100;
}

const TODAY = format(new Date(), "yyyy-MM-dd");
const MONTH_START = format(startOfMonth(new Date()), "yyyy-MM-dd");
const PREV_MONTH_START = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
const PREV_MONTH_END = format(subDays(startOfMonth(new Date()), 1), "yyyy-MM-dd");

export default function DashboardPage() {
  const shops = (useQuery(shopsListMineRef) ?? []) as Doc<"shops">[];
  const user = useCurrentUser();
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const [period, setPeriod] = useState({ from: MONTH_START, to: TODAY });
  const [comparePeriod, setComparePeriod] = useState({ from: PREV_MONTH_START, to: PREV_MONTH_END });
  const [tab, setTab] = useState<"all" | "wb" | "ozon">("all");

  const { now, prev } = useDashboardData(period, comparePeriod, shopId);

  const mNow = computeDashboardMetrics(now);
  const mPrev = computeDashboardMetrics(prev);

  // Товары с продажами в financials, но без себестоимости
  const costSet = new Set(now.costs.filter((c) => c.cost > 0).map((c) => c.nmId));
  const finNmIds = new Set(now.financials.filter((f) => f.docTypeName === "Продажа").map((f) => f.nmId));
  const missingCostCount = [...finNmIds].filter((id) => !costSet.has(id)).length;

  if (user && shops.length === 0) {
    return <Welcome userName={user.name || "пользователь"} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Дашборд Wildberries</h1>
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

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        Финансовые данные WB обновляются с задержкой 1-2 недели. Комиссия, логистика, хранение и удержания могут быть неполными для последних дней.
      </div>

      {missingCostCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{missingCostCount}</strong> {missingCostCount === 1 ? "товар" : missingCostCount < 5 ? "товара" : "товаров"} без себестоимости — расчёты прибыли, ROI и маржи некорректны.{" "}
            <Link href="/products" className="underline font-medium hover:text-red-900">
              Загрузить себестоимость
            </Link>
          </span>
        </div>
      )}

      {/* 1. ПЕРЕХОДЫ И КОРЗИНЫ */}
      <DashboardSection title="Переходы и корзины">
        <MetricCard label="Количество переходов" value={mNow.openCardCount} prevValue={mPrev.openCardCount} delta={pctDelta(mNow.openCardCount, mPrev.openCardCount)} unit="шт" />
        <MetricCard label="CV в корзину, %" value={mNow.crToCart} prevValue={mPrev.crToCart} delta={pctDelta(mNow.crToCart, mPrev.crToCart)} unit="%" />
        <MetricCard label="Добавления в корзину" value={mNow.addToCartCount} prevValue={mPrev.addToCartCount} delta={pctDelta(mNow.addToCartCount, mPrev.addToCartCount)} unit="шт" />
        <MetricCard label="CV в заказ, %" value={mNow.crToOrder} prevValue={mPrev.crToOrder} delta={pctDelta(mNow.crToOrder, mPrev.crToOrder)} unit="%" />
      </DashboardSection>

      {/* 2. ЗАКАЗЫ */}
      <DashboardSection title="Заказы">
        <MetricCard label="Заказы, руб" value={mNow.ordersRevenue} prevValue={mPrev.ordersRevenue} delta={pctDelta(mNow.ordersRevenue, mPrev.ordersRevenue)} unit="₽" />
        <MetricCard label="Заказы, шт" value={mNow.ordersCount} prevValue={mPrev.ordersCount} delta={pctDelta(mNow.ordersCount, mPrev.ordersCount)} unit="шт" />
        <MetricCard label="Отмена, руб" value={-mNow.cancelledRevenue} prevValue={-mPrev.cancelledRevenue} delta={pctDelta(mNow.cancelledRevenue, mPrev.cancelledRevenue)} unit="₽" invertColors />
        <MetricCard label="Отмен, шт" value={-mNow.cancelledCount} prevValue={-mPrev.cancelledCount} delta={pctDelta(mNow.cancelledCount, mPrev.cancelledCount)} unit="шт" invertColors />
        <MetricCard label="% отмен заказов" value={-mNow.cancelRate} prevValue={-mPrev.cancelRate} delta={pctDelta(mNow.cancelRate, mPrev.cancelRate)} unit="%" invertColors />
      </DashboardSection>

      {/* 3. ВЫРУЧКА И ВАЛОВАЯ ПРИБЫЛЬ */}
      <DashboardSection title="Выручка и валовая прибыль">
        {/* Строка 1 */}
        <MetricCard label="Продажи (цена продавца), руб" value={mNow.salesSeller} prevValue={mPrev.salesSeller} delta={pctDelta(mNow.salesSeller, mPrev.salesSeller)} unit="₽" />
        <MetricCard label="Возвраты (цена продавца), руб" value={-mNow.returnsSeller} prevValue={-mPrev.returnsSeller} delta={pctDelta(mNow.returnsSeller, mPrev.returnsSeller)} unit="₽" invertColors />
        <MetricCard label="Выручка (по цене продавца), руб" value={mNow.revenueSeller} prevValue={mPrev.revenueSeller} delta={pctDelta(mNow.revenueSeller, mPrev.revenueSeller)} unit="₽" />
        <MetricCard label="Скидки WB по цене продавца, %" value={mNow.wbDiscountPct} prevValue={mPrev.wbDiscountPct} delta={pctDelta(mNow.wbDiscountPct, mPrev.wbDiscountPct)} unit="%" />
        <MetricCard label="Продажи (со скидкой WB), руб" value={mNow.salesWbDisc} prevValue={mPrev.salesWbDisc} delta={pctDelta(mNow.salesWbDisc, mPrev.salesWbDisc)} unit="₽" />

        {/* Строка 2 */}
        <MetricCard label="Возвраты в стоимости скидок WB" value={-mNow.returnsWbDisc} prevValue={-mPrev.returnsWbDisc} delta={pctDelta(mNow.returnsWbDisc, mPrev.returnsWbDisc)} unit="₽" invertColors />
        <MetricCard label="Выручка (в стоимости скидок WB)" value={mNow.revenueWbDisc} prevValue={mPrev.revenueWbDisc} delta={pctDelta(mNow.revenueWbDisc, mPrev.revenueWbDisc)} unit="₽" />
        <MetricCard label="К перечислению (продажи), руб" value={mNow.forPaySales} prevValue={mPrev.forPaySales} delta={pctDelta(mNow.forPaySales, mPrev.forPaySales)} unit="₽" />
        <MetricCard label="Продажи, шт" value={mNow.salesCount} prevValue={mPrev.salesCount} delta={pctDelta(mNow.salesCount, mPrev.salesCount)} unit="шт" />
        <MetricCard label="Возвраты, шт" value={-mNow.returnsCount} prevValue={-mPrev.returnsCount} delta={pctDelta(mNow.returnsCount, mPrev.returnsCount)} unit="шт" invertColors />

        {/* Строка 3 */}
        <MetricCard label="Возвраты, %" value={-mNow.returnRate} prevValue={-mPrev.returnRate} delta={pctDelta(mNow.returnRate, mPrev.returnRate)} unit="%" invertColors />
        <MetricCard label="Выкупы, шт" value={mNow.buyoutsCount} prevValue={mPrev.buyoutsCount} delta={pctDelta(mNow.buyoutsCount, mPrev.buyoutsCount)} unit="шт" />
        <MetricCard label="Выкупы, %" value={mNow.buyoutRate} prevValue={mPrev.buyoutRate} delta={pctDelta(mNow.buyoutRate, mPrev.buyoutRate)} unit="%" />
        <MetricCard label="Себестоимость, руб" value={-mNow.cogs} prevValue={-mPrev.cogs} delta={pctDelta(mNow.cogs, mPrev.cogs)} unit="₽" invertColors />
        <MetricCard label="Себестоимость, %" value={-mNow.cogsPercent} prevValue={-mPrev.cogsPercent} delta={pctDelta(mNow.cogsPercent, mPrev.cogsPercent)} unit="%" invertColors />

        {/* Строка 4 */}
        <MetricCard label="Средний чек, руб" value={mNow.avgCheck} prevValue={mPrev.avgCheck} delta={pctDelta(mNow.avgCheck, mPrev.avgCheck)} unit="₽" />
        <MetricCard label="Средняя себестоимость" value={-mNow.avgCost} prevValue={-mPrev.avgCost} delta={pctDelta(mNow.avgCost, mPrev.avgCost)} unit="₽" invertColors />
        <MetricCard label="Валовая прибыль, руб" value={mNow.grossProfit} prevValue={mPrev.grossProfit} delta={pctDelta(mNow.grossProfit, mPrev.grossProfit)} unit="₽" />
        <MetricCard label="Валовая прибыль, %" value={mNow.grossProfitPercent} prevValue={mPrev.grossProfitPercent} delta={pctDelta(mNow.grossProfitPercent, mPrev.grossProfitPercent)} unit="%" />
      </DashboardSection>

      {/* 4. ПРОДАЖИ И ВОЗВРАТЫ БЕЗ СЕБЕСТОИМОСТИ */}
      <DashboardSection title="Продажи и возвраты без себестоимости">
        <MetricCard label="Продажи без себестоимости, руб" value={mNow.salesNoCost} prevValue={mPrev.salesNoCost} delta={pctDelta(mNow.salesNoCost, mPrev.salesNoCost)} unit="₽" />
        <MetricCard label="Возвраты без себестоимости, руб" value={mNow.returnsNoCost} prevValue={mPrev.returnsNoCost} delta={pctDelta(mNow.returnsNoCost, mPrev.returnsNoCost)} unit="₽" />
      </DashboardSection>

      {/* 5. РАСХОДЫ НА WILDBERRIES */}
      <DashboardSection title="Расходы на Wildberries">
        {/* Строка 1 */}
        <MetricCard label="Комиссия, руб" value={-mNow.commission} prevValue={-mPrev.commission} delta={pctDelta(mNow.commission, mPrev.commission)} unit="₽" invertColors />
        <MetricCard label="Комиссия, %" value={-mNow.commissionPercent} prevValue={-mPrev.commissionPercent} delta={pctDelta(mNow.commissionPercent, mPrev.commissionPercent)} unit="%" invertColors />
        <MetricCard label="Логистика, руб" value={-mNow.logistics} prevValue={-mPrev.logistics} delta={pctDelta(mNow.logistics, mPrev.logistics)} unit="₽" invertColors />
        <MetricCard label="Логистика, %" value={-mNow.logisticsPercent} prevValue={-mPrev.logisticsPercent} delta={pctDelta(mNow.logisticsPercent, mPrev.logisticsPercent)} unit="%" invertColors />
        <MetricCard label="Хранение, руб" value={-mNow.storage} prevValue={-mPrev.storage} delta={pctDelta(mNow.storage, mPrev.storage)} unit="₽" invertColors />

        {/* Строка 2 */}
        <MetricCard label="Хранение, %" value={-mNow.storagePercent} prevValue={-mPrev.storagePercent} delta={pctDelta(mNow.storagePercent, mPrev.storagePercent)} unit="%" invertColors />
        <MetricCard label="Компенсации, руб" value={-mNow.compensation} prevValue={-mPrev.compensation} delta={pctDelta(mNow.compensation, mPrev.compensation)} unit="₽" invertColors />
        <MetricCard label="Платная приемка, руб" value={-mNow.acceptance} prevValue={-mPrev.acceptance} delta={pctDelta(mNow.acceptance, mPrev.acceptance)} unit="₽" invertColors />
        <MetricCard label="Штрафы, руб" value={-mNow.penalties} prevValue={-mPrev.penalties} delta={pctDelta(mNow.penalties, mPrev.penalties)} unit="₽" invertColors />
        <MetricCard label="Штрафы, %" value={-mNow.penaltiesPercent} prevValue={-mPrev.penaltiesPercent} delta={pctDelta(mNow.penaltiesPercent, mPrev.penaltiesPercent)} unit="%" invertColors />

        {/* Строка 3 */}
        <MetricCard label="Реклама, руб" value={-mNow.ads} prevValue={-mPrev.ads} delta={pctDelta(mNow.ads, mPrev.ads)} unit="₽" invertColors />
        <MetricCard label="Реклама, %" value={-mNow.adsPercent} prevValue={-mPrev.adsPercent} delta={pctDelta(mNow.adsPercent, mPrev.adsPercent)} unit="%" invertColors />
        <MetricCard label="Прочие услуги, руб" value={-mNow.deductions} prevValue={-mPrev.deductions} delta={pctDelta(mNow.deductions, mPrev.deductions)} unit="₽" invertColors />
        <MetricCard label="Расходы МП, руб" value={-mNow.mpExpenses} prevValue={-mPrev.mpExpenses} delta={pctDelta(mNow.mpExpenses, mPrev.mpExpenses)} unit="₽" invertColors />

        {/* Строка 4 */}
        <MetricCard label="Расходы МП, %" value={-mNow.mpExpensesPercent} prevValue={-mPrev.mpExpensesPercent} delta={pctDelta(mNow.mpExpensesPercent, mPrev.mpExpensesPercent)} unit="%" invertColors />
      </DashboardSection>

      {/* 6. МАРЖИНАЛЬНАЯ ПРИБЫЛЬ И НАЛОГИ */}
      <DashboardSection title="Маржинальная прибыль и налоги">
        <MetricCard label="Марж. прибыль, руб" value={mNow.profitBeforeTax} prevValue={mPrev.profitBeforeTax} delta={pctDelta(mNow.profitBeforeTax, mPrev.profitBeforeTax)} unit="₽" />
        <MetricCard label="Марж. прибыль, %" value={mNow.profitBeforeTaxPercent} prevValue={mPrev.profitBeforeTaxPercent} delta={pctDelta(mNow.profitBeforeTaxPercent, mPrev.profitBeforeTaxPercent)} unit="%" />
        <MetricCard label="Налог, руб" value={-mNow.tax} prevValue={-mPrev.tax} delta={pctDelta(mNow.tax, mPrev.tax)} unit="₽" invertColors />
        <MetricCard label="Налог, %" value={-mNow.taxPercent} prevValue={-mPrev.taxPercent} delta={pctDelta(mNow.taxPercent, mPrev.taxPercent)} unit="%" invertColors />
        <MetricCard label="К выплате на р/с, руб" value={mNow.payoutToAccount} prevValue={mPrev.payoutToAccount} delta={pctDelta(mNow.payoutToAccount, mPrev.payoutToAccount)} unit="₽" />

        <MetricCard label="Прибыль, руб" value={mNow.profit} prevValue={mPrev.profit} delta={pctDelta(mNow.profit, mPrev.profit)} unit="₽" />
        <MetricCard label="Прибыль, %" value={mNow.profitPercent} prevValue={mPrev.profitPercent} delta={pctDelta(mNow.profitPercent, mPrev.profitPercent)} unit="%" />
        <MetricCard label="ROI, %" value={mNow.roi} prevValue={mPrev.roi} delta={pctDelta(mNow.roi, mPrev.roi)} unit="%" />
      </DashboardSection>
    </div>
  );
}
