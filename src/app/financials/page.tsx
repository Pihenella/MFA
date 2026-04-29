"use client";
import { AuthGate } from "@/components/auth/AuthGate";
import { shopsListMineRef, getCampaignsRef, costsListByShopRef, getFinancialReportsRef } from "@/lib/convex-refs";
import { useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  FinlyButton,
  FinlyCard,
  FinlyDataTable,
  FinlyEmptyState,
  FinlyMetricTile,
  type FinlyDataTableColumn,
} from "@/components/finly";
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
  { key: "profitBeforeTax", label: "Прибыль без налога, ₽", type: "money" },
  { key: "profitBeforeTaxPct", label: "% прибыли без налога", type: "pct" },
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
  { key: "profitBeforeTax", label: "Прибыль без налога, ₽", type: "money" },
  { key: "profitBeforeTaxPct", label: "% прибыли без налога", type: "pct" },
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
    if (n > 0) return "text-rune-success";
    if (n < 0) return "text-rune-danger";
  }
  if (type === "money") {
    if (n < 0) return "text-rune-danger";
    if (n > 0) return "text-rune-success";
  }
  return "";
}

function fmtRub(n: number | null) {
  return n === null ? "—" : `${fmt(n)} ₽`;
}

function toFinlyColumns<T>(
  columns: {
    key: keyof T;
    label: string;
    type: "text" | "money" | "pct" | "int";
  }[],
): FinlyDataTableColumn<T>[] {
  return columns.map((col) => ({
    key: col.key,
    header: col.label,
    align: col.type === "text" ? "left" : "right",
    className: "whitespace-nowrap",
    render: (row) => {
      const value = row[col.key];
      return (
        <span className={cellColor(value, col.type)}>
          {formatCell(value, col.type)}
        </span>
      );
    },
  }));
}

// ---- Main page ----

export default function FinancialsPage() {
  return (
    <AuthGate>
      <FinancialsContent />
    </AuthGate>
  );
}

function FinancialsContent() {
  const shops = useQuery(shopsListMineRef) ?? [];
  const [shopId, setShopId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(() =>
    format(subDays(new Date(), 60), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [granularity, setGranularity] = useState<"day" | "week" | "month">(
    "month",
  );

  const activeShopId = (shopId || shops[0]?._id) as Id<"shops"> | undefined;
  const activeShop = shops.find((s) => s._id === activeShopId);
  const activeShopName = activeShop?.name ?? "";
  const activeTaxRate = activeShop?.taxRatePercent ?? 6;

  const rows =
    useQuery(
      getFinancialReportsRef,
      activeShopId
        ? { shopId: activeShopId, dateFrom, dateTo }
        : "skip",
    ) ?? [];

  const costs =
    useQuery(
      costsListByShopRef,
      activeShopId ? { shopId: activeShopId } : "skip",
    ) ?? [];

  const campaigns =
    useQuery(
      getCampaignsRef,
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
    activeTaxRate,
  );
  const detailRows = groupByPeriodFull(
    rows as any,
    granularity,
    costMap,
    campaignsSpent,
    activeTaxRate,
  );
  const penalties = rows.filter(
    (r) => r.docTypeName === "Штраф" || r.penalty > 0,
  );
  const financialTotals = fullReports.reduce(
    (acc, row) => {
      acc.income += row.revenueSeller;
      acc.expenses += Math.abs(
        row.costTotal + row.mpExpenses + (row.tax ?? 0),
      );
      acc.profit += row.profit;
      return acc;
    },
    { income: 0, expenses: 0, profit: 0 },
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Финансовые отчеты
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            P&L по отчетам реализации, периодам и штрафам.
          </p>
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

      <FinlyCard accent="teal" className="flex flex-wrap items-end gap-3 p-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">От:</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">До:</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex gap-1 rounded-frame border border-border bg-background p-1">
          {PERIOD_PRESETS.map((p) => (
            <FinlyButton
              key={p.days}
              size="sm"
              variant="ghost"
              onClick={() => applyPreset(p.days)}
              className="text-xs text-muted-foreground"
            >
              {p.label}
            </FinlyButton>
          ))}
        </div>
      </FinlyCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FinlyMetricTile
          label="Приход"
          value={financialTotals.income}
          formatted={fmtRub(financialTotals.income)}
          accent="teal"
        />
        <FinlyMetricTile
          label="Расход"
          value={financialTotals.expenses}
          formatted={fmtRub(financialTotals.expenses)}
          accent="flame"
          invertDeltaColors
        />
        <FinlyMetricTile
          label="Прибыль"
          value={financialTotals.profit}
          formatted={fmtRub(financialTotals.profit)}
          accent={financialTotals.profit >= 0 ? "gold" : "flame"}
        />
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Финансовые отчеты</TabsTrigger>
          <TabsTrigger value="detail">Детализация</TabsTrigger>
          <TabsTrigger value="fines">Штрафы</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <FinlyButton
              variant="secondary"
              size="sm"
              onClick={handleExportReports}
              disabled={fullReports.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Скачать XLSX
            </FinlyButton>
          </div>
          <FinlyDataTable
            columns={toFinlyColumns<MpfactReportRow>(REPORT_COLUMNS)}
            rows={fullReports}
            rowKey={(r) => String(r.reportId)}
            empty={
              <FinlyEmptyState
                pose="empty-data"
                title="Нет финансовых данных"
                body="Запустите синхронизацию или выберите другой период."
              />
            }
          />
        </TabsContent>

        <TabsContent value="detail" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-frame border border-border bg-background p-1">
              {(
                [
                  { value: "day", label: "По дням" },
                  { value: "week", label: "По неделям" },
                  { value: "month", label: "По месяцам" },
                ] as const
              ).map((g) => (
                <FinlyButton
                  key={g.value}
                  variant={granularity === g.value ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setGranularity(g.value)}
                  className={
                    granularity !== g.value ? "text-muted-foreground" : ""
                  }
                >
                  {g.label}
                </FinlyButton>
              ))}
            </div>
            <FinlyButton
              variant="secondary"
              size="sm"
              onClick={handleExportDetail}
              disabled={detailRows.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Скачать XLSX
            </FinlyButton>
          </div>
          <FinlyDataTable
            columns={toFinlyColumns<MpfactDetailRow>(DETAIL_COLUMNS)}
            rows={detailRows}
            rowKey={(r) => `${r.date}-${r.year}-${r.month}`}
            empty={
              <FinlyEmptyState
                pose="empty-data"
                title="Нет детализации"
                body="Попробуйте выбрать другой период или магазин."
              />
            }
          />
        </TabsContent>

        <TabsContent value="fines" className="mt-4">
          <FinlyDataTable
            rows={penalties}
            rowKey={(row) => row._id}
            columns={[
              {
                key: "realizationreportDate",
                header: "Дата",
                render: (row) => (
                  <span className="text-muted-foreground">
                    {row.realizationreportDate}
                  </span>
                ),
              },
              { key: "supplierArticle", header: "Артикул" },
              {
                key: "penalty",
                header: "Штраф ₽",
                align: "right",
                render: (row) => (
                  <span className="font-semibold text-rune-danger">
                    {fmtRub(row.penalty)}
                  </span>
                ),
              },
            ]}
            empty={
              <FinlyEmptyState
                pose="empty-data"
                title="Штрафов нет"
                body="За выбранный период штрафы не найдены."
              />
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
