"use client";
import { AuthGate } from "@/components/auth/AuthGate";
import { shopsListMineRef, getReturnsRef } from "@/lib/convex-refs";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { format, subDays } from "date-fns";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import {
  FinlyBadge,
  FinlyCard,
  FinlyDataTable,
  FinlyEmptyState,
  FinlyMetricTile,
} from "@/components/finly";

const TODAY = format(new Date(), "yyyy-MM-dd");
const MONTH_AGO = format(subDays(new Date(), 29), "yyyy-MM-dd");
const PREV_END = format(subDays(new Date(), 30), "yyyy-MM-dd");
const PREV_START = format(subDays(new Date(), 59), "yyyy-MM-dd");

function statusTone(
  status: string | undefined,
): "success" | "danger" | "info" | "gold" | "muted" {
  const value = (status ?? "").toLowerCase();
  if (!value) return "muted";
  if (value.includes("отмен") || value.includes("cancel")) return "danger";
  if (value.includes("готов") || value.includes("получ") || value.includes("complete")) {
    return "success";
  }
  if (value.includes("пути") || value.includes("process")) return "info";
  return "gold";
}

export default function ReturnsPage() {
  return (
    <AuthGate>
      <ReturnsContent />
    </AuthGate>
  );
}

function ReturnsContent() {
  const shops = useQuery(shopsListMineRef) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const [period, setPeriod] = useState({ from: MONTH_AGO, to: TODAY });
  const [comparePeriod, setComparePeriod] = useState({ from: PREV_START, to: PREV_END });

  const returns = useQuery(getReturnsRef, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];
  const skuCount = new Set(returns.map((row) => row.nmId)).size;
  const warehouseCount = new Set(returns.map((row) => row.warehouseName)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Возвраты
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Возвраты по заказам, складам и текущим статусам.
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

      <FinlyCard accent="teal" className="p-3">
        <PeriodSelector
          period={period}
          comparePeriod={comparePeriod}
          onChange={(p, cp) => { setPeriod(p); setComparePeriod(cp); }}
        />
      </FinlyCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FinlyMetricTile
          label="Всего возвратов"
          value={returns.length}
          accent="flame"
        />
        <FinlyMetricTile
          label="SKU в возвратах"
          value={skuCount}
          accent="gold"
        />
        <FinlyMetricTile
          label="Складов"
          value={warehouseCount}
          accent="teal"
        />
      </div>

      <FinlyDataTable
        rows={returns}
        rowKey={(row) => row._id}
        empty={
          <FinlyEmptyState
            pose="empty-data"
            title="Нет возвратов"
            body="За выбранный период возвраты не найдены."
          />
        }
        columns={[
          {
            key: "returnDate",
            header: "Дата",
            className: "whitespace-nowrap text-xs",
          },
          {
            key: "nmId",
            header: "nmId",
            className: "font-mono text-xs",
          },
          {
            key: "orderId",
            header: "ID заказа",
            className: "font-mono text-xs",
          },
          {
            key: "warehouseName",
            header: "Склад",
            className: "text-xs",
          },
          {
            key: "status",
            header: "Статус",
            render: (row) => (
              <FinlyBadge tone={statusTone(row.status)}>
                {row.status || "—"}
              </FinlyBadge>
            ),
          },
        ]}
      />
    </div>
  );
}
