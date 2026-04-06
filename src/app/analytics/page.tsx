"use client";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format, startOfMonth, subMonths, subDays } from "date-fns";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ArrowUp, ArrowDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { exportAnalyticsXlsx } from "@/lib/exportXlsx";

const TODAY = format(new Date(), "yyyy-MM-dd");
const THREE_MONTHS_AGO = format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd");
const PREV_END = format(subDays(startOfMonth(subMonths(new Date(), 2)), 1), "yyyy-MM-dd");
const PREV_START = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");

type GroupBy = "article" | "day" | "week" | "month" | "store" | "brand" | "subject";

const TABS: { key: GroupBy; label: string }[] = [
  { key: "article", label: "По артикулам" },
  { key: "store", label: "По магазинам" },
  { key: "day", label: "По дням" },
  { key: "week", label: "По неделям" },
  { key: "month", label: "По месяцам" },
  { key: "brand", label: "По брендам" },
  { key: "subject", label: "По предметам" },
];

type Row = NonNullable<ReturnType<typeof useQuery<typeof api.analytics.getSalesAnalytics>>>[number];

const COLUMNS: { key: keyof Row; label: string; group: string; unit?: string; invert?: boolean }[] = [
  // Прибыль
  { key: "profit", label: "Прибыль, ₽", group: "Прибыль", unit: "₽" },
  { key: "profitPct", label: "% прибыли", group: "Прибыль", unit: "%" },
  { key: "profitPerUnit", label: "Прибыль на ед, ₽", group: "Прибыль", unit: "₽" },
  { key: "roi", label: "ROI, %", group: "Прибыль", unit: "%" },
  // Воронка продаж
  { key: "views", label: "Переходы", group: "Воронка продаж", unit: "шт" },
  { key: "cvToCart", label: "CV в корзину, %", group: "Воронка продаж", unit: "%" },
  { key: "addToCart", label: "Добавления в корзину", group: "Воронка продаж", unit: "шт" },
  { key: "cvToOrder", label: "CV в заказ, %", group: "Воронка продаж", unit: "%" },
  // Заказы и отмены
  { key: "ordersRub", label: "Заказы, ₽", group: "Заказы и отмены", unit: "₽" },
  { key: "ordersCount", label: "Заказы, шт", group: "Заказы и отмены", unit: "шт" },
  { key: "cancelledRub", label: "Отм. заказы, ₽", group: "Заказы и отмены", unit: "₽", invert: true },
  { key: "cancelledCount", label: "Отм. заказы, шт", group: "Заказы и отмены", unit: "шт", invert: true },
  { key: "cancelRate", label: "% отм. заказов", group: "Заказы и отмены", unit: "%", invert: true },
  // Выручка по цене продавца
  { key: "salesSeller", label: "Продажи, ₽", group: "Выручка по цене продавца", unit: "₽" },
  { key: "returnsSeller", label: "Возвраты, ₽", group: "Выручка по цене продавца", unit: "₽", invert: true },
  { key: "revenueSeller", label: "Выручка, ₽", group: "Выручка по цене продавца", unit: "₽" },
  { key: "avgCheckSeller", label: "Средний чек, ₽", group: "Выручка по цене продавца", unit: "₽" },
  // Со скидкой WB
  { key: "salesWbDisc", label: "Продажи, ₽", group: "С уч. скидки WB", unit: "₽" },
  { key: "returnsWbDisc", label: "Возвраты, ₽", group: "С уч. скидки WB", unit: "₽", invert: true },
  { key: "revenueWbDisc", label: "Выручка, ₽", group: "С уч. скидки WB", unit: "₽" },
  { key: "avgCheckWbDisc", label: "Средний чек, ₽", group: "С уч. скидки WB", unit: "₽" },
  { key: "wbDiscPct", label: "Скидка WB, %", group: "С уч. скидки WB", unit: "%" },
  // Количество
  { key: "salesQty", label: "Продаж, шт", group: "Количество", unit: "шт" },
  { key: "returnsQty", label: "Возвраты, шт", group: "Количество", unit: "шт", invert: true },
  { key: "buyoutsQty", label: "Выкупы, шт", group: "Количество", unit: "шт" },
  { key: "buyoutsPct", label: "Выкупы, %", group: "Количество", unit: "%" },
  { key: "returnPct", label: "% возвр.", group: "Количество", unit: "%", invert: true },
  // Себестоимость и ВП
  { key: "cogs", label: "Себест., ₽", group: "Себестоимость", unit: "₽" },
  { key: "cogsPct", label: "% себест.", group: "Себестоимость", unit: "%" },
  { key: "grossProfit", label: "Валовая прибыль, ₽", group: "Валовая прибыль", unit: "₽" },
  { key: "grossProfitPct", label: "% вал. прибыли", group: "Валовая прибыль", unit: "%" },
  // Расходы
  { key: "commission", label: "Комиссия, ₽", group: "Расходы", unit: "₽", invert: true },
  { key: "commissionPct", label: "% комиссии", group: "Расходы", unit: "%", invert: true },
  { key: "logistics", label: "Логистика, ₽", group: "Расходы", unit: "₽", invert: true },
  { key: "logisticsPct", label: "% логистики", group: "Расходы", unit: "%", invert: true },
];

// Column group spans for header
function getGroupSpans() {
  const spans: { group: string; count: number }[] = [];
  let last = "";
  for (const c of COLUMNS) {
    if (c.group !== last) {
      spans.push({ group: c.group, count: 1 });
      last = c.group;
    } else {
      spans[spans.length - 1].count++;
    }
  }
  return spans;
}

const GROUP_COLORS: Record<string, string> = {
  "Прибыль": "bg-purple-50",
  "Воронка продаж": "bg-blue-50",
  "Заказы и отмены": "bg-orange-50",
  "Выручка по цене продавца": "bg-green-50",
  "С уч. скидки WB": "bg-cyan-50",
  "Количество": "bg-yellow-50",
  "Себестоимость": "bg-red-50",
  "Валовая прибыль": "bg-emerald-50",
  "Расходы": "bg-rose-50",
};

function fmt(val: number, unit?: string): string {
  if (unit === "%") return val.toFixed(2) + " %";
  if (unit === "шт") return Math.round(val).toLocaleString("ru-RU");
  if (unit === "₽") return Math.round(val).toLocaleString("ru-RU") + " ₽";
  return String(val);
}

function colorClass(val: number, invert?: boolean): string {
  if (val === 0) return "";
  const positive = invert ? val < 0 : val > 0;
  return positive ? "text-green-700" : "text-red-600";
}

export default function AnalyticsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const [period, setPeriod] = useState({ from: THREE_MONTHS_AGO, to: TODAY });
  const [comparePeriod, setComparePeriod] = useState({ from: PREV_START, to: PREV_END });
  const [groupBy, setGroupBy] = useState<GroupBy>("article");
  const [sortKey, setSortKey] = useState<keyof Row>("revenueSeller");
  const [sortAsc, setSortAsc] = useState(false);

  const data = useQuery(api.analytics.getSalesAnalytics, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
    groupBy,
  });

  const rows = data ?? [];

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortAsc ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
  }, [rows, sortKey, sortAsc]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const col of COLUMNS) {
      t[col.key] = 0;
    }
    for (const row of sorted) {
      for (const col of COLUMNS) {
        t[col.key] += Number(row[col.key]) || 0;
      }
    }
    // Recalculate ratios
    const rev = t.revenueSeller || 1;
    t.profitPct = (t.profit / Math.abs(rev)) * 100;
    t.profitPerUnit = t.buyoutsQty > 0 ? t.profit / t.buyoutsQty : 0;
    t.roi = t.cogs > 0 ? (t.profit / t.cogs) * 100 : 0;
    t.cvToCart = t.views > 0 ? (t.addToCart / t.views) * 100 : 0;
    t.cvToOrder = t.addToCart > 0 ? (t.ordersCount / t.addToCart) * 100 : 0;
    t.cancelRate = t.ordersCount > 0 ? (t.cancelledCount / t.ordersCount) * 100 : 0;
    t.avgCheckSeller = t.buyoutsQty > 0 ? t.revenueSeller / t.buyoutsQty : 0;
    t.avgCheckWbDisc = t.buyoutsQty > 0 ? t.revenueWbDisc / t.buyoutsQty : 0;
    t.wbDiscPct = t.salesSeller > 0 ? ((t.salesSeller - t.salesWbDisc) / t.salesSeller) * 100 : 0;
    t.buyoutsPct = t.ordersCount > 0 ? (t.buyoutsQty / t.ordersCount) * 100 : 0;
    t.returnPct = t.buyoutsQty > 0 ? (t.returnsQty / t.buyoutsQty) * 100 : 0;
    t.cogsPct = (t.cogs / Math.abs(rev)) * 100;
    t.grossProfitPct = (t.grossProfit / Math.abs(rev)) * 100;
    t.commissionPct = (t.commission / Math.abs(rev)) * 100;
    t.logisticsPct = (t.logistics / Math.abs(rev)) * 100;
    return t;
  }, [sorted]);

  const toggleSort = (key: keyof Row) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const groupSpans = getGroupSpans();
  const tabLabel = TABS.find((t) => t.key === groupBy)?.label ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Аналитика продаж Wildberries</h1>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={selectedShop}
          onChange={(e) => setSelectedShop(e.target.value)}
        >
          <option value="">Все магазины</option>
          {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              groupBy === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
            onClick={() => { setGroupBy(tab.key); setSortKey("revenueSeller"); setSortAsc(false); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <PeriodSelector
          period={period}
          comparePeriod={comparePeriod}
          onChange={(p, cp) => { setPeriod(p); setComparePeriod(cp); }}
        />
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => exportAnalyticsXlsx(sorted, COLUMNS, tabLabel, totals)}
        >
          <Download className="h-4 w-4" />
          Скачать xlsx
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          {/* Group header */}
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 px-3 py-1 text-left text-xs font-semibold text-gray-600 border-b border-r" rowSpan={2}>
                {groupBy === "article" ? "Артикул" : groupBy === "day" ? "Дата" : groupBy === "week" ? "Неделя" : groupBy === "month" ? "Месяц" : groupBy === "store" ? "Магазин" : groupBy === "brand" ? "Бренд" : "Предмет"}
              </th>
              {groupSpans.map((gs) => (
                <th
                  key={gs.group}
                  colSpan={gs.count}
                  className={cn("px-2 py-1 text-center text-xs font-semibold text-gray-700 border-b border-x", GROUP_COLORS[gs.group])}
                >
                  {gs.group}
                </th>
              ))}
            </tr>
            {/* Column headers */}
            <tr className="border-b">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-2 py-1.5 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 whitespace-nowrap border-b",
                    GROUP_COLORS[col.group]
                  )}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-0.5 justify-end">
                    {col.label}
                    {sortKey === col.key && (
                      sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-12 text-center text-gray-400">
                  Загрузка...
                </td>
              </tr>
            )}
            {data && sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-12 text-center text-gray-400">
                  Нет данных за выбранный период
                </td>
              </tr>
            )}
            {sorted.map((row, i) => (
              <tr key={row.label + i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap border-r max-w-[200px] truncate" title={row.label}>
                  {row.label || "(пусто)"}
                </td>
                {COLUMNS.map((col) => {
                  const val = Number(row[col.key]) || 0;
                  const needColor = ["profit", "profitPct", "roi", "grossProfit", "grossProfitPct"].includes(col.key);
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-2 py-1.5 text-right whitespace-nowrap",
                        needColor && colorClass(val),
                        col.invert && val !== 0 && "text-red-600",
                      )}
                    >
                      {col.invert && val > 0 ? `-${fmt(val, col.unit)}` : fmt(val, col.unit)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 border-r">
                  Итого ({sorted.length})
                </td>
                {COLUMNS.map((col) => {
                  const val = totals[col.key] ?? 0;
                  const needColor = ["profit", "profitPct", "roi", "grossProfit", "grossProfitPct"].includes(col.key);
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-2 py-2 text-right whitespace-nowrap",
                        needColor && colorClass(val),
                        col.invert && val !== 0 && "text-red-600",
                      )}
                    >
                      {col.invert && val > 0 ? `-${fmt(val, col.unit)}` : fmt(val, col.unit)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
