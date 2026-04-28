"use client";
import { AuthGate } from "@/components/auth/AuthGate";
import { shopsListMineRef, upsertCostRef, upsertBulkRef, getStocksRef, costsListByShopRef, getProductCardsRef } from "@/lib/convex-refs";
import { useQuery, useMutation } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useRef } from "react";
import { FinlyButton } from "@/components/finly/FinlyButton";
import { FinlyCard } from "@/components/finly/FinlyCard";
import { FinlyDataTable } from "@/components/finly/FinlyDataTable";
import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";
import { Input } from "@/components/ui/input";
import { Upload, Save, Download, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { parseSimpleCostFile, isRealizationReport, parseRealizationReport } from "@/lib/costUploadParser";

type ProductRow = {
  nmId: number;
  supplierArticle: string;
  subject: string;
  title: string;
  brand?: string;
  photo: string | null;
  stockQty: number | null;
};

export default function ProductsPage() {
  return (
    <AuthGate>
      <ProductsContent />
    </AuthGate>
  );
}

function ProductsContent() {
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
  const allProducts: ProductRow[] = productCards.map((card) => ({
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Товары / Себестоимость
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Каталог SKU, остатки и себестоимость для расчёта прибыли.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={shopId ?? ""}
            onChange={(e) => setSelectedShop(e.target.value)}
          >
            {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <FinlyButton
            variant="secondary"
            onClick={handleDownloadTemplate}
            disabled={allProducts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" /> Скачать шаблон
          </FinlyButton>
          <FinlyButton variant="primary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Загрузить CSV/Excel
          </FinlyButton>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {totalCount > 0 && (
        <FinlyCard
          accent={costCount === totalCount ? "teal" : "gold"}
          className={`flex items-center gap-2 px-4 py-3 text-sm ${
          costCount === totalCount
            ? "text-rune-success"
            : "text-muted-foreground"
        }`}>
          {costCount < totalCount && <AlertTriangle className="h-4 w-4" />}
          Себестоимость указана: {costCount} из {totalCount} товаров
          {costCount < totalCount && (
            <span className="text-xs ml-2">— расчёты прибыли, ROI и маржи будут некорректны для товаров без себестоимости</span>
          )}
        </FinlyCard>
      )}

      <FinlyCard accent="teal" className="text-sm text-muted-foreground">
        Формат файла: колонки{" "}
        <code className="rounded bg-muted px-1">nmId</code> (или <code className="rounded bg-muted px-1">Артикул WB</code>),{" "}
        <code className="rounded bg-muted px-1">cost</code> (или <code className="rounded bg-muted px-1">Себестоимость</code>).
        Необязательно: <code className="rounded bg-muted px-1">supplierArticle</code> (или <code className="rounded bg-muted px-1">Артикул поставщика</code>).
      </FinlyCard>

      {allProducts.length === 0 ? (
        <FinlyEmptyState
          pose="empty-data"
          title="Товаров пока нет"
          body="Добавьте магазин и запустите синхронизацию, чтобы заполнить каталог SKU."
          cta={{ label: "К настройкам", href: "/settings" }}
        />
      ) : (
        <FinlyDataTable
          rows={allProducts}
          rowKey={(row) => String(row.nmId)}
          columns={[
            {
              key: "photo",
              header: "",
              className: "w-16",
              render: (p) =>
                p.photo ? (
                  <img src={p.photo} alt="" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted" />
                ),
            },
            { key: "nmId", header: "Артикул WB", className: "font-mono" },
            { key: "supplierArticle", header: "Артикул продавца" },
            {
              key: "title",
              header: "Товар",
              render: (p) => (
                <span className="text-muted-foreground">{p.title || p.subject}</span>
              ),
            },
            {
              key: "brand",
              header: "Бренд",
              render: (p) => (
                <span className="text-xs text-muted-foreground">{p.brand ?? ""}</span>
              ),
            },
            {
              key: "stockQty",
              header: "Остатки, шт",
              align: "right",
              render: (p) => (p.stockQty !== null ? p.stockQty : "—"),
            },
            {
              key: "cost",
              header: "Себестоимость, ₽",
              align: "right",
              render: (p) => {
                const currentCost = costMap.get(p.nmId);
                const editVal = editMap[p.nmId] ?? String(currentCost ?? "");
                return (
                  <Input
                    type="number"
                    value={editVal}
                    onChange={(e) => setEditMap({ ...editMap, [p.nmId]: e.target.value })}
                    className="ml-auto w-32 bg-background text-right"
                    placeholder="0"
                  />
                );
              },
            },
            {
              key: "actions",
              header: "",
              render: (p) =>
                editMap[p.nmId] !== undefined ? (
                  <FinlyButton
                    size="sm"
                    aria-label="Сохранить себестоимость"
                    title="Сохранить себестоимость"
                    onClick={() => handleSave(p.nmId, p.supplierArticle)}
                  >
                    <Save className="h-3.5 w-3.5" />
                  </FinlyButton>
                ) : null,
            },
          ]}
        />
      )}
    </div>
  );
}
