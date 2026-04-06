"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format, startOfMonth, subMonths, subDays } from "date-fns";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ArrowUp, ArrowDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { exportAnalyticsXlsx } from "@/lib/exportXlsx";

const TODAY = format(new Date(), "yyyy-MM-dd");
const THREE_MO_AGO = format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd");
const PREV_END = format(subDays(startOfMonth(subMonths(new Date(), 2)), 1), "yyyy-MM-dd");
const PREV_START = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");

type GroupBy = "article" | "size" | "store" | "day" | "week" | "month" | "brand" | "subject" | "group";

const TABS: { key: GroupBy; label: string }[] = [
  { key: "article", label: "По артикулам" },
  { key: "size", label: "По размерам" },
  { key: "store", label: "По магазинам" },
  { key: "day", label: "По дням" },
  { key: "week", label: "По неделям" },
  { key: "month", label: "По месяцам" },
  { key: "brand", label: "По брендам" },
  { key: "subject", label: "По предметам" },
  { key: "group", label: "По склейкам" },
];

// Column definitions matching МП Факт exactly
type Col = { key: string; label: string; group: string; unit?: "₽" | "%" | "шт"; neg?: boolean };

const COLUMNS: Col[] = [
  // Прибыль
  { key: "profit", label: "Прибыль, ₽", group: "Прибыль", unit: "₽" },
  { key: "profitPct", label: "% прибыли", group: "Прибыль", unit: "%" },
  { key: "profitPerUnit", label: "Прибыль на ед, ₽", group: "Прибыль", unit: "₽" },
  { key: "roi", label: "ROI, %", group: "Прибыль", unit: "%" },
  // Воронка продаж
  { key: "views", label: "Переходы в карточку", group: "Воронка продаж", unit: "шт" },
  { key: "cvToCart", label: "CV в корзину, %", group: "Воронка продаж", unit: "%" },
  { key: "addToCart", label: "Добавления в корзину", group: "Воронка продаж", unit: "шт" },
  { key: "cvToOrder", label: "CV в заказ, %", group: "Воронка продаж", unit: "%" },
  // Заказы и отмены
  { key: "ordersRub", label: "Заказы, ₽", group: "Заказы и отмены", unit: "₽" },
  { key: "ordersCount", label: "Заказы, шт", group: "Заказы и отмены", unit: "шт" },
  { key: "cancelledRub", label: "Отм. заказы, ₽", group: "Заказы и отмены", unit: "₽", neg: true },
  { key: "cancelledCount", label: "Отм. заказы, шт", group: "Заказы и отмены", unit: "шт", neg: true },
  { key: "cancelRate", label: "% отм. заказов", group: "Заказы и отмены", unit: "%", neg: true },
  // Выручка по цене продавца
  { key: "salesSeller", label: "Продажи, ₽", group: "Выручка по цене продавца", unit: "₽" },
  { key: "returnsSeller", label: "Возвраты, ₽", group: "Выручка по цене продавца", unit: "₽", neg: true },
  { key: "revenueSeller", label: "Выручка, ₽", group: "Выручка по цене продавца", unit: "₽" },
  { key: "avgCheckSeller", label: "Средний чек, ₽", group: "Выручка по цене продавца", unit: "₽" },
  // С уч. скидки WB
  { key: "salesWbDisc", label: "Продажи, ₽", group: "С уч. скидки WB", unit: "₽" },
  { key: "returnsWbDisc", label: "Возвраты, ₽", group: "С уч. скидки WB", unit: "₽", neg: true },
  { key: "revenueWbDisc", label: "Выручка, ₽", group: "С уч. скидки WB", unit: "₽" },
  { key: "avgCheckWbDisc", label: "Средний чек, ₽", group: "С уч. скидки WB", unit: "₽" },
  { key: "wbDiscPct", label: "Скидка WB, %", group: "С уч. скидки WB", unit: "%" },
  // Количество
  { key: "salesQty", label: "Продаж, шт", group: "Кол-во и выкупы", unit: "шт" },
  { key: "returnsQty", label: "Возвраты, шт", group: "Кол-во и выкупы", unit: "шт", neg: true },
  { key: "buyoutsQty", label: "Выкупы, шт", group: "Кол-во и выкупы", unit: "шт" },
  { key: "buyoutsPct", label: "Выкупы, %", group: "Кол-во и выкупы", unit: "%" },
  { key: "returnPct", label: "% возвр.", group: "Кол-во и выкупы", unit: "%", neg: true },
  // Себестоимость
  { key: "cogs", label: "Себест., ₽", group: "Себестоимость", unit: "₽" },
  { key: "cogsPct", label: "% себест.", group: "Себестоимость", unit: "%" },
  // Валовая прибыль
  { key: "grossProfit", label: "Валовая прибыль, ₽", group: "Валовая прибыль", unit: "₽" },
  { key: "grossProfitPct", label: "% вал. прибыли", group: "Валовая прибыль", unit: "%" },
  // Расходы
  { key: "commission", label: "Комиссия, ₽", group: "Расходы МП", unit: "₽", neg: true },
  { key: "commissionPct", label: "% комиссии", group: "Расходы МП", unit: "%", neg: true },
  { key: "logistics", label: "Логистика, ₽", group: "Расходы МП", unit: "₽", neg: true },
  { key: "logisticsPct", label: "% логистики", group: "Расходы МП", unit: "%", neg: true },
];

function getGroupSpans(): { group: string; count: number }[] {
  const spans: { group: string; count: number }[] = [];
  let last = "";
  for (const c of COLUMNS) {
    if (c.group !== last) { spans.push({ group: c.group, count: 1 }); last = c.group; }
    else spans[spans.length - 1].count++;
  }
  return spans;
}

function fmtNum(val: number, unit?: "₽" | "%" | "шт"): string {
  if (unit === "%") return val.toFixed(2) + " %";
  if (unit === "шт") return Math.round(val).toLocaleString("ru-RU");
  if (unit === "₽") return Math.round(val).toLocaleString("ru-RU") + " ₽";
  return String(val);
}

// ROI/Profit badge colors like МП Факт
function profitBadge(val: number): string {
  if (val >= 20) return "bg-green-500 text-white";
  if (val >= 10) return "bg-green-400 text-white";
  if (val >= 0) return "bg-yellow-400 text-gray-900";
  return "bg-red-500 text-white";
}

function roiBadge(val: number): string {
  if (val >= 50) return "bg-purple-500 text-white";
  if (val >= 30) return "bg-blue-500 text-white";
  if (val >= 0) return "bg-yellow-400 text-gray-900";
  return "bg-red-500 text-white";
}

// Whether this tab shows product info columns (image, nmId, article)
function hasProductCols(gb: GroupBy): boolean {
  return gb === "article" || gb === "size" || gb === "group";
}

function firstColLabel(gb: GroupBy): string {
  switch (gb) {
    case "article": case "size": case "group": return "Товар";
    case "store": return "Магазин";
    case "day": return "Дата";
    case "week": return "Неделя";
    case "month": return "Месяц";
    case "brand": return "Бренд";
    case "subject": return "Предмет";
  }
}

export default function AnalyticsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const [period, setPeriod] = useState({ from: THREE_MO_AGO, to: TODAY });
  const [comparePeriod, setComparePeriod] = useState({ from: PREV_START, to: PREV_END });
  const [groupBy, setGroupBy] = useState<GroupBy>("article");
  const [sortKey, setSortKey] = useState<string>("revenueSeller");
  const [sortAsc, setSortAsc] = useState(false);

  // Запрашиваем аналитику воронки у WB для выбранного периода (как МП Факт)
  const fetchAnalytics = useAction(api.actions.fetchAnalytics);
  const fetchedRef = useRef("");
  useEffect(() => {
    const activeShops = shopId ? shops.filter((s) => s._id === shopId) : shops;
    if (activeShops.length === 0) return;
    const key = `${shopId ?? "all"}:${period.from}:${period.to}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    // Последовательно для каждого магазина, чтобы не превысить лимит WB
    (async () => {
      for (const shop of activeShops) {
        try {
          await fetchAnalytics({ shopId: shop._id, dateFrom: period.from, dateTo: period.to });
        } catch { /* logged on backend */ }
      }
    })();
  }, [shopId, shops, period.from, period.to, fetchAnalytics]);

  const data = useQuery(api.analytics.getSalesAnalytics, {
    shopId, dateFrom: period.from, dateTo: period.to, groupBy,
  });
  const rows = data ?? [];

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = (a as any)[sortKey]; const bv = (b as any)[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
  }, [rows, sortKey, sortAsc]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const col of COLUMNS) t[col.key] = 0;
    for (const row of sorted) {
      for (const col of COLUMNS) t[col.key] += Number((row as any)[col.key]) || 0;
    }
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

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const groupSpans = getGroupSpans();
  const showProduct = hasProductCols(groupBy);
  const tabLabel = TABS.find((t) => t.key === groupBy)?.label ?? "";

  // Extra sticky columns count for product tabs
  const stickyCount = showProduct ? 3 : 1; // Товар + Арт.WB + Арт.пост. | or just label

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Tabs — plain text like МП Факт */}
      <div className="flex flex-wrap gap-0 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              groupBy === tab.key
                ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600"
                : "text-gray-500 hover:text-gray-800"
            )}
            onClick={() => { setGroupBy(tab.key); setSortKey("revenueSeller"); setSortAsc(false); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Period + Download */}
      <div className="flex items-center justify-between">
        <PeriodSelector
          period={period}
          comparePeriod={comparePeriod}
          onChange={(p, cp) => { setPeriod(p); setComparePeriod(cp); }}
        />
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          size="sm"
          onClick={() => exportAnalyticsXlsx(sorted, COLUMNS, tabLabel, totals, showProduct)}
        >
          <Download className="h-4 w-4" />
          Скачать xlsx
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px] border-collapse whitespace-nowrap">
          <thead>
            {/* Group header row */}
            <tr className="border-b border-gray-200">
              {showProduct ? (
                <>
                  <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-200 min-w-[220px]" rowSpan={2}>
                    Товар
                  </th>
                  <th className="sticky left-[220px] z-30 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-200 min-w-[80px]" rowSpan={2}>
                    Арт.WB
                  </th>
                  <th className="sticky left-[300px] z-30 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-200 min-w-[100px]" rowSpan={2}>
                    Арт.пост.
                  </th>
                </>
              ) : (
                <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-r border-gray-200 min-w-[140px]" rowSpan={2}>
                  {firstColLabel(groupBy)}
                </th>
              )}
              {groupSpans.map((gs, i) => (
                <th
                  key={i}
                  colSpan={gs.count}
                  className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-b border-gray-200 border-x border-gray-100"
                >
                  {gs.group}
                </th>
              ))}
            </tr>
            {/* Column header row */}
            <tr className="border-b border-gray-300 bg-gray-50">
              {COLUMNS.map((col) => (
                <th
                  key={col.key + col.group}
                  className="px-2 py-2 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 border-x border-gray-100"
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-0.5 justify-end">
                    {col.label}
                    {sortKey === col.key && (
                      sortAsc ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data && (
              <tr><td colSpan={COLUMNS.length + stickyCount} className="py-16 text-center text-gray-400">Загрузка данных...</td></tr>
            )}
            {data && sorted.length === 0 && (
              <tr><td colSpan={COLUMNS.length + stickyCount} className="py-16 text-center text-gray-400">Нет данных за выбранный период</td></tr>
            )}
            {sorted.map((row, i) => (
              <tr key={row.label + i} className="border-b border-gray-100 hover:bg-blue-50/30">
                {/* Sticky first columns */}
                {showProduct ? (
                  <>
                    {/* Товар: image + name */}
                    <td className="sticky left-0 z-10 bg-white px-2 py-1.5 border-r border-gray-100">
                      <div className="flex items-center gap-2 min-w-[200px]">
                        {row.imageUrl ? (
                          <img
                            src={row.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded object-cover flex-shrink-0 border border-gray-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
                        )}
                        <span className="text-xs text-gray-800 truncate max-w-[160px]" title={row.productName || row.label}>
                          {row.productName || row.label || `nmId: ${row.nmId}`}
                        </span>
                      </div>
                    </td>
                    <td className="sticky left-[220px] z-10 bg-white px-2 py-1.5 text-xs text-gray-600 font-mono border-r border-gray-100">
                      {row.nmId || ""}
                    </td>
                    <td className="sticky left-[300px] z-10 bg-white px-2 py-1.5 text-xs text-gray-600 border-r border-gray-100">
                      {row.supplierArticle || ""}
                    </td>
                  </>
                ) : (
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-xs font-medium text-gray-900 border-r border-gray-100 truncate max-w-[200px]" title={row.label}>
                    {row.label || "(пусто)"}
                  </td>
                )}

                {/* Data columns */}
                {COLUMNS.map((col) => {
                  const val = Number((row as any)[col.key]) || 0;
                  const isBadge = col.key === "profitPct" || col.key === "roi";

                  if (isBadge) {
                    const badgeClass = col.key === "roi" ? roiBadge(val) : profitBadge(val);
                    return (
                      <td key={col.key + col.group} className="px-2 py-1.5 text-center">
                        <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-semibold", badgeClass)}>
                          {Math.round(val)}%
                        </span>
                      </td>
                    );
                  }

                  const isProfit = col.key === "profit" || col.key === "grossProfit" || col.key === "profitPerUnit";
                  const textColor = isProfit
                    ? val > 0 ? "text-green-700" : val < 0 ? "text-red-600" : ""
                    : col.neg && val > 0 ? "text-red-600" : "";

                  return (
                    <td key={col.key + col.group} className={cn("px-2 py-1.5 text-right", textColor)}>
                      {col.neg && val > 0 ? `-${fmtNum(val, col.unit)}` : fmtNum(val, col.unit)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                <td className={cn("sticky left-0 z-10 bg-gray-50 px-3 py-2.5 border-r border-gray-200 text-xs")} colSpan={stickyCount}>
                  Итого ({sorted.length})
                </td>
                {COLUMNS.map((col) => {
                  const val = totals[col.key] ?? 0;
                  const isBadge = col.key === "profitPct" || col.key === "roi";
                  if (isBadge) {
                    const badgeClass = col.key === "roi" ? roiBadge(val) : profitBadge(val);
                    return (
                      <td key={col.key + col.group} className="px-2 py-2.5 text-center">
                        <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-semibold", badgeClass)}>
                          {Math.round(val)}%
                        </span>
                      </td>
                    );
                  }
                  const isProfit = col.key === "profit" || col.key === "grossProfit" || col.key === "profitPerUnit";
                  const textColor = isProfit
                    ? val > 0 ? "text-green-700" : val < 0 ? "text-red-600" : ""
                    : col.neg && val > 0 ? "text-red-600" : "";
                  return (
                    <td key={col.key + col.group} className={cn("px-2 py-2.5 text-right", textColor)}>
                      {col.neg && val > 0 ? `-${fmtNum(val, col.unit)}` : fmtNum(val, col.unit)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="text-xs text-gray-400 text-right">
          Показано: {sorted.length} | Страница 1 из 1
        </div>
      )}
    </div>
  );
}
