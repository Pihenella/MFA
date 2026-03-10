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
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

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

  // Товары с продажами, но без себестоимости
  const costSet = new Set(now.costs.filter((c) => c.cost > 0).map((c) => c.nmId));
  const salesNmIds = new Set(now.sales.filter((s) => !s.isReturn).map((s) => s.nmId));
  const missingCostCount = [...salesNmIds].filter((id) => !costSet.has(id)).length;

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

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        Финансовые данные WB обновляются с задержкой 1–2 недели. Комиссия, логистика, хранение и удержания могут быть неполными для последних дней.
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

      {/* 1. Переходы и корзины */}
      <DashboardSection title="Переходы и корзины">
        <MetricCard label="Количество переходов" value={mNow.openCardCount} prevValue={mPrev.openCardCount} delta={pctDelta(mNow.openCardCount, mPrev.openCardCount)} unit="шт" />
        <MetricCard label="CV в корзину" value={mNow.crToCart} prevValue={mPrev.crToCart} delta={pctDelta(mNow.crToCart, mPrev.crToCart)} unit="%" />
        <MetricCard label="Добавления в корзину" value={mNow.addToCartCount} prevValue={mPrev.addToCartCount} delta={pctDelta(mNow.addToCartCount, mPrev.addToCartCount)} unit="шт" />
        <MetricCard label="CV в заказ" value={mNow.crToOrder} prevValue={mPrev.crToOrder} delta={pctDelta(mNow.crToOrder, mPrev.crToOrder)} unit="%" />
      </DashboardSection>

      {/* 2. Заказы */}
      <DashboardSection title="Заказы">
        <MetricCard label="Заказы" value={mNow.ordersRevenue} prevValue={mPrev.ordersRevenue} delta={pctDelta(mNow.ordersRevenue, mPrev.ordersRevenue)} unit="₽" />
        <MetricCard label="Заказы" value={mNow.ordersCount} prevValue={mPrev.ordersCount} delta={pctDelta(mNow.ordersCount, mPrev.ordersCount)} unit="шт" />
        <MetricCard label="Средний чек заказа" value={mNow.avgOrderValue} prevValue={mPrev.avgOrderValue} delta={pctDelta(mNow.avgOrderValue, mPrev.avgOrderValue)} unit="₽" />
        <MetricCard label="Отмены" value={-mNow.cancelledRevenue} prevValue={-mPrev.cancelledRevenue} delta={pctDelta(mNow.cancelledRevenue, mPrev.cancelledRevenue)} unit="₽" invertColors />
        <MetricCard label="Отмены" value={-mNow.cancelledCount} prevValue={-mPrev.cancelledCount} delta={pctDelta(mNow.cancelledCount, mPrev.cancelledCount)} unit="шт" invertColors />
        <MetricCard label="Процент отмен" value={-mNow.cancelRate} prevValue={-mPrev.cancelRate} delta={pctDelta(mNow.cancelRate, mPrev.cancelRate)} unit="%" invertColors />
      </DashboardSection>

      {/* 3. Выручка и валовая прибыль */}
      <DashboardSection title="Выручка и валовая прибыль">
        {/* Строка 1: Продажи по цене продавца */}
        <MetricCard label="Продажи по цене продавца" value={mNow.salesRetail} prevValue={mPrev.salesRetail} delta={pctDelta(mNow.salesRetail, mPrev.salesRetail)} unit="₽" />
        <MetricCard label="Возвраты по цене продавца" value={-mNow.returnsRetail} prevValue={-mPrev.returnsRetail} delta={pctDelta(mNow.returnsRetail, mPrev.returnsRetail)} unit="₽" invertColors />
        <MetricCard label="Выручка по цене продавца" value={mNow.netRetail} prevValue={mPrev.netRetail} delta={pctDelta(mNow.netRetail, mPrev.netRetail)} unit="₽" />
        <MetricCard label="Средний чек продаж" value={mNow.salesCount > 0 ? mNow.salesRetail / mNow.salesCount : 0} prevValue={mPrev.salesCount > 0 ? mPrev.salesRetail / mPrev.salesCount : 0} delta={pctDelta(mNow.salesCount > 0 ? mNow.salesRetail / mNow.salesCount : 0, mPrev.salesCount > 0 ? mPrev.salesRetail / mPrev.salesCount : 0)} unit="₽" />

        {/* Строка 2: ForPay — выручка с учётом скидок ВБ */}
        <MetricCard label="Возвраты с учётом скидок ВБ" value={-mNow.returnsForPay} prevValue={-mPrev.returnsForPay} delta={pctDelta(mNow.returnsForPay, mPrev.returnsForPay)} unit="₽" invertColors />
        <MetricCard label="Выручка с учётом скидок ВБ" value={mNow.revenueForPay} prevValue={mPrev.revenueForPay} delta={pctDelta(mNow.revenueForPay, mPrev.revenueForPay)} unit="₽" />
        <MetricCard label="Средний чек с учётом скидок ВБ" value={mNow.avgCheckForPay} prevValue={mPrev.avgCheckForPay} delta={pctDelta(mNow.avgCheckForPay, mPrev.avgCheckForPay)} unit="₽" />
        <MetricCard label="Продажи" value={mNow.salesCount} prevValue={mPrev.salesCount} delta={pctDelta(mNow.salesCount, mPrev.salesCount)} unit="шт" />
        <MetricCard label="Возвраты" value={-mNow.returnsCount} prevValue={-mPrev.returnsCount} delta={pctDelta(mNow.returnsCount, mPrev.returnsCount)} unit="шт" invertColors />

        {/* Строка 3: Ставки и проценты */}
        <MetricCard label="Возвраты" value={-mNow.returnRate} prevValue={-mPrev.returnRate} delta={pctDelta(mNow.returnRate, mPrev.returnRate)} unit="%" invertColors />
        <MetricCard label="Выкупы" value={mNow.buyoutsCount} prevValue={mPrev.buyoutsCount} delta={pctDelta(mNow.buyoutsCount, mPrev.buyoutsCount)} unit="шт" />
        <MetricCard label="Выручка" value={mNow.revenuePercent} prevValue={mPrev.revenuePercent} delta={pctDelta(mNow.revenuePercent, mPrev.revenuePercent)} unit="%" />
        <MetricCard label="Скидки ВБ" value={-mNow.wbDiscount} prevValue={-mPrev.wbDiscount} delta={pctDelta(mNow.wbDiscount, mPrev.wbDiscount)} unit="₽" invertColors />
        <MetricCard label="Скидки ВБ" value={-mNow.wbDiscountPercent} prevValue={-mPrev.wbDiscountPercent} delta={pctDelta(mNow.wbDiscountPercent, mPrev.wbDiscountPercent)} unit="%" invertColors />

        {/* Строка 4: Себестоимость и валовая прибыль */}
        <MetricCard label="Себестоимость" value={-mNow.cogs} prevValue={-mPrev.cogs} delta={pctDelta(mNow.cogs, mPrev.cogs)} unit="₽" invertColors />
        <MetricCard label="Себестоимость" value={-mNow.cogsPercent} prevValue={-mPrev.cogsPercent} delta={pctDelta(mNow.cogsPercent, mPrev.cogsPercent)} unit="%" invertColors />
        <MetricCard label="Валовая прибыль" value={mNow.grossProfit} prevValue={mPrev.grossProfit} delta={pctDelta(mNow.grossProfit, mPrev.grossProfit)} unit="₽" />
        <MetricCard label="Валовая прибыль" value={mNow.grossProfitPercent} prevValue={mPrev.grossProfitPercent} delta={pctDelta(mNow.grossProfitPercent, mPrev.grossProfitPercent)} unit="%" />
      </DashboardSection>

      {/* 4. Расходы на Wildberries */}
      <DashboardSection title="Расходы на Wildberries">
        <MetricCard label="Комиссия ВБ" value={-mNow.commission} prevValue={-mPrev.commission} delta={pctDelta(mNow.commission, mPrev.commission)} unit="₽" invertColors />
        <MetricCard label="Комиссия" value={-mNow.commissionPercent} prevValue={-mPrev.commissionPercent} delta={pctDelta(mNow.commissionPercent, mPrev.commissionPercent)} unit="%" invertColors />
        <MetricCard label="Логистика" value={-mNow.logistics} prevValue={-mPrev.logistics} delta={pctDelta(mNow.logistics, mPrev.logistics)} unit="₽" invertColors />
        <MetricCard label="Логистика" value={-mNow.logisticsPercent} prevValue={-mPrev.logisticsPercent} delta={pctDelta(mNow.logisticsPercent, mPrev.logisticsPercent)} unit="%" invertColors />
        <MetricCard label="Штрафы" value={-mNow.penalties} prevValue={-mPrev.penalties} delta={pctDelta(mNow.penalties, mPrev.penalties)} unit="₽" invertColors />
        <MetricCard label="Штрафы" value={-mNow.penaltiesPercent} prevValue={-mPrev.penaltiesPercent} delta={pctDelta(mNow.penaltiesPercent, mPrev.penaltiesPercent)} unit="%" invertColors />
        <MetricCard label="Удержания" value={-mNow.deductions} prevValue={-mPrev.deductions} delta={pctDelta(mNow.deductions, mPrev.deductions)} unit="₽" invertColors />
        <MetricCard label="Удержания" value={-mNow.deductionsPercent} prevValue={-mPrev.deductionsPercent} delta={pctDelta(mNow.deductionsPercent, mPrev.deductionsPercent)} unit="%" invertColors />
        <MetricCard label="Хранение" value={-mNow.storage} prevValue={-mPrev.storage} delta={pctDelta(mNow.storage, mPrev.storage)} unit="₽" invertColors />
        <MetricCard label="Хранение" value={-mNow.storagePercent} prevValue={-mPrev.storagePercent} delta={pctDelta(mNow.storagePercent, mPrev.storagePercent)} unit="%" invertColors />
        <MetricCard label="Реклама" value={-mNow.ads} prevValue={-mPrev.ads} delta={pctDelta(mNow.ads, mPrev.ads)} unit="₽" invertColors />
        <MetricCard label="Реклама" value={-mNow.adsPercent} prevValue={-mPrev.adsPercent} delta={pctDelta(mNow.adsPercent, mPrev.adsPercent)} unit="%" invertColors />
        <MetricCard label="Компенсация" value={mNow.compensation} prevValue={mPrev.compensation} delta={pctDelta(mNow.compensation, mPrev.compensation)} unit="₽" />
        <MetricCard label="Компенсация" value={mNow.compensationPercent} prevValue={mPrev.compensationPercent} delta={pctDelta(mNow.compensationPercent, mPrev.compensationPercent)} unit="%" />
        <MetricCard label="Итого расходов ВБ" value={-mNow.totalExpenses} prevValue={-mPrev.totalExpenses} delta={pctDelta(mNow.totalExpenses, mPrev.totalExpenses)} unit="₽" invertColors />
        <MetricCard label="Итого расходов ВБ" value={-mNow.totalExpensesPercent} prevValue={-mPrev.totalExpensesPercent} delta={pctDelta(mNow.totalExpensesPercent, mPrev.totalExpensesPercent)} unit="%" invertColors />
      </DashboardSection>

      {/* 5. Маржинальная прибыль и налоги */}
      <DashboardSection title="Маржинальная прибыль и налоги">
        <MetricCard label="Марж. прибыль" value={mNow.marginalProfit} prevValue={mPrev.marginalProfit} delta={pctDelta(mNow.marginalProfit, mPrev.marginalProfit)} unit="₽" />
        <MetricCard label="Марж. прибыль" value={mNow.marginalProfitPercent} prevValue={mPrev.marginalProfitPercent} delta={pctDelta(mNow.marginalProfitPercent, mPrev.marginalProfitPercent)} unit="%" />
        <MetricCard label="Налог" value={-mNow.tax} prevValue={-mPrev.tax} delta={pctDelta(mNow.tax, mPrev.tax)} unit="₽" invertColors />
        <MetricCard label="Налог" value={-mNow.taxPercent} prevValue={-mPrev.taxPercent} delta={pctDelta(mNow.taxPercent, mPrev.taxPercent)} unit="%" invertColors />
        <MetricCard label="Прибыль после налога" value={mNow.profit} prevValue={mPrev.profit} delta={pctDelta(mNow.profit, mPrev.profit)} unit="₽" />
        <MetricCard label="Прибыль после налога" value={mNow.profitPercent} prevValue={mPrev.profitPercent} delta={pctDelta(mNow.profitPercent, mPrev.profitPercent)} unit="%" />
        <MetricCard label="ROI" value={mNow.roi} prevValue={mPrev.roi} delta={pctDelta(mNow.roi, mPrev.roi)} unit="%" />
      </DashboardSection>
    </div>
  );
}
