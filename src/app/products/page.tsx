"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Save } from "lucide-react";
import * as XLSX from "xlsx";

export default function ProductsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = selectedShop || shops[0]?._id;

  const stocks = useQuery(
    api.dashboard.getStocks,
    shopId ? { shopId: shopId as any } : "skip"
  ) ?? [];
  const costs = useQuery(
    api.costs.listByShop,
    shopId ? { shopId: shopId as any } : "skip"
  ) ?? [];

  const upsertCost = useMutation(api.costs.upsertCost);
  const upsertBulk = useMutation(api.costs.upsertBulk);

  const [editMap, setEditMap] = useState<Record<number, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const costMap = new Map(costs.map((c) => [c.nmId, c.cost]));

  // Deduplicate stocks by nmId
  const uniqueArticles = Array.from(
    new Map(stocks.map((s) => [s.nmId, s])).values()
  );

  const handleSave = async (nmId: number, supplierArticle: string) => {
    const val = parseFloat(editMap[nmId] ?? "0");
    if (isNaN(val)) return;
    await upsertCost({ shopId: shopId as any, nmId, supplierArticle, cost: val });
    setEditMap((m) => { const n = { ...m }; delete n[nmId]; return n; });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws);
    const items = rows
      .filter((r) => r.nmId && r.cost)
      .map((r) => ({
        nmId: Number(r.nmId),
        supplierArticle: String(r.supplierArticle ?? ""),
        cost: Number(r.cost),
      }));
    if (items.length > 0) {
      await upsertBulk({ shopId: shopId as any, items });
      alert(`Загружено ${items.length} записей`);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Товары / Себестоимость</h1>
        <div className="flex items-center gap-3">
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={shopId ?? ""}
            onChange={(e) => setSelectedShop(e.target.value)}
          >
            {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Загрузить CSV/Excel
          </Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      <div className="text-sm text-gray-500">
        CSV формат: колонки <code className="bg-gray-100 px-1 rounded">nmId</code>, <code className="bg-gray-100 px-1 rounded">supplierArticle</code>, <code className="bg-gray-100 px-1 rounded">cost</code>
      </div>

      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Артикул WB</th>
                <th className="pb-2">Артикул продавца</th>
                <th className="pb-2">Товар</th>
                <th className="pb-2 text-right">Себестоимость, ₽</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {uniqueArticles.map((s) => {
                const currentCost = costMap.get(s.nmId);
                const editVal = editMap[s.nmId] ?? String(currentCost ?? "");
                const isDirty = editMap[s.nmId] !== undefined;
                return (
                  <tr key={s.nmId} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 font-mono">{s.nmId}</td>
                    <td className="py-2">{s.supplierArticle}</td>
                    <td className="py-2 text-gray-600">{s.subject}</td>
                    <td className="py-2">
                      <Input
                        type="number"
                        value={editVal}
                        onChange={(e) => setEditMap({ ...editMap, [s.nmId]: e.target.value })}
                        className="w-32 ml-auto text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2 pl-2">
                      {isDirty && (
                        <Button size="sm" onClick={() => handleSave(s.nmId, s.supplierArticle)} className="bg-violet-600 hover:bg-violet-700">
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {uniqueArticles.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Нет данных. Добавьте магазин и запустите синхронизацию.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
