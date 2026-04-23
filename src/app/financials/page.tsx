"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useLayoutEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  groupByReportFull,
  groupByPeriodFull,
  MpfactReportRow,
  MpfactDetailRow,
} from "@/lib/financials";
import * as XLSX from "xlsx";

const fmt = (n: number | null) =>
  n === null ? "—" : Math.round(n).toLocaleString("ru");

const PERIOD_PRESETS = [
  { label: "7 дней", days: 7 },
  { label: "14 дней", days: 14 },
  { label: "30 дней", days: 30 },
  { label: "60 дней", days: 60 },
  { label: "90 дней", days: 90 },
];

// ---- Column definitions ----

const REPORT_COLUMNS: {
  key: keyof MpfactReportRow;
  label: string;
  type: "text" | "money" | "pct" | "int";
}[] = [
  { key: "shopName", label: "Магазин", type: "text" },
  { key: "reportId", label: "Номер отчета", type: "int" },
  { key: "interval", label: "Интервал", type: "text" },
  { key: "profit", label: "Прибыль, ₽", type: "money" },
  { key: "profitPct", label: "% прибыли", type: "pct" },
  { key: "roi", label: "ROI, %", type: "pct" },
  { key: "salesSeller", label: "Продажи по цене продавца, ₽", type: "money" },
  { key: "returnsSeller", label: "Возвраты по цене продавца, ₽", type: "money" },
  { key: "revenueSeller", label: "Выручка по цене продавца, ₽", type: "money" },
  { key: "salesWbDisc", label: "Продажи после СПП, ₽", type: "money" },
  { key: "returnsWbDisc", label: "Возвраты после СПП, ₽", type: "money" },
  { key: "revenueWbDisc", label: "Выручка после СПП, ₽", type: "money" },
  { key: "forPaySales", label: "К перечислению (продажи), ₽", type: "money" },
  { key: "forPayReturns", label: "К перечислению (возвраты), ₽", type: "money" },
  { key: "forPayTotal", label: "К перечислению итого, ₽", type: "money" },
  { key: "salesQty", label: "Продажи, шт", type: "int" },
  { key: "returnsQty", label: "Возвраты, шт", type: "int" },
  { key: "buyoutsQty", label: "Выкупы, шт", type: "int" },
  { key: "returnsPct", label: "Возвраты, %", type: "pct" },
  { key: "costTotal", label: "Себестоимость, ₽", type: "money" },
  { key: "costPct", label: "Себестоимость, %", type: "pct" },
  { key: "grossProfit", label: "Валовая прибыль, ₽", type: "money" },
  { key: "grossProfitPct", label: "Валовая прибыль, %", type: "pct" },
  { key: "commission", label: "Комиссия, ₽", type: "money" },
  { key: "commissionPct", label: "Комиссия, %", type: "pct" },
  { key: "logistics", label: "Логистика, ₽", type: "money" },
  { key: "logisticsPct", label: "Логистика, %", type: "pct" },
  { key: "surcharges", label: "Компенсации, ₽", type: "money" },
  { key: "surchargesPct", label: "Компенсации, %", type: "pct" },
  { key: "penalties", label: "Штрафы, ₽", type: "money" },
  { key: "penaltiesPct", label: "Штрафы, %", type: "pct" },
  { key: "storage", label: "Хранение, ₽", type: "money" },
  { key: "storagePct", label: "Хранение, %", type: "pct" },
  { key: "paidAcceptance", label: "Платная приемка, ₽", type: "money" },
  { key: "paidAcceptancePct", label: "Платная приемка, %", type: "pct" },
  { key: "advertising", label: "Реклама, ₽", type: "money" },
  { key: "loanPayment", label: "Выплата по кредиту, ₽", type: "money" },
  { key: "advertisingPct", label: "Реклама, %", type: "pct" },
  { key: "otherDeductions", label: "Прочие услуги, ₽", type: "money" },
  { key: "otherDeductionsPct", label: "Прочие услуги, %", type: "pct" },
  { key: "otherCharges", label: "Прочие начисления, ₽", type: "money" },
  { key: "otherChargesPct", label: "Прочие начисления, %", type: "pct" },
  { key: "mpExpenses", label: "Расходы МП, ₽", type: "money" },
  { key: "profitBeforeTax", label: "Маржинальная прибыль, ₽", type: "money" },
  { key: "profitBeforeTaxPct", label: "Маржинальная прибыль, %", type: "pct" },
  { key: "tax", label: "Налог, ₽", type: "money" },
  { key: "taxPct", label: "Налог, %", type: "pct" },
  { key: "payoutToAccount", label: "К выплате на р/с, ₽", type: "money" },
  { key: "payoutToAccountPct", label: "К выплате на р/с, %", type: "pct" },
];

const DETAIL_COLUMNS: {
  key: keyof MpfactDetailRow;
  label: string;
  type: "text" | "money" | "pct" | "int";
}[] = [
  { key: "date", label: "Дата", type: "text" },
  { key: "year", label: "Год", type: "int" },
  { key: "month", label: "Месяц", type: "text" },
  { key: "profit", label: "Прибыль, ₽", type: "money" },
  { key: "profitPct", label: "% прибыли", type: "pct" },
  { key: "roi", label: "ROI, %", type: "pct" },
  { key: "salesSeller", label: "Продажи по цене продавца, ₽", type: "money" },
  { key: "returnsSeller", label: "Возвраты по цене продавца, ₽", type: "money" },
  { key: "revenueSeller", label: "Выручка по цене продавца, ₽", type: "money" },
  { key: "salesWbDisc", label: "Продажи после СПП, ₽", type: "money" },
  { key: "returnsWbDisc", label: "Возвраты после СПП, ₽", type: "money" },
  { key: "revenueWbDisc", label: "Выручка после СПП, ₽", type: "money" },
  { key: "forPaySales", label: "К перечислению (продажи), ₽", type: "money" },
  { key: "forPayReturns", label: "К перечислению (возвраты), ₽", type: "money" },
  { key: "forPayTotal", label: "К перечислению итого, ₽", type: "money" },
  { key: "salesQty", label: "Продажи, шт", type: "int" },
  { key: "returnsQty", label: "Возвраты, шт", type: "int" },
  { key: "buyoutsQty", label: "Выкупы, шт", type: "int" },
  { key: "returnsPct", label: "Возвраты, %", type: "pct" },
  { key: "costTotal", label: "Себестоимость, ₽", type: "money" },
  { key: "costPct", label: "Себестоимость, %", type: "pct" },
  { key: "grossProfit", label: "Валовая прибыль, ₽", type: "money" },
  { key: "grossProfitPct", label: "Валовая прибыль, %", type: "pct" },
  { key: "commission", label: "Комиссия, ₽", type: "money" },
  { key: "commissionPct", label: "Комиссия, %", type: "pct" },
  { key: "logistics", label: "Логистика, ₽", type: "money" },
  { key: "logisticsPct", label: "Логистика, %", type: "pct" },
  { key: "surcharges", label: "Компенсации, ₽", type: "money" },
  { key: "surchargesPct", label: "Компенсации, %", type: "pct" },
  { key: "penalties", label: "Штрафы, ₽", type: "money" },
  { key: "penaltiesPct", label: "Штрафы, %", type: "pct" },
  { key: "storage", label: "Хранение, ₽", type: "money" },
  { key: "storagePct", label: "Хранение, %", type: "pct" },
  { key: "paidAcceptance", label: "Платная приемка, ₽", type: "money" },
  { key: "paidAcceptancePct", label: "Платная приемка, %", type: "pct" },
  { key: "advertising", label: "Реклама, ₽", type: "money" },
  { key: "advertisingPct", label: "Реклама, %", type: "pct" },
  { key: "otherDeductions", label: "Прочие услуги, ₽", type: "money" },
  { key: "otherDeductionsPct", label: "Прочие услуги, %", type: "pct" },
  { key: "otherCharges", label: "Прочие начисления, ₽", type: "money" },
  { key: "otherChargesPct", label: "Прочие начисления, %", type: "pct" },
  { key: "mpExpenses", label: "Расходы МП, ₽", type: "money" },
  { key: "profitBeforeTax", label: "Маржинальная прибыль, ₽", type: "money" },
  { key: "profitBeforeTaxPct", label: "Маржинальная прибыль, %", type: "pct" },
  { key: "tax", label: "Налог, ₽", type: "money" },
  { key: "taxPct", label: "Налог, %", type: "pct" },
];

// ---- Helpers ----

function formatCell(value: unknown, type: string): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (type === "text") return String(value);
  if (type === "int") return Math.round(n).toLocaleString("ru");
  if (type === "pct") return n.toFixed(2);
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function cellColor(value: unknown, type: string): string {
  if (value === null || value === undefined || type === "text" || type === "int")
    return "";
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

// ---- Reusable wide table ----

function WideTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  stickyCount,
}: {
  columns: { key: keyof T; label: string; type: "text" | "money" | "pct" | "int" }[];
  data: T[];
  rowKey: (row: T, i: number) => string | number;
  stickyCount: number;
}) {
  // Измеряем реальные ширины sticky-колонок и считаем накопленный left-offset.
  // Раньше offsets были захардкожены [0, 150, 310] — sticky-колонки накладывались
  // друг на друга при прокрутке и накрывали следующие колонки (включая «Прибыль»).
  const headerRefs = useRef<Array<HTMLTableCellElement | null>>([]);
  const [stickyOffsets, setStickyOffsets] = useState<number[]>(() =>
    Array(stickyCount).fill(0),
  );

  useLayoutEffect(() => {
    const measure = () => {
      const offsets: number[] = [];
      let acc = 0;
      for (let i = 0; i < stickyCount; i++) {
        offsets.push(acc);
        const el = headerRefs.current[i];
        if (el) acc += el.getBoundingClientRect().width;
      }
      setStickyOffsets((prev) =>
        prev.length === offsets.length && prev.every((v, i) => v === offsets[i])
          ? prev
          : offsets,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    headerRefs.current.slice(0, stickyCount).forEach((el) => el && ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stickyCount, columns.length, data.length]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto relative">
      <table className="text-sm border-collapse whitespace-nowrap">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
            {columns.map((col, i) => (
              <th
                key={String(col.key)}
                ref={(el) => { if (i < stickyCount) headerRefs.current[i] = el; }}
                className={`p-3 ${col.type === "text" ? "text-left" : "text-right"} ${
                  i < stickyCount ? "sticky bg-gray-50 z-20" : ""
                }`}
                style={
                  i < stickyCount
                    ? { left: `${stickyOffsets[i] ?? 0}px` }
                    : undefined
                }
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={rowKey(row, ri)} className="border-b hover:bg-gray-50">
              {columns.map((col, i) => (
                <td
                  key={String(col.key)}
                  className={`p-3 ${col.type === "text" ? "text-left" : "text-right"} ${cellColor(row[col.key], col.type)} ${
                    i < stickyCount ? "sticky bg-white z-10" : ""
                  }`}
                  style={
                    i < stickyCount
                      ? { left: `${stickyOffsets[i] ?? 0}px` }
                      : undefined
                  }
                >
                  {formatCell(row[col.key], col.type)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="p-8 text-center text-gray-400"
              >
                Нет данных. Запустите синхронизацию.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- Main page ----

export default function FinancialsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const [shopId, setShopId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(() =>
    format(subDays(new Date(), 60), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [granularity, setGranularity] = useState<"day" | "week" | "month">(
    "month",
  );

  const activeShopId = (shopId || shops[0]?._id) as Id<"shops"> | undefined;
  const activeShopName =
    shops.find((s) => s._id === activeShopId)?.name ?? "";

  const rows =
    useQuery(
      api.financials.getReports,
      activeShopId
        ? { shopId: activeShopId, dateFrom, dateTo }
        : "skip",
    ) ?? [];

  const costs =
    useQuery(
      api.costs.listByShop,
      activeShopId ? { shopId: activeShopId } : "skip",
    ) ?? [];

  const campaigns =
    useQuery(
      api.dashboard.getCampaigns,
      activeShopId
        ? { shopId: activeShopId, dateFrom, dateTo }
        : "skip",
    ) ?? [];

  const costMap = new Map(costs.map((c) => [c.nmId, c.cost]));
  const campaignsSpent = campaigns.reduce(
    (sum, c) => sum + (c.spent ?? 0),
    0,
  );

  const fullReports = groupByReportFull(
    rows as any,
    activeShopName,
    costMap,
    campaignsSpent,
  );
  const detailRows = groupByPeriodFull(
    rows as any,
    granularity,
    costMap,
    campaignsSpent,
  );
  const penalties = rows.filter(
    (r) => r.docTypeName === "Штраф" || r.penalty > 0,
  );

  const applyPreset = (days: number) => {
    setDateFrom(format(subDays(new Date(), days), "yyyy-MM-dd"));
    setDateTo(format(new Date(), "yyyy-MM-dd"));
  };

  const handleExportReports = () => {
    const exportData = fullReports.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const col of REPORT_COLUMNS) {
        obj[col.label] = r[col.key] === null ? "" : r[col.key];
      }
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Финансовый отчет");
    XLSX.writeFile(wb, `financial_report_${dateTo}.xlsx`);
  };

  const handleExportDetail = () => {
    const granLabel =
      granularity === "day"
        ? "дням"
        : granularity === "week"
          ? "неделям"
          : "месяцам";
    const exportData = detailRows.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const col of DETAIL_COLUMNS) {
        obj[col.label] = r[col.key] === null ? "" : r[col.key];
      }
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Детализация по ${granLabel}`);
    XLSX.writeFile(wb, `detail_${granularity}_${dateTo}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header: title + shop selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Финансовые отчеты</h1>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={shopId || shops[0]?._id || ""}
            onChange={(e) => setShopId(e.target.value)}
          >
            {shops.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">От:</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">До:</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-1">
          {PERIOD_PRESETS.map((p) => (
            <Button
              key={p.days}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(p.days)}
              className="text-xs"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Финансовые отчеты</TabsTrigger>
          <TabsTrigger value="detail">Детализация</TabsTrigger>
          <TabsTrigger value="fines">Штрафы</TabsTrigger>
        </TabsList>

        {/* Tab 1: Reports */}
        <TabsContent value="reports" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleExportReports}
              disabled={fullReports.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Скачать XLSX
            </Button>
          </div>
          <WideTable
            columns={REPORT_COLUMNS}
            data={fullReports}
            rowKey={(r) => r.reportId}
            stickyCount={3}
          />
        </TabsContent>

        {/* Tab 2: Detail by day/week/month */}
        <TabsContent value="detail" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(
                [
                  { value: "day", label: "По дням" },
                  { value: "week", label: "По неделям" },
                  { value: "month", label: "По месяцам" },
                ] as const
              ).map((g) => (
                <Button
                  key={g.value}
                  variant={granularity === g.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGranularity(g.value)}
                >
                  {g.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleExportDetail}
              disabled={detailRows.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Скачать XLSX
            </Button>
          </div>
          <WideTable
            columns={DETAIL_COLUMNS}
            data={detailRows}
            rowKey={(r, i) => `${r.date}-${i}`}
            stickyCount={3}
          />
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
                    <td className="p-3 text-gray-600">
                      {p.realizationreportDate}
                    </td>
                    <td className="p-3">{p.supplierArticle}</td>
                    <td className="p-3 text-right text-red-600 font-semibold">
                      {fmt(p.penalty)} ₽
                    </td>
                  </tr>
                ))}
                {penalties.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-8 text-center text-gray-400"
                    >
                      Штрафов нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
