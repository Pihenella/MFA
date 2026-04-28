"use client";
import { AuthGate } from "@/components/auth/AuthGate";
import { shopsListMineRef, getFeedbacksRef, getQuestionsRef } from "@/lib/convex-refs";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { format, subDays } from "date-fns";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FinlyBadge,
  FinlyCard,
  FinlyEmptyState,
  FinlyMetricTile,
} from "@/components/finly";

const TODAY = format(new Date(), "yyyy-MM-dd");
const MONTH_AGO = format(subDays(new Date(), 29), "yyyy-MM-dd");
const PREV_END = format(subDays(new Date(), 30), "yyyy-MM-dd");
const PREV_START = format(subDays(new Date(), 59), "yyyy-MM-dd");

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i <= count ? "fill-yellow-400 text-yellow-400" : "text-gray-300")}
        />
      ))}
    </span>
  );
}

export default function FeedbacksPage() {
  return (
    <AuthGate>
      <FeedbacksContent />
    </AuthGate>
  );
}

function FeedbacksContent() {
  const shops = useQuery(shopsListMineRef) ?? [];
  const [selectedShop, setSelectedShop] = useState<string>("");
  const shopId = (selectedShop || undefined) as Id<"shops"> | undefined;

  const [period, setPeriod] = useState({ from: MONTH_AGO, to: TODAY });
  const [comparePeriod, setComparePeriod] = useState({ from: PREV_START, to: PREV_END });
  const [tab, setTab] = useState<"feedbacks" | "questions">("feedbacks");
  const [search, setSearch] = useState("");
  const [filterAnswered, setFilterAnswered] = useState<"all" | "answered" | "unanswered">("all");
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const feedbacks = useQuery(getFeedbacksRef, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  const questions = useQuery(getQuestionsRef, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  const unansweredFeedbacks = feedbacks.filter((f) => !f.isAnswered).length;
  const unansweredQuestions = questions.filter((q) => !q.isAnswered).length;
  const avgRating = feedbacks.length > 0
    ? feedbacks.reduce((s, f) => s + f.productValuation, 0) / feedbacks.length
    : 0;

  const filteredFeedbacks = useMemo(() => {
    let items = feedbacks;
    if (filterAnswered === "answered") items = items.filter((f) => f.isAnswered);
    if (filterAnswered === "unanswered") items = items.filter((f) => !f.isAnswered);
    if (filterRating !== null) items = items.filter((f) => f.productValuation === filterRating);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (f) => String(f.nmId).includes(q) || f.text.toLowerCase().includes(q),
      );
    }
    return items.sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }, [feedbacks, filterAnswered, filterRating, search]);

  const filteredQuestions = useMemo(() => {
    let items = questions;
    if (filterAnswered === "answered") items = items.filter((q) => q.isAnswered);
    if (filterAnswered === "unanswered") items = items.filter((q) => !q.isAnswered);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (item) => String(item.nmId).includes(q) || item.text.toLowerCase().includes(q),
      );
    }
    return items.sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }, [questions, filterAnswered, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Отзывы и вопросы
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Лента обратной связи, ответы и рейтинг товаров.
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

      <FinlyCard accent="teal" className="p-3">
        <PeriodSelector
          period={period}
          comparePeriod={comparePeriod}
          onChange={(p, cp) => { setPeriod(p); setComparePeriod(cp); }}
        />
      </FinlyCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FinlyMetricTile
          label="Неотвеченные отзывы"
          value={unansweredFeedbacks}
          accent={unansweredFeedbacks > 0 ? "flame" : "teal"}
        />
        <FinlyMetricTile
          label="Неотвеченные вопросы"
          value={unansweredQuestions}
          accent={unansweredQuestions > 0 ? "flame" : "teal"}
        />
        <FinlyMetricTile
          label="Средний рейтинг"
          value={avgRating}
          formatted={avgRating > 0 ? avgRating.toFixed(1) : "—"}
          accent="gold"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "feedbacks" | "questions")}>
        <TabsList>
          <TabsTrigger value="feedbacks">Отзывы ({feedbacks.length})</TabsTrigger>
          <TabsTrigger value="questions">Вопросы ({questions.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <FinlyCard accent="teal" className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по nmId или тексту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={filterAnswered}
          onChange={(e) => setFilterAnswered(e.target.value as any)}
        >
          <option value="all">Все</option>
          <option value="unanswered">Неотвеченные</option>
          <option value="answered">Отвеченные</option>
        </select>
        {tab === "feedbacks" && (
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterRating ?? ""}
            onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Все рейтинги</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>{r} {r === 1 ? "звезда" : r < 5 ? "звезды" : "звёзд"}</option>
            ))}
          </select>
        )}
      </FinlyCard>

      <div className="space-y-3">
        {tab === "feedbacks" ? (
          filteredFeedbacks.length === 0 ? (
            <FinlyEmptyState
              pose="empty-data"
              title="Нет отзывов"
              body="За выбранный период отзывы не найдены."
            />
          ) : (
            filteredFeedbacks.map((f) => (
              <FinlyCard
                key={f._id}
                accent={f.isAnswered ? "teal" : "flame"}
                className="space-y-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <FinlyBadge tone="gold">
                      {f.productValuation} / 5
                    </FinlyBadge>
                    <Stars count={f.productValuation} />
                    <span className="text-xs text-muted-foreground">
                      {f.createdDate.slice(0, 10)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      nmId {f.nmId}
                    </span>
                  </div>
                  <FinlyBadge tone={f.isAnswered ? "success" : "danger"}>
                    {f.isAnswered ? "Отвечен" : "Ждёт ответа"}
                  </FinlyBadge>
                </div>
                <p className="text-sm text-foreground">{f.text || "—"}</p>
                <div className="rounded-frame border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {f.answer ?? "—"}
                </div>
              </FinlyCard>
            ))
          )
        ) : (
          filteredQuestions.length === 0 ? (
            <FinlyEmptyState
              pose="empty-data"
              title="Нет вопросов"
              body="За выбранный период вопросы не найдены."
            />
          ) : (
            filteredQuestions.map((q) => (
              <FinlyCard
                key={q._id}
                accent={q.isAnswered ? "teal" : "flame"}
                className="space-y-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {q.createdDate.slice(0, 10)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      nmId {q.nmId}
                    </span>
                  </div>
                  <FinlyBadge tone={q.isAnswered ? "success" : "danger"}>
                    {q.isAnswered ? "Отвечен" : "Ждёт ответа"}
                  </FinlyBadge>
                </div>
                <p className="text-sm text-foreground">{q.text || "—"}</p>
                <div className="rounded-frame border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {q.answer ?? "—"}
                </div>
              </FinlyCard>
            ))
          )
        )}
      </div>
    </div>
  );
}
