"use client";
import { AuthGate } from "@/components/auth/AuthGate";
import { shopsListMineRef, getCostsRef, getPricesRef } from "@/lib/convex-refs";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { Search, ArrowUp, ArrowDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FinlyButton,
  FinlyCard,
  FinlyDataTable,
  FinlyEmptyState,
  FinlyMetricTile,
} from "@/components/finly";

type SortKey = "nmId" | "supplierArticle" | "price" | "discount" | "finalPrice" | "cost" | "markup";

type PriceRow = {
  _id: string;
  nmId: number;
  supplierArticle: string;
  price: number;
  discount: number;
  finalPrice: number;
  cost: number;
  markup: number;
};

function fmt(val: number | string, unit?: string): string {
  const n = Number(val);
  if (unit === "%") return `${n.toFixed(1)}%`;
  if (unit === "₽") return `${Math.round(n).toLocaleString("ru")} ₽`;
  return String(val);
}

export default function PricesPage() {
  return (
    <AuthGate>
      <PricesContent />
    </AuthGate>
  );
}

function PricesContent() {
  const shops = useQuery(shopsListMineRef) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const prices = useQuery(getPricesRef, { shopId }) ?? [];
  const costs = useQuery(getCostsRef, { shopId }) ?? [];

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nmId");
  const [sortAsc, setSortAsc] = useState(true);

  const costMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of costs) m.set(c.nmId, c.cost);
    return m;
  }, [costs]);

  const rows = useMemo<PriceRow[]>(() => {
    return prices.map((p) => {
      const finalPrice = p.price * (1 - p.discount / 100);
      const cost = costMap.get(p.nmId) ?? 0;
      const markup = cost > 0 ? ((finalPrice - cost) / cost) * 100 : 0;
      return { ...p, finalPrice, cost, markup };
    });
  }, [prices, costMap]);

  const filtered = useMemo(() => {
    let items = rows;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) => String(p.nmId).includes(q) || p.supplierArticle.toLowerCase().includes(q),
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
  }, [rows, search, sortKey, sortAsc]);

  const totals = useMemo(() => {
    const pricedRows = rows.filter((row) => row.cost > 0);
    const avgDiscount =
      rows.length > 0
        ? rows.reduce((sum, row) => sum + row.discount, 0) / rows.length
        : 0;
    const avgMarkup =
      pricedRows.length > 0
        ? pricedRows.reduce((sum, row) => sum + row.markup, 0) / pricedRows.length
        : 0;

    return { count: rows.length, avgDiscount, avgMarkup };
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const COLUMNS: { key: SortKey; label: string; unit?: string }[] = [
    { key: "nmId", label: "nmId" },
    { key: "supplierArticle", label: "Артикул" },
    { key: "price", label: "Базовая цена", unit: "₽" },
    { key: "discount", label: "Скидка", unit: "%" },
    { key: "finalPrice", label: "Итоговая цена", unit: "₽" },
    { key: "cost", label: "Себестоимость", unit: "₽" },
    { key: "markup", label: "Наценка", unit: "%" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Цены и скидки
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Текущие цены WB, скидки и маржинальность по SKU.
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FinlyMetricTile
          label="Позиций"
          value={totals.count}
          accent="teal"
        />
        <FinlyMetricTile
          label="Средняя скидка"
          value={totals.avgDiscount}
          formatted={`${totals.avgDiscount.toFixed(1)}%`}
          accent="gold"
        />
        <FinlyMetricTile
          label="Средняя наценка"
          value={totals.avgMarkup}
          formatted={totals.avgMarkup > 0 ? `${totals.avgMarkup.toFixed(1)}%` : "—"}
          accent={totals.avgMarkup >= 0 ? "teal" : "flame"}
        />
      </div>

      <FinlyCard accent="teal" className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по артикулу или nmId..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <FinlyButton disabled>
          <Check className="mr-2 h-4 w-4" />
          Применить
        </FinlyButton>
      </FinlyCard>

      <FinlyDataTable<PriceRow>
        rows={filtered}
        rowKey={(row) => row._id}
        empty={
          <FinlyEmptyState
            pose="empty-data"
            title="Нет данных о ценах"
            body="Включите категорию «Цены и скидки» в настройках или измените поиск."
            cta={{ label: "К настройкам", href: "/settings" }}
          />
        }
        columns={COLUMNS.map((col) => ({
          key: col.key,
          header: (
            <button
              type="button"
              className="inline-flex items-center gap-1 whitespace-nowrap text-left uppercase"
              onClick={() => toggleSort(col.key)}
            >
              {col.label}
              {sortKey === col.key ? (
                sortAsc ? (
                  <ArrowUp className="h-3 w-3 text-orange-flame" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-orange-flame" />
                )
              ) : null}
            </button>
          ),
          align:
            col.key === "nmId" || col.key === "supplierArticle"
              ? "left"
              : "right",
          className: cn(
            "whitespace-nowrap text-xs",
            col.key === "nmId" && "font-mono",
          ),
          render: (p) => {
            if (col.key === "cost") {
              return p.cost > 0 ? (
                fmt(p.cost, "₽")
              ) : (
                <span className="text-muted-foreground">—</span>
              );
            }
            if (col.key === "markup") {
              return (
                <span
                  className={cn(
                    "font-medium",
                    p.markup > 0 && "text-rune-success",
                    p.markup < 0 && "text-rune-danger",
                    p.cost <= 0 && "text-muted-foreground",
                  )}
                >
                  {p.cost > 0 ? fmt(p.markup, "%") : "—"}
                </span>
              );
            }
            return fmt(p[col.key], col.unit);
          },
        }))}
      />
    </div>
  );
}
