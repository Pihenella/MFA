"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";
import { groupByReport, groupByWeek } from "@/lib/financials";

const fmt = (n: number) => Math.round(n).toLocaleString("ru");

function PctBadge({ value }: { value: number }) {
  const color = value >= 20 ? "bg-green-100 text-green-700" : value >= 10 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{value.toFixed(1)}%</span>;
}

export default function FinancialsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const [shopId, setShopId] = useState<string>("");
  const today = format(new Date(), "yyyy-MM-dd");
  const monthAgo = format(subDays(new Date(), 60), "yyyy-MM-dd");

  const rows = useQuery(
    api.financials.getReports,
    { shopId: (shopId || shops[0]?._id) as any, dateFrom: monthAgo, dateTo: today }
  ) ?? [];

  const reports = groupByReport(rows);
  const byWeek = groupByWeek(rows);
  const penalties = rows.filter((r) => r.docTypeName === "Штраф" || r.penalty > 0);

  return (
    <div className="space-y-6">
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

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Финансовые отчеты</TabsTrigger>
          <TabsTrigger value="detail">Детализация</TabsTrigger>
          <TabsTrigger value="fines">Штрафы</TabsTrigger>
        </TabsList>

        {/* Tab 1: Reports */}
        <TabsContent value="reports" className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="p-3 text-left">Период</th>
                  <th className="p-3 text-left">№ отчёта</th>
                  <th className="p-3 text-right">Прибыль ₽</th>
                  <th className="p-3 text-right">Прибыль %</th>
                  <th className="p-3 text-right">Продажи ₽</th>
                  <th className="p-3 text-right">Возвраты ₽</th>
                  <th className="p-3 text-right">Выручка ₽</th>
                  <th className="p-3 text-right">После СПП ₽</th>
                  <th className="p-3 text-right">Логистика ₽</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const profit = r.forPay - r.logistics - r.storage - r.penalty + r.compensation;
                  const profitPct = r.revenue > 0 ? (profit / r.revenue) * 100 : 0;
                  return (
                    <tr key={r.reportId} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-600">{r.dateFrom} — {r.dateTo}</td>
                      <td className="p-3 font-mono text-gray-500">{r.reportId}</td>
                      <td className="p-3 text-right font-semibold">{fmt(profit)} ₽</td>
                      <td className="p-3 text-right"><PctBadge value={profitPct} /></td>
                      <td className="p-3 text-right">{fmt(r.salesRevenue)} ₽</td>
                      <td className="p-3 text-right text-red-600">{fmt(r.returnsRevenue)} ₽</td>
                      <td className="p-3 text-right font-medium">{fmt(r.revenue)} ₽</td>
                      <td className="p-3 text-right">{fmt(r.forPay)} ₽</td>
                      <td className="p-3 text-right text-red-600">{fmt(r.logistics)} ₽</td>
                    </tr>
                  );
                })}
                {reports.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-400">Нет данных. Запустите синхронизацию.</td></tr>
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
