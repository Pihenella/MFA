"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const shops = useQuery(api.shops.list) ?? [];
  const addShop = useMutation(api.shops.add);
  const removeShop = useMutation(api.shops.remove);
  const triggerSync = useAction(api.actions.triggerSync);

  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name || !apiKey) return;
    await addShop({ name, apiKey });
    setName("");
    setApiKey("");
  };

  const handleSync = async (shopId: string) => {
    setSyncing(shopId);
    try {
      await triggerSync({ shopId: shopId as any });
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
            <CardContent className="pt-4 flex items-center justify-between">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
