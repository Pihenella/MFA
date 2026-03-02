"use client";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SortKey = "nmId" | "supplierArticle" | "price" | "discount" | "finalPrice" | "cost" | "markup";

function fmt(val: number, unit?: string): string {
  if (unit === "%") return `${val.toFixed(1)}%`;
  if (unit === "₽") return `${Math.round(val).toLocaleString("ru")} ₽`;
  return String(val);
}

export default function PricesPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const prices = useQuery(api.dashboard.getPrices, { shopId }) ?? [];
  const costs = useQuery(api.dashboard.getCosts, { shopId }) ?? [];

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nmId");
  const [sortAsc, setSortAsc] = useState(true);

  const costMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of costs) m.set(c.nmId, c.cost);
    return m;
  }, [costs]);

  const rows = useMemo(() => {
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Цены и скидки</h1>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={selectedShop}
          onChange={(e) => setSelectedShop(e.target.value)}
        >
          <option value="">Все магазины</option>
          {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Поиск по артикулу или nmId..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{p.nmId}</td>
                <td className="px-3 py-2 text-xs">{p.supplierArticle}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.price, "₽")}</td>
                <td className="px-3 py-2 text-xs text-right">{fmt(p.discount, "%")}</td>
                <td className="px-3 py-2 text-xs text-right font-medium">{fmt(p.finalPrice, "₽")}</td>
                <td className="px-3 py-2 text-xs text-right">
                  {p.cost > 0 ? fmt(p.cost, "₽") : <span className="text-gray-400">—</span>}
                </td>
                <td className={cn("px-3 py-2 text-xs text-right font-medium", p.markup > 0 ? "text-green-600" : p.markup < 0 ? "text-red-500" : "text-gray-400")}>
                  {p.cost > 0 ? fmt(p.markup, "%") : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Нет данных о ценах. Включите категорию &quot;Цены и скидки&quot; в настройках.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
