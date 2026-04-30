"use client";
import { AuthGate } from "@/components/auth/AuthGate";
import {
  shopsListMineRef,
  shopsGetSyncLogRef,
  shopsAddRef,
  shopsRemoveRef,
  shopsUpdateCategoriesRef,
  shopsUpdateTaxRateRef,
  triggerSyncRef,
  usersUpdateMonthlyProfitGoalRef,
} from "@/lib/convex-refs";
import { useQuery, useMutation, useAction } from "convex/react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getWbTokenInfo } from "@/lib/wb-token";
import {
  FinlyBadge,
  FinlyButton,
  FinlyCard,
  FinlyEmptyState,
  TavernToggle,
  ThemeToggle,
} from "@/components/finly";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Clock3,
  Info,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Store,
  Target,
  Trash2,
  User,
} from "lucide-react";

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

const DEFAULT_CATEGORIES = [
  "statistics", "promotion", "analytics",
  "content", "feedbacks", "prices", "returns", "tariffs",
];

const fieldClassName =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

type Shop = Doc<"shops">;

function formatDate(ms: number | undefined) {
  if (!ms) return "Ещё не синхронизирован";
  return `Синхронизирован: ${new Date(ms).toLocaleString("ru-RU")}`;
}

function isWbRateLimitLog(error: string | undefined) {
  return /HTTP 429|too many requests|rate-limit/i.test(error ?? "");
}

function marketplaceLabel(marketplace: Shop["marketplace"]) {
  return marketplace === "wb" ? "Wildberries" : "Ozon";
}

function WbTokenDiagnostics({ shop }: { shop: Shop }) {
  if (shop.marketplace !== "wb") return null;

  const tokenInfo = getWbTokenInfo(shop.apiKey);
  const expiresAt = tokenInfo.expiresAt
    ? new Date(tokenInfo.expiresAt * 1000).toLocaleDateString("ru-RU")
    : null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <FinlyBadge tone={tokenInfo.type === "base" ? "gold" : "success"}>
          {tokenInfo.label}
        </FinlyBadge>
        {tokenInfo.readOnly && <FinlyBadge tone="muted">Read only</FinlyBadge>}
        {expiresAt && <FinlyBadge tone="muted">до {expiresAt}</FinlyBadge>}
      </div>
      {tokenInfo.type === "base" && (
        <div className="flex items-start gap-2 rounded-frame border border-gold-frame/30 bg-gold-frame/10 p-3 text-xs text-muted-foreground">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-gold-frame" />
          <span>
            Base-токен WB: тяжёлые категории синхронизируются реже. Analytics — не чаще раза в 30 минут,
            продвижение — раз в час, отзывы/вопросы — с паузой 12 минут, финансовые отчёты — до двух раз в день.
          </span>
        </div>
      )}
    </div>
  );
}

function SyncStatus({ shopId }: { shopId: Id<"shops"> }) {
  const logs = useQuery(shopsGetSyncLogRef, { shopId }) ?? [];
  const [expanded, setExpanded] = useState(false);

  const latestByEndpoint = new Map<string, (typeof logs)[number]>();
  for (const log of logs) {
    if (!latestByEndpoint.has(log.endpoint)) {
      latestByEndpoint.set(log.endpoint, log);
    }
  }

  const hasDetails = [...latestByEndpoint.values()].some((l) => l.status !== "ok");

  if (latestByEndpoint.size === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        {ALL_ENDPOINTS.map((ep) => {
          const log = latestByEndpoint.get(ep);
          if (!log) {
            return (
              <FinlyBadge key={ep} tone="muted">
                {ep}: нет данных
              </FinlyBadge>
            );
          }
          const isOk = log.status === "ok";
          const isPaused =
            log.status === "skipped" ||
            (log.status === "error" && isWbRateLimitLog(log.error));
          const label = isOk
            ? `OK${log.count !== undefined ? ` (${log.count})` : ""}`
            : isPaused
              ? "Пауза WB"
              : "Ошибка";
          return (
            <FinlyBadge
              key={ep}
              tone={isOk ? "success" : isPaused ? "gold" : "danger"}
            >
              {ep}: {label}
            </FinlyBadge>
          );
        })}
      </div>
      {hasDetails && (
        <div className="mt-3">
          <FinlyButton
            variant="ghost"
            size="sm"
            className="h-auto px-0 py-0 text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
            Подробности
          </FinlyButton>
          {expanded && (
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              {logs
                .filter((l) => l.status !== "ok")
                .slice(0, 10)
                .map((l) => {
                  const isPaused =
                    l.status === "skipped" ||
                    (l.status === "error" && isWbRateLimitLog(l.error));
                  return (
                    <div
                      key={l._id}
                      className={`rounded-frame border p-3 ${
                        isPaused
                          ? "border-gold-frame/30 bg-gold-frame/10"
                          : "border-rune-danger/30 bg-rune-danger/10"
                      }`}
                    >
                      <span className="font-medium text-foreground">{l.endpoint}</span>{" "}
                      <span>{new Date(l.syncedAt).toLocaleString("ru-RU")}</span>
                      <div className={`mt-1 ${isPaused ? "text-gold-frame" : "text-rune-danger"}`}>
                        {l.error}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryCheckboxes({ shopId, current }: { shopId: Id<"shops">; current: string[] }) {
  const updateCategories = useMutation(shopsUpdateCategoriesRef);
  const [categories, setCategories] = useState<string[]>(current);

  useEffect(() => {
    setCategories(current);
  }, [current]);

  const toggle = async (catId: string) => {
    const next = categories.includes(catId)
      ? categories.filter((c) => c !== catId)
      : [...categories, catId];
    setCategories(next);
    await updateCategories({ id: shopId, enabledCategories: next });
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        Категории API для синхронизации
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <label
            key={cat.id}
            className="flex cursor-pointer items-start gap-2 rounded-frame border border-border bg-background/60 p-2 text-sm transition-colors hover:bg-muted/50"
          >
            <input
              type="checkbox"
              checked={categories.includes(cat.id)}
              onChange={() => toggle(cat.id)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="block font-medium text-foreground">{cat.label}</span>
              <span className="block text-xs text-muted-foreground">{cat.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TaxRateControl({ shop }: { shop: Shop }) {
  const updateTaxRate = useMutation(shopsUpdateTaxRateRef);
  const current = shop.taxRatePercent ?? 6;
  const [value, setValue] = useState(String(current));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(String(current));
    setSaved(false);
    setError(null);
  }, [current]);

  const normalizedValue = value.trim().replace(",", ".");
  const parsed = Number(normalizedValue);
  const invalid = normalizedValue === "" || !Number.isFinite(parsed) || parsed < 0 || parsed > 100;
  const changed = !invalid && Math.round(parsed * 100) / 100 !== current;

  return (
    <form
      className="grid gap-3 rounded-frame border border-border bg-background/60 p-3 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
        if (invalid || !changed) return;
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
          await updateTaxRate({
            id: shop._id,
            taxRatePercent: Math.round(parsed * 100) / 100,
          });
          setSaved(true);
        } catch (err) {
          setError((err as Error).message || "Ошибка сохранения");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div>
        <div className="text-sm font-medium text-foreground">Налоговая ставка</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Используется в P&L, аналитике и дашборде именно для этого магазина.
        </div>
        {invalid && (
          <div className="mt-1 text-xs text-rune-danger">Введите значение от 0 до 100.</div>
        )}
        {error && <div className="mt-1 text-xs text-rune-danger">{error}</div>}
        {saved && <div className="mt-1 text-xs text-rune-success">Сохранено.</div>}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`tax-${shop._id}`}>Ставка, %</Label>
        <Input
          id={`tax-${shop._id}`}
          type="number"
          min="0"
          max="100"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
        />
      </div>
      <FinlyButton type="submit" size="sm" disabled={saving || invalid || !changed}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Сохраняем…" : "Сохранить"}
      </FinlyButton>
    </form>
  );
}

function AddShopDialog({
  marketplace,
  setMarketplace,
  name,
  setName,
  apiKey,
  setApiKey,
  ozonClientId,
  setOzonClientId,
  disabled,
  onCancel,
  onConfirm,
}: {
  marketplace: "wb" | "ozon";
  setMarketplace: (marketplace: "wb" | "ozon") => void;
  name: string;
  setName: (name: string) => void;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  ozonClientId: string;
  setOzonClientId: (clientId: string) => void;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scroll-ink/60 px-4">
      <FinlyCard
        accent="teal"
        className="w-full max-w-lg bg-popover shadow-rune"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-shop-title"
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            try {
              await onConfirm();
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <div>
            <h2 id="add-shop-title" className="font-display text-xl font-semibold">
              Добавить магазин
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Подключите API-ключ и выберите категории данных для синхронизации после создания.
            </p>
          </div>

          <div className="space-y-1">
            <Label>Маркетплейс</Label>
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value as "wb" | "ozon")}
              className={`${fieldClassName} w-full`}
            >
              <option value="wb">Wildberries</option>
              <option value="ozon">Ozon</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={marketplace === "wb" ? "Мой магазин WB" : "Мой магазин Ozon"}
            />
          </div>
          {marketplace === "ozon" && (
            <div className="space-y-1">
              <Label>Ozon Client ID</Label>
              <Input
                value={ozonClientId}
                onChange={(e) => setOzonClientId(e.target.value)}
                placeholder="123456"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label>{marketplace === "wb" ? "API ключ Wildberries" : "Ozon API key"}</Label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="eyJhb..."
              type="password"
            />
          </div>
          <div className="flex items-start gap-2 rounded-frame border border-murloc-teal/30 bg-murloc-teal/10 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-murloc-teal" />
            <span>
              {marketplace === "wb" ? (
                <>Создайте один ключ со всеми разрешениями в{" "}
                <span className="font-medium text-foreground">ЛК WB &gt; Настройки &gt; Доступ к API</span>.</>
              ) : (
                <>Получите Client ID и API key в{" "}
                <span className="font-medium text-foreground">ЛК Ozon Seller &gt; Настройки &gt; API</span>.</>
              )}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <FinlyButton
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={submitting}
            >
              Отмена
            </FinlyButton>
            <FinlyButton type="submit" disabled={disabled || submitting}>
              <Plus className="mr-2 h-4 w-4" />
              {submitting ? "Добавляем…" : "Добавить"}
            </FinlyButton>
          </div>
        </form>
      </FinlyCard>
    </div>
  );
}

function ProfileTab() {
  const me = useCurrentUser();

  if (!me) {
    return <div className="py-10 text-center text-muted-foreground">Загрузка…</div>;
  }

  return (
    <FinlyCard accent="gold" className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Профиль</h2>
        <p className="text-sm text-muted-foreground">
          Основные данные аккаунта, с которыми работает Finly.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Имя</Label>
          <Input value={me.name || "—"} readOnly />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={me.email || "—"} readOnly />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Бизнес</Label>
          <Input value={me.businessName || "—"} readOnly />
        </div>
      </div>
    </FinlyCard>
  );
}

function ProfitGoalTab() {
  const me = useCurrentUser();
  const updateMonthlyProfitGoal = useMutation(usersUpdateMonthlyProfitGoalRef);
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me) setGoal(me.monthlyProfitGoal === null ? "" : String(me.monthlyProfitGoal));
  }, [me]);

  if (!me) {
    return <div className="py-10 text-center text-muted-foreground">Загрузка…</div>;
  }

  const parsedGoal = goal.trim() === "" ? null : Number(goal.replace(",", "."));
  const isInvalid =
    parsedGoal !== null && (!Number.isFinite(parsedGoal) || parsedGoal < 0);
  const current = me.monthlyProfitGoal ?? null;
  const hasChanges = parsedGoal !== current;

  return (
    <FinlyCard accent="teal" className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Цель прибыли</h2>
        <p className="text-sm text-muted-foreground">
          Месячная цель используется для прогресса на дашборде и будущих достижений.
        </p>
      </div>
      <form
        className="max-w-md space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (isInvalid) return;
          setSubmitting(true);
          setSaved(false);
          setError(null);
          try {
            await updateMonthlyProfitGoal({ monthlyProfitGoal: parsedGoal });
            setSaved(true);
          } catch (err) {
            setError((err as Error).message || "Ошибка сохранения");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="space-y-1">
          <Label>Цель в месяц, ₽</Label>
          <Input
            type="number"
            min="0"
            step="1000"
            inputMode="decimal"
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              setSaved(false);
            }}
            placeholder="500000"
          />
        </div>
        {isInvalid ? (
          <p className="text-sm text-rune-danger">Введите число больше или равное 0.</p>
        ) : null}
        {error ? <p className="text-sm text-rune-danger">{error}</p> : null}
        {saved ? <p className="text-sm text-rune-success">Сохранено.</p> : null}
        <FinlyButton
          type="submit"
          disabled={submitting || isInvalid || !hasChanges}
        >
          <Save className="mr-2 h-4 w-4" />
          {submitting ? "Сохраняем…" : "Сохранить цель"}
        </FinlyButton>
      </form>
    </FinlyCard>
  );
}

function SettingsPageInner() {
  const search = useSearchParams();
  const initialMarketplace = (search.get("marketplace") ?? "wb") as "wb" | "ozon";
  const initialTab = search.get("marketplace") ? "shops" : "profile";
  const shops = useQuery(shopsListMineRef) ?? [];
  const currentOrg = useCurrentOrg();
  const addShop = useMutation(shopsAddRef);
  const removeShop = useMutation(shopsRemoveRef);
  const triggerSync = useAction(triggerSyncRef);

  const [marketplace, setMarketplace] = useState<"wb" | "ozon">(initialMarketplace);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [ozonClientId, setOzonClientId] = useState("");
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState<Id<"shops"> | null>(null);
  const [syncScheduled, setSyncScheduled] = useState<Id<"shops"> | null>(null);

  const resetShopForm = () => {
    setName("");
    setApiKey("");
    setOzonClientId("");
  };

  const handleAdd = async () => {
    if (!name.trim() || !apiKey.trim() || !currentOrg) return;
    if (marketplace === "ozon" && !ozonClientId.trim()) return;
    await addShop({
      orgId: currentOrg.orgId,
      marketplace,
      name: name.trim(),
      apiKey: apiKey.trim(),
      ozonClientId: marketplace === "ozon" ? ozonClientId.trim() : undefined,
    });
    resetShopForm();
    setShopDialogOpen(false);
  };

  const handleSync = async (shopId: Id<"shops">) => {
    setSyncing(shopId);
    try {
      await triggerSync({ shopId });
      setSyncScheduled(shopId);
      setTimeout(() => setSyncScheduled(null), 600_000);
    } finally {
      setSyncing(null);
    }
  };

  const shopFormDisabled =
    !currentOrg ||
    !name.trim() ||
    !apiKey.trim() ||
    (marketplace === "ozon" && !ozonClientId.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Настройки
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Аккаунт, магазины, тема и рабочие цели.
          </p>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-frame border border-border bg-card p-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /> Профиль
          </TabsTrigger>
          <TabsTrigger value="shops" className="gap-2">
            <Store className="h-4 w-4" /> Магазины
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Уведомления
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="h-4 w-4" /> Тема
          </TabsTrigger>
          <TabsTrigger value="profit-goal" className="gap-2">
            <Target className="h-4 w-4" /> Цель прибыли
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="shops" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Магазины</h2>
              <p className="text-sm text-muted-foreground">
                Подключения маркетплейсов и категории API для синхронизации.
              </p>
            </div>
            <FinlyButton onClick={() => setShopDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить магазин
            </FinlyButton>
          </div>

          {shops.length === 0 ? (
            <FinlyCard accent="gold" className="p-0">
              <FinlyEmptyState
                pose="empty-shops"
                title="Магазинов пока нет"
                body="Подключите Wildberries или Ozon, чтобы запустить синхронизацию данных."
                cta={{ label: "Добавить магазин", onClick: () => setShopDialogOpen(true) }}
              />
            </FinlyCard>
          ) : (
            <div className="space-y-4">
              {shops.map((shop) => (
                <FinlyCard key={shop._id} accent="teal" className="space-y-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{shop.name}</h3>
                        <FinlyBadge tone="info">{marketplaceLabel(shop.marketplace)}</FinlyBadge>
                        <FinlyBadge tone={shop.isActive ? "success" : "danger"}>
                          {shop.isActive ? "Активен" : "Отключён"}
                        </FinlyBadge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(shop.lastSyncAt)}
                      </p>
                      <WbTokenDiagnostics shop={shop} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <FinlyButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSync(shop._id)}
                        disabled={syncing === shop._id}
                        title="Запустить синхронизацию"
                        aria-label="Запустить синхронизацию"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncing === shop._id ? "animate-spin" : ""}`} />
                      </FinlyButton>
                      <FinlyButton
                        size="sm"
                        variant="ghost"
                        className="text-rune-danger"
                        onClick={() => {
                          if (confirm(`Удалить магазин ${shop.name}?`)) {
                            void removeShop({ id: shop._id });
                          }
                        }}
                        title="Удалить магазин"
                        aria-label="Удалить магазин"
                      >
                        <Trash2 className="h-4 w-4" />
                      </FinlyButton>
                    </div>
                  </div>

                  {syncScheduled === shop._id && (
                    <div className="flex items-center gap-2 rounded-frame border border-murloc-teal/30 bg-murloc-teal/10 px-3 py-2 text-xs text-murloc-teal">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Синхронизация запланирована. Данные обновятся в течение 10 минут.
                    </div>
                  )}

                  <TaxRateControl shop={shop} />

                  <CategoryCheckboxes
                    shopId={shop._id}
                    current={shop.enabledCategories ?? DEFAULT_CATEGORIES}
                  />
                  <SyncStatus shopId={shop._id} />
                </FinlyCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          <FinlyCard accent="gold" className="p-0">
            <FinlyEmptyState
              pose="empty-data"
              title="Уведомления появятся позже"
              body="Здесь будут настройки регулярных отчётов, алертов по прибыли и синхронизации."
            />
          </FinlyCard>
        </TabsContent>

        <TabsContent value="theme">
          <FinlyCard accent="teal" className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold">Тема</h2>
              <p className="text-sm text-muted-foreground">
                Выберите внешний вид интерфейса и режим таверны.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-frame border border-border bg-background/60 p-4">
                <div className="mb-3 text-sm font-medium">Оформление</div>
                <ThemeToggle />
              </div>
              <div className="rounded-frame border border-border bg-background/60 p-4">
                <div className="mb-3 text-sm font-medium">Атмосфера</div>
                <TavernToggle />
              </div>
            </div>
          </FinlyCard>
        </TabsContent>

        <TabsContent value="profit-goal">
          <ProfitGoalTab />
        </TabsContent>
      </Tabs>

      {shopDialogOpen && (
        <AddShopDialog
          marketplace={marketplace}
          setMarketplace={setMarketplace}
          name={name}
          setName={setName}
          apiKey={apiKey}
          setApiKey={setApiKey}
          ozonClientId={ozonClientId}
          setOzonClientId={setOzonClientId}
          disabled={shopFormDisabled}
          onCancel={() => {
            resetShopForm();
            setShopDialogOpen(false);
          }}
          onConfirm={handleAdd}
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <SettingsPageInner />
      </Suspense>
    </AuthGate>
  );
}
