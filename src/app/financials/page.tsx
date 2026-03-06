"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format, subDays } from "date-fns";
import { groupByReport, groupByWeek, groupByReportFull, MpfactReportRow } from "@/lib/financials";
import * as XLSX from "xlsx";

const fmt = (n: number | null) => n === null ? "—" : Math.round(n).toLocaleString("ru");
const fmtDec = (n: number | null) => n === null ? "—" : n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtPct = (n: number | null) => n === null ? "—" : n.toFixed(2);

function PctBadge({ value }: { value: number }) {
  const color = value >= 20 ? "bg-green-100 text-green-700" : value >= 10 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{value.toFixed(1)}%</span>;
}

const MPFACT_COLUMNS: { key: keyof MpfactReportRow; label: string; type: "text" | "money" | "pct" | "int" }[] = [
  { key: "shopName", label: "Магазин", type: "text" },
  { key: "reportId", label: "Номер отчета", type: "int" },
  { key: "interval", label: "Интервал", type: "text" },
  { key: "profit", label: "Прибыль, ₽", type: "money" },
  { key: "profitPct", label: "% прибыли", type: "pct" },
  { key: "roi", label: "ROI, %", type: "pct" },
  { key: "salesSeller", label: "Продажи (цена продавца), ₽", type: "money" },
  { key: "returnsSeller", label: "Возвраты (цена продавца), ₽", type: "money" },
  { key: "revenueSeller", label: "Выручка (цена продавца), ₽", type: "money" },
  { key: "salesWbDisc", label: "Продажи (со скидкой WB), ₽", type: "money" },
  { key: "returnsWbDisc", label: "Возвраты (со скидкой WB), ₽", type: "money" },
  { key: "revenueWbDisc", label: "Выручка (со скидкой WB), ₽", type: "money" },
  { key: "forPaySales", label: "К перечислению (продажи), ₽", type: "money" },
  { key: "forPayReturns", label: "К перечислению (возвраты), ₽", type: "money" },
  { key: "forPayTotal", label: "К перечислению итого, ₽", type: "money" },
  { key: "salesQty", label: "Кол-во продаж, шт", type: "int" },
  { key: "returnsQty", label: "Кол-во возвратов, шт ", type: "int" },
  { key: "buyoutsQty", label: "Количество выкупов, шт ", type: "int" },
  { key: "returnsPct", label: "% возвратов", type: "pct" },
  { key: "costTotal", label: "Себест., ₽", type: "money" },
  { key: "costPct", label: "% себест.", type: "pct" },
  { key: "grossProfit", label: "Валовая прибыль, ₽", type: "money" },
  { key: "grossProfitPct", label: "% валовой прибыли", type: "pct" },
  { key: "commission", label: "Комиссия, ₽", type: "money" },
  { key: "commissionPct", label: "% комиссии", type: "pct" },
  { key: "logistics", label: "Логистика, ₽", type: "money" },
  { key: "logisticsPct", label: "% логистики", type: "pct" },
  { key: "surcharges", label: "Доплаты, ₽", type: "money" },
  { key: "surchargesPct", label: "% доплат", type: "pct" },
  { key: "penalties", label: "Штрафы, ₽", type: "money" },
  { key: "penaltiesPct", label: "% штрафов", type: "pct" },
  { key: "storage", label: "Хранение, ₽", type: "money" },
  { key: "storagePct", label: "% хранения", type: "pct" },
  { key: "paidAcceptance", label: "Платная приемка, ₽", type: "money" },
  { key: "paidAcceptancePct", label: "% платной приемки", type: "pct" },
  { key: "advertising", label: "Реклама, ₽", type: "money" },
  { key: "loanPayment", label: "Выплата по кредиту", type: "money" },
  { key: "advertisingPct", label: "% рекламы", type: "pct" },
  { key: "otherDeductions", label: "Прочие удержания, ₽", type: "money" },
  { key: "otherDeductionsPct", label: "% прочих удержаний", type: "pct" },
  { key: "otherCharges", label: "Прочие начисления, ₽", type: "money" },
  { key: "otherChargesPct", label: "% прочих начислений", type: "pct" },
  { key: "mpExpenses", label: "Расходы МП, ₽", type: "money" },
  { key: "profitBeforeTax", label: "Прибыль без налога, ₽", type: "money" },
  { key: "profitBeforeTaxPct", label: "% прибыли без налога", type: "pct" },
  { key: "tax", label: "Налог, ₽", type: "money" },
  { key: "taxPct", label: "% налога", type: "pct" },
  { key: "payoutToAccount", label: "К выплате на р/с, ₽", type: "money" },
  { key: "payoutToAccountPct", label: "К выплате на р/с, %", type: "pct" },
];

function formatCell(value: unknown, type: string): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (type === "text") return String(value);
  if (type === "int") return Math.round(n).toLocaleString("ru");
  if (type === "pct") return n.toFixed(2);
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function cellColor(value: unknown, type: string): string {
  if (value === null || value === undefined || type === "text" || type === "int") return "";
  const n = Number(value);
  if (type === "pct") {
    if (n > 0) return "text-green-600";
    if (n < 0) return "text-red-600";
  }
  if (type === "money") {
    if (n < 0) return "text-red-600";
    if (n > 0) return "text-green-700";
  }
  return "";
}

export default function FinancialsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const [shopId, setShopId] = useState<string>("");
  const today = format(new Date(), "yyyy-MM-dd");
  const monthAgo = format(subDays(new Date(), 60), "yyyy-MM-dd");

  const activeShopId = (shopId || shops[0]?._id) as Id<"shops"> | undefined;
  const activeShopName = shops.find((s) => s._id === activeShopId)?.name ?? "";

  const rows = useQuery(
    api.financials.getReports,
    activeShopId ? { shopId: activeShopId, dateFrom: monthAgo, dateTo: today } : "skip"
  ) ?? [];

  const costs = useQuery(
    api.costs.listByShop,
    activeShopId ? { shopId: activeShopId } : "skip"
  ) ?? [];

  const campaigns = useQuery(
    api.dashboard.getCampaigns,
    activeShopId ? { shopId: activeShopId, dateFrom: monthAgo, dateTo: today } : "skip"
  ) ?? [];

  const costMap = new Map(costs.map((c) => [c.nmId, c.cost]));
  const campaignsSpent = campaigns.reduce((sum, c) => sum + (c.spent ?? 0), 0);

  const fullReports = groupByReportFull(rows as any, activeShopName, costMap, campaignsSpent);
  const byWeek = groupByWeek(rows as any);
  const penalties = rows.filter((r) => r.docTypeName === "Штраф" || r.penalty > 0);

  const handleExportXlsx = () => {
    const exportData = fullReports.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const col of MPFACT_COLUMNS) {
        const val = r[col.key];
        obj[col.label] = val === null ? "" : val;
      }
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Финансовый отчет");
    XLSX.writeFile(wb, `financial_report_${today}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Финансовые отчеты Wildberries</h1>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={shopId || shops[0]?._id || ""}
            onChange={(e) => setShopId(e.target.value)}
          >
            {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <Button variant="outline" onClick={handleExportXlsx} disabled={fullReports.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Скачать XLSX
        </Button>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Финансовые отчеты</TabsTrigger>
          <TabsTrigger value="detail">Детализация</TabsTrigger>
          <TabsTrigger value="fines">Штрафы</TabsTrigger>
        </TabsList>

        {/* Tab 1: Full MPfact-format reports */}
        <TabsContent value="reports" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto relative">
            <table className="text-sm border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  {MPFACT_COLUMNS.map((col, i) => (
                    <th
                      key={col.key}
                      className={`p-3 ${col.type === "text" ? "text-left" : "text-right"} ${
                        i < 3 ? "sticky bg-gray-50 z-10" : ""
                      }`}
                      style={i === 0 ? { left: 0 } : i === 1 ? { left: "150px" } : i === 2 ? { left: "310px" } : undefined}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fullReports.map((r) => (
                  <tr key={r.reportId} className="border-b hover:bg-gray-50">
                    {MPFACT_COLUMNS.map((col, i) => (
                      <td
                        key={col.key}
                        className={`p-3 ${col.type === "text" ? "text-left" : "text-right"} ${cellColor(r[col.key], col.type)} ${
                          i < 3 ? "sticky bg-white z-10" : ""
                        }`}
                        style={i === 0 ? { left: 0 } : i === 1 ? { left: "150px" } : i === 2 ? { left: "310px" } : undefined}
                      >
                        {formatCell(r[col.key], col.type)}
                      </td>
                    ))}
                  </tr>
                ))}
                {fullReports.length === 0 && (
                  <tr><td colSpan={MPFACT_COLUMNS.length} className="p-8 text-center text-gray-400">Нет данных. Запустите синхронизацию.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 2: Detalization by week */}
        <TabsContent value="detail" className="mt-4">
          <Tabs defaultValue="week">
            <TabsList className="text-xs">
              <TabsTrigger value="week">По неделям</TabsTrigger>
              <TabsTrigger value="report">По отчётам</TabsTrigger>
            </TabsList>
            <TabsContent value="week" className="mt-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="p-3 text-left">Неделя</th>
                      <th className="p-3 text-right">Продажи ₽</th>
                      <th className="p-3 text-right">Возвраты ₽</th>
                      <th className="p-3 text-right">Выручка ₽</th>
                      <th className="p-3 text-right">После СПП ₽</th>
                      <th className="p-3 text-right">Продажи шт</th>
                      <th className="p-3 text-right">Возвраты шт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byWeek.map((w) => (
                      <tr key={w.week} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{w.week}</td>
                        <td className="p-3 text-right">{fmt(w.salesRevenue)} ₽</td>
                        <td className="p-3 text-right text-red-600">{fmt(w.returnsRevenue)} ₽</td>
                        <td className="p-3 text-right font-semibold">{fmt(w.revenue)} ₽</td>
                        <td className="p-3 text-right">{fmt(w.forPay)} ₽</td>
                        <td className="p-3 text-right">{w.salesCount}</td>
                        <td className="p-3 text-right text-red-600">{w.returnsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab 3: Fines */}
        <TabsContent value="fines" className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="p-3 text-left">Дата</th>
                  <th className="p-3 text-left">Артикул</th>
                  <th className="p-3 text-right">Штраф ₽</th>
                </tr>
              </thead>
              <tbody>
                {penalties.map((p, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-600">{p.realizationreportDate}</td>
                    <td className="p-3">{p.supplierArticle}</td>
                    <td className="p-3 text-right text-red-600 font-semibold">{fmt(p.penalty)} ₽</td>
                  </tr>
                ))}
                {penalties.length === 0 && (
                  <tr><td colSpan={3} className="p-8 text-center text-gray-400">Штрафов нет</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
