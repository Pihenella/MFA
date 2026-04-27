"use client";
import { shopsListMineRef, upsertCostRef, upsertBulkRef, getStocksRef, costsListByShopRef, getProductCardsRef } from "@/lib/convex-refs";
import { useQuery, useMutation } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Save, Download, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { parseSimpleCostFile, isRealizationReport, parseRealizationReport } from "@/lib/costUploadParser";

export default function ProductsPage() {
  const shops = useQuery(shopsListMineRef) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || shops[0]?._id) as Id<"shops"> | undefined;

  const stocks = useQuery(
    getStocksRef,
    shopId ? { shopId } : "skip"
  ) ?? [];
  const costs = useQuery(
    costsListByShopRef,
    shopId ? { shopId } : "skip"
  ) ?? [];

  const productCards = useQuery(
    getProductCardsRef,
    shopId ? { shopId } : "skip"
  ) ?? [];

  const upsertCost = useMutation(upsertCostRef);
  const upsertBulk = useMutation(upsertBulkRef);

  const [editMap, setEditMap] = useState<Record<number, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const costMap = new Map(costs.map((c) => [c.nmId, c.cost]));

  // Aggregate stock quantities by nmId
  const stockQtyMap = new Map<number, number>();
  for (const s of stocks) {
    stockQtyMap.set(s.nmId, (stockQtyMap.get(s.nmId) ?? 0) + s.quantity);
  }

  // Use productCards as primary source (full catalog)
  const allProducts = productCards.map((card) => ({
    nmId: card.nmId,
    supplierArticle: card.vendorCode,
    subject: card.subjectName,
    title: card.title,
    brand: card.brand,
    photo: card.photos?.[0] ?? null,
    stockQty: stockQtyMap.get(card.nmId) ?? null,
  }));

  const costCount = allProducts.filter((a) => costMap.has(a.nmId) && (costMap.get(a.nmId) ?? 0) > 0).length;
  const totalCount = allProducts.length;

  const handleSave = async (nmId: number, supplierArticle: string) => {
    const val = parseFloat(editMap[nmId] ?? "0");
    if (isNaN(val) || !shopId) return;
    await upsertCost({ shopId, nmId, supplierArticle, cost: val });
    setEditMap((m) => { const n = { ...m }; delete n[nmId]; return n; });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

    if (isRealizationReport(rows)) {
      const catalog = parseRealizationReport(rows);
      if (catalog.length > 0) {
        alert(
          `Обнаружен отчёт реализации WB. Найдено ${catalog.length} товаров.\n` +
          `Этот формат не содержит себестоимость — заполните её вручную или загрузите файл с колонкой "Себестоимость".`
        );
      }
      e.target.value = "";
      return;
    }

    const items = parseSimpleCostFile(rows);
    if (items.length > 0) {
      await upsertBulk({ shopId, items });
      alert(`Загружено ${items.length} записей себестоимости`);
    } else {
      alert("Не удалось распознать данные. Убедитесь, что файл содержит колонки nmId/Артикул WB и cost/Себестоимость.");
    }
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    const data = allProducts.map((p) => ({
      nmId: p.nmId,
      "Артикул поставщика": p.supplierArticle,
      "Предмет": p.subject,
      "Себестоимость": costMap.get(p.nmId) ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Себестоимость");
    XLSX.writeFile(wb, "cost_template.xlsx");
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
          <Button variant="outline" onClick={handleDownloadTemplate} disabled={allProducts.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Скачать шаблон
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Загрузить CSV/Excel
          </Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {totalCount > 0 && (
        <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border ${
          costCount === totalCount
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          {costCount < totalCount && <AlertTriangle className="h-4 w-4" />}
          Себестоимость указана: {costCount} из {totalCount} товаров
          {costCount < totalCount && (
            <span className="text-xs ml-2">— расчёты прибыли, ROI и маржи будут некорректны для товаров без себестоимости</span>
          )}
        </div>
      )}

      <div className="text-sm text-gray-500">
        Формат файла: колонки{" "}
        <code className="bg-gray-100 px-1 rounded">nmId</code> (или <code className="bg-gray-100 px-1 rounded">Артикул WB</code>),{" "}
        <code className="bg-gray-100 px-1 rounded">cost</code> (или <code className="bg-gray-100 px-1 rounded">Себестоимость</code>).
        Необязательно: <code className="bg-gray-100 px-1 rounded">supplierArticle</code> (или <code className="bg-gray-100 px-1 rounded">Артикул поставщика</code>).
      </div>

      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 w-12"></th>
                <th className="pb-2">Артикул WB</th>
                <th className="pb-2">Артикул продавца</th>
                <th className="pb-2">Товар</th>
                <th className="pb-2">Бренд</th>
                <th className="pb-2 text-right">Остатки, шт</th>
                <th className="pb-2 text-right">Себестоимость, ₽</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {allProducts.map((p) => {
                const currentCost = costMap.get(p.nmId);
                const editVal = editMap[p.nmId] ?? String(currentCost ?? "");
                const isDirty = editMap[p.nmId] !== undefined;
                return (
                  <tr key={p.nmId} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 w-12">
                      {p.photo ? (
                        <img src={p.photo} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100" />
                      )}
                    </td>
                    <td className="py-2 font-mono">{p.nmId}</td>
                    <td className="py-2">{p.supplierArticle}</td>
                    <td className="py-2 text-gray-600">{p.title || p.subject}</td>
                    <td className="py-2 text-gray-500 text-xs">{p.brand ?? ""}</td>
                    <td className="py-2 text-right">{p.stockQty !== null ? p.stockQty : "—"}</td>
                    <td className="py-2">
                      <Input
                        type="number"
                        value={editVal}
                        onChange={(e) => setEditMap({ ...editMap, [p.nmId]: e.target.value })}
                        className="w-32 ml-auto text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2 pl-2">
                      {isDirty && (
                        <Button size="sm" onClick={() => handleSave(p.nmId, p.supplierArticle)} className="bg-violet-600 hover:bg-violet-700">
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {allProducts.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">Нет данных. Добавьте магазин и запустите синхронизацию.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
