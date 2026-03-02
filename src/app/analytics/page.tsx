"use client";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format, subDays } from "date-fns";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { computeProductMetrics, type ProductMetrics } from "@/lib/productMetrics";
import { ArrowUp, ArrowDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TODAY = format(new Date(), "yyyy-MM-dd");
const MONTH_AGO = format(subDays(new Date(), 29), "yyyy-MM-dd");
const PREV_END = format(subDays(new Date(), 30), "yyyy-MM-dd");
const PREV_START = format(subDays(new Date(), 59), "yyyy-MM-dd");

type SortKey = keyof ProductMetrics;

const COLUMNS: { key: SortKey; label: string; unit?: string }[] = [
  { key: "nmId", label: "nmId" },
  { key: "supplierArticle", label: "Артикул" },
  { key: "subject", label: "Предмет" },
  { key: "views", label: "Просмотры", unit: "шт" },
  { key: "addToCart", label: "В корзину", unit: "шт" },
  { key: "addToCartRate", label: "Конв. корзина", unit: "%" },
  { key: "cartToOrderRate", label: "Конв. заказ", unit: "%" },
  { key: "salesRevenue", label: "Выручка", unit: "₽" },
  { key: "salesCount", label: "Продажи", unit: "шт" },
  { key: "returnsCount", label: "Возвраты", unit: "шт" },
  { key: "returnRate", label: "% возвр.", unit: "%" },
  { key: "cogs", label: "Себест.", unit: "₽" },
  { key: "grossProfit", label: "Вал. прибыль", unit: "₽" },
  { key: "commission", label: "Комиссия", unit: "₽" },
  { key: "logistics", label: "Логистика", unit: "₽" },
  { key: "storage", label: "Хранение", unit: "₽" },
  { key: "penalties", label: "Штрафы", unit: "₽" },
  { key: "ads", label: "Реклама", unit: "₽" },
  { key: "profit", label: "Прибыль", unit: "₽" },
  { key: "profitPercent", label: "Прибыль %", unit: "%" },
  { key: "roi", label: "ROI", unit: "%" },
];

function fmt(val: number, unit?: string): string {
  if (unit === "%") return `${val.toFixed(1)}%`;
  if (unit === "шт") return val.toLocaleString("ru");
  if (unit === "₽") return `${Math.round(val).toLocaleString("ru")} ₽`;
  return String(val);
}

export default function AnalyticsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const [period, setPeriod] = useState({ from: MONTH_AGO, to: TODAY });
  const [comparePeriod, setComparePeriod] = useState({ from: PREV_START, to: PREV_END });
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("salesRevenue");
  const [sortAsc, setSortAsc] = useState(false);

  const sales = useQuery(api.dashboard.getSales, { shopId, dateFrom: period.from, dateTo: period.to }) ?? [];
  const financials = useQuery(api.dashboard.getFinancials, { shopId, dateFrom: period.from, dateTo: period.to }) ?? [];
  const costs = useQuery(api.dashboard.getCosts, { shopId }) ?? [];
  const campaigns = useQuery(api.dashboard.getCampaigns, { shopId, dateFrom: period.from, dateTo: period.to }) ?? [];
  const nmReports = useQuery(api.dashboard.getNmReports, { shopId }) ?? [];

  const products = useMemo(
    () => computeProductMetrics({ sales, financials, costs, campaigns, nmReports }),
    [sales, financials, costs, campaigns, nmReports],
  );

  const filtered = useMemo(() => {
    let items = products;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          String(p.nmId).includes(q) ||
          p.supplierArticle.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q),
      );
    }
    items = [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return items;
  }, [products, search, sortKey, sortAsc]);

  const totals = useMemo(() => {
    const t = {
      views: 0, addToCart: 0, addToCartRate: 0, cartToOrderRate: 0,
      salesRevenue: 0, salesCount: 0, returnsCount: 0, returnRate: 0,
      cogs: 0, grossProfit: 0, commission: 0, logistics: 0,
      storage: 0, penalties: 0, ads: 0, profit: 0, profitPercent: 0, roi: 0,
    };
    for (const p of filtered) {
      t.views += p.views;
      t.addToCart += p.addToCart;
      t.salesRevenue += p.salesRevenue;
      t.salesCount += p.salesCount;
      t.returnsCount += p.returnsCount;
      t.cogs += p.cogs;
      t.grossProfit += p.grossProfit;
      t.commission += p.commission;
      t.logistics += p.logistics;
      t.storage += p.storage;
      t.penalties += p.penalties;
      t.ads += p.ads;
      t.profit += p.profit;
    }
    t.returnRate = t.salesCount > 0 ? (t.returnsCount / t.salesCount) * 100 : 0;
    t.profitPercent = t.salesRevenue > 0 ? (t.profit / t.salesRevenue) * 100 : 0;
    t.roi = t.cogs > 0 ? (t.profit / t.cogs) * 100 : 0;
    t.addToCartRate = t.views > 0 ? (t.addToCart / t.views) * 100 : 0;
    t.cartToOrderRate = t.addToCart > 0 ? (t.salesCount / t.addToCart) * 100 : 0;
    return t;
  }, [filtered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Аналитика продаж</h1>
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Поиск по артикулу или nmId..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
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
            {filtered.map((p) => (
              <tr key={p.nmId} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{p.nmId}</td>
                <td className="px-3 py-2 text-xs">{p.supplierArticle}</td>
                <td className="px-3 py-2 text-xs">{p.subject}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.views, "шт")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.addToCart, "шт")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.addToCartRate, "%")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.cartToOrderRate, "%")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.salesRevenue, "₽")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.salesCount, "шт")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.returnsCount, "шт")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.returnRate, "%")}</td>
                <td className="px-3 py-2 text-xs text-right">
                  {p.salesCount > 0 && p.cogs === 0 ? (
                    <span className="text-red-500 font-medium">! 0 ₽</span>
                  ) : (
                    fmt(p.cogs, "₽")
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.grossProfit, "₽")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.commission, "₽")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.logistics, "₽")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.storage, "₽")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.penalties, "₽")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.ads, "₽")}</td>
                <td className={cn("px-3 py-2 text-xs text-right font-medium", p.profit >= 0 ? "text-green-600" : "text-red-500")}>
                  {fmt(p.profit, "₽")}
                </td>
                <td className={cn("px-3 py-2 text-xs text-right", p.profitPercent >= 0 ? "text-green-600" : "text-red-500")}>
                  {fmt(p.profitPercent, "%")}
                </td>
                <td className={cn("px-3 py-2 text-xs text-right", p.roi >= 0 ? "text-green-600" : "text-red-500")}>
                  {fmt(p.roi, "%")}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold border-t border-gray-200">
              <td className="px-3 py-2 text-xs" colSpan={3}>Итого ({filtered.length} товаров)</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.views, "шт")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.addToCart, "шт")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.addToCartRate, "%")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.cartToOrderRate, "%")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.salesRevenue, "₽")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.salesCount, "шт")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.returnsCount, "шт")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.returnRate, "%")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.cogs, "₽")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.grossProfit, "₽")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.commission, "₽")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.logistics, "₽")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.storage, "₽")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.penalties, "₽")}</td>
              <td className="px-3 py-2 text-xs text-right">{fmt(totals.ads, "₽")}</td>
              <td className={cn("px-3 py-2 text-xs text-right font-medium", totals.profit >= 0 ? "text-green-600" : "text-red-500")}>
                {fmt(totals.profit, "₽")}
              </td>
              <td className={cn("px-3 py-2 text-xs text-right", totals.profitPercent >= 0 ? "text-green-600" : "text-red-500")}>
                {fmt(totals.profitPercent, "%")}
              </td>
              <td className={cn("px-3 py-2 text-xs text-right", totals.roi >= 0 ? "text-green-600" : "text-red-500")}>
                {fmt(totals.roi, "%")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
