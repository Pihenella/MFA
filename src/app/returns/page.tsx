"use client";
import { shopsListRef, getReturnsRef } from "@/lib/convex-refs";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { format, subDays } from "date-fns";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { Badge } from "@/components/ui/badge";

const TODAY = format(new Date(), "yyyy-MM-dd");
const MONTH_AGO = format(subDays(new Date(), 29), "yyyy-MM-dd");
const PREV_END = format(subDays(new Date(), 30), "yyyy-MM-dd");
const PREV_START = format(subDays(new Date(), 59), "yyyy-MM-dd");

export default function ReturnsPage() {
  const shops = useQuery(shopsListRef) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const [period, setPeriod] = useState({ from: MONTH_AGO, to: TODAY });
  const [comparePeriod, setComparePeriod] = useState({ from: PREV_START, to: PREV_END });

  const returns = useQuery(getReturnsRef, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Возвраты</h1>
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

      <div className="flex items-center gap-3">
        <Badge variant="outline">Всего возвратов: {returns.length}</Badge>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">nmId</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID заказа</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Склад</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 text-xs whitespace-nowrap">{r.returnDate}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.nmId}</td>
                <td className="px-3 py-2 text-xs font-mono">{r.orderId}</td>
                <td className="px-3 py-2 text-xs">{r.warehouseName}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{r.status || "—"}</Badge>
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">Нет возвратов за выбранный период</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
