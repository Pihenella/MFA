"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, ChevronDown, ChevronUp, Info } from "lucide-react";

const ALL_ENDPOINTS = [
  "orders", "sales", "stocks", "financials", "campaigns",
  "content", "analytics", "feedbacks", "questions", "prices", "returns", "tariffs",
] as const;

const CATEGORIES = [
  { id: "statistics", label: "Статистика", description: "Заказы, продажи, остатки, финансовые отчёты" },
  { id: "promotion", label: "Продвижение", description: "Рекламные кампании и статистика" },
  { id: "content", label: "Контент", description: "Карточки товаров, фото, описания" },
  { id: "analytics", label: "Аналитика", description: "NM отчёты: просмотры, корзина, конверсии" },
  { id: "feedbacks", label: "Отзывы и вопросы", description: "Отзывы и вопросы покупателей" },
  { id: "prices", label: "Цены и скидки", description: "Актуальные цены, скидки и промокоды" },
  { id: "returns", label: "Возвраты", description: "Возвраты товаров" },
  { id: "tariffs", label: "Тарифы", description: "Тарифы на логистику и хранение" },
] as const;

const DEFAULT_CATEGORIES = ["statistics", "promotion", "analytics"];

function SyncStatus({ shopId }: { shopId: Id<"shops"> }) {
  const logs = useQuery(api.shops.getSyncLog, { shopId }) ?? [];
  const [expanded, setExpanded] = useState(false);

  const latestByEndpoint = new Map<string, (typeof logs)[number]>();
  for (const log of logs) {
    if (!latestByEndpoint.has(log.endpoint)) {
      latestByEndpoint.set(log.endpoint, log);
    }
  }

  const hasErrors = [...latestByEndpoint.values()].some((l) => l.status === "error");

  if (latestByEndpoint.size === 0) return null;

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex flex-wrap gap-2 items-center">
        {ALL_ENDPOINTS.map((ep) => {
          const log = latestByEndpoint.get(ep);
          if (!log) return (
            <Badge key={ep} variant="outline" className="text-gray-400">
              {ep}: нет данных
            </Badge>
          );
          return (
            <Badge
              key={ep}
              variant={log.status === "ok" ? "default" : "destructive"}
              className={log.status === "ok" ? "bg-green-600" : ""}
            >
              {ep}: {log.status === "ok" ? "OK" : "Ошибка"}
            </Badge>
          );
        })}
      </div>
      {hasErrors && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 p-0 h-auto"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            Подробности
          </Button>
          {expanded && (
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {logs
                .filter((l) => l.status === "error")
                .slice(0, 10)
                .map((l) => (
                  <div key={l._id} className="bg-red-50 border border-red-200 rounded p-2">
                    <span className="font-medium">{l.endpoint}</span>{" "}
                    <span className="text-gray-400">
                      {new Date(l.syncedAt).toLocaleString("ru")}
                    </span>
                    <div className="text-red-600 mt-0.5">{l.error}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryCheckboxes({ shopId, current }: { shopId: Id<"shops">; current: string[] }) {
  const updateCategories = useMutation(api.shops.updateCategories);
  const [categories, setCategories] = useState<string[]>(current);

  const toggle = async (catId: string) => {
    const next = categories.includes(catId)
      ? categories.filter((c) => c !== catId)
      : [...categories, catId];
    setCategories(next);
    await updateCategories({ id: shopId, enabledCategories: next });
  };

  return (
    <div className="mt-3 border-t pt-3">
      <div className="text-xs font-medium text-gray-500 mb-2">Категории API для синхронизации:</div>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((cat) => (
          <label key={cat.id} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded p-1.5">
            <input
              type="checkbox"
              checked={categories.includes(cat.id)}
              onChange={() => toggle(cat.id)}
              className="mt-0.5 accent-violet-600"
            />
            <div>
              <div className="font-medium">{cat.label}</div>
              <div className="text-xs text-gray-400">{cat.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const addShop = useMutation(api.shops.add);
  const removeShop = useMutation(api.shops.remove);
  const triggerSync = useAction(api.actions.triggerSync);

  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [syncing, setSyncing] = useState<Id<"shops"> | null>(null);
  const [syncScheduled, setSyncScheduled] = useState<Id<"shops"> | null>(null);

  const handleAdd = async () => {
    if (!name || !apiKey) return;
    await addShop({ name, apiKey });
    setName("");
    setApiKey("");
  };

  const handleSync = async (shopId: Id<"shops">) => {
    setSyncing(shopId);
    try {
      await triggerSync({ shopId });
      setSyncScheduled(shopId);
      setTimeout(() => setSyncScheduled(null), 600_000); // 10 мин
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Настройки магазинов</h1>

      <Card>
        <CardHeader>
          <CardTitle>Добавить магазин</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Мой магазин WB" />
          </div>
          <div className="space-y-1">
            <Label>API ключ Wildberries (все разрешения)</Label>
            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="eyJhb..." type="password" />
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-md p-2.5">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              Создайте один ключ со всеми разрешениями в{" "}
              <span className="font-medium">ЛК WB &rarr; Настройки &rarr; Доступ к API</span>.
              После добавления магазина выберите нужные категории данных ниже.
            </span>
          </div>
          <Button onClick={handleAdd} className="bg-violet-600 hover:bg-violet-700">
            Добавить
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {shops.map((shop) => (
          <Card key={shop._id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{shop.name}</div>
                  <div className="text-sm text-gray-500">
                    {shop.lastSyncAt
                      ? `Синхронизирован: ${new Date(shop.lastSyncAt).toLocaleString("ru")}`
                      : "Ещё не синхронизирован"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={shop.isActive ? "default" : "destructive"}>
                    {shop.isActive ? "Активен" : "Отключён"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleSync(shop._id)}
                    disabled={syncing === shop._id}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing === shop._id ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => removeShop({ id: shop._id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {syncScheduled === shop._id && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Синхронизация запланирована. Данные обновятся в течение 10 минут.
                </div>
              )}
              <CategoryCheckboxes
                shopId={shop._id}
                current={shop.enabledCategories ?? DEFAULT_CATEGORIES}
              />
              <SyncStatus shopId={shop._id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
