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
import { Trash2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const ENDPOINTS = ["orders", "sales", "stocks", "financials", "campaigns"] as const;

function SyncStatus({ shopId }: { shopId: Id<"shops"> }) {
  const logs = useQuery(api.shops.getSyncLog, { shopId }) ?? [];
  const [expanded, setExpanded] = useState(false);

  // Get latest log per endpoint
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
        {ENDPOINTS.map((ep) => {
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

export default function SettingsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const addShop = useMutation(api.shops.add);
  const removeShop = useMutation(api.shops.remove);
  const triggerSync = useAction(api.actions.triggerSync);

  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [syncing, setSyncing] = useState<Id<"shops"> | null>(null);

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
            <Label>API ключ Wildberries (Статистика)</Label>
            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="eyJhb..." type="password" />
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
              <SyncStatus shopId={shop._id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
