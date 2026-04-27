"use client";
import { shopsListRef, getFeedbacksRef, getQuestionsRef } from "@/lib/convex-refs";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { format, subDays } from "date-fns";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const shops = useQuery(shopsListRef) ?? [];
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Отзывы и вопросы</h1>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={selectedShop}
          onChange={(e) => setSelectedShop(e.target.value)}
        >
          <option value="">Все магазины</option>
          {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      <PeriodSelector
        period={period}
        comparePeriod={comparePeriod}
        onChange={(p, cp) => { setPeriod(p); setComparePeriod(cp); }}
      />

      <div className="flex flex-wrap gap-3">
        {unansweredFeedbacks > 0 && (
          <Badge variant="destructive">{unansweredFeedbacks} неотвеченных отзывов</Badge>
        )}
        {unansweredQuestions > 0 && (
          <Badge variant="destructive">{unansweredQuestions} неотвеченных вопросов</Badge>
        )}
        {avgRating > 0 && (
          <Badge variant="outline" className="gap-1">
            Средний рейтинг: {avgRating.toFixed(1)} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "feedbacks" | "questions")}>
        <TabsList>
          <TabsTrigger value="feedbacks">Отзывы ({feedbacks.length})</TabsTrigger>
          <TabsTrigger value="questions">Вопросы ({questions.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск по nmId или тексту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={filterAnswered}
          onChange={(e) => setFilterAnswered(e.target.value as any)}
        >
          <option value="all">Все</option>
          <option value="unanswered">Неотвеченные</option>
          <option value="answered">Отвеченные</option>
        </select>
        {tab === "feedbacks" && (
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={filterRating ?? ""}
            onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Все рейтинги</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>{r} {r === 1 ? "звезда" : r < 5 ? "звезды" : "звёзд"}</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        {tab === "feedbacks" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">nmId</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Рейтинг</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Отзыв</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ответ</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map((f) => (
                <tr key={f._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{f.createdDate.slice(0, 10)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{f.nmId}</td>
                  <td className="px-3 py-2"><Stars count={f.productValuation} /></td>
                  <td className="px-3 py-2 text-xs max-w-md truncate">{f.text}</td>
                  <td className="px-3 py-2 text-xs max-w-sm truncate text-gray-500">{f.answer ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={f.isAnswered ? "default" : "destructive"} className={f.isAnswered ? "bg-green-600" : ""}>
                      {f.isAnswered ? "Отвечен" : "Ждёт ответа"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filteredFeedbacks.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Нет отзывов за выбранный период</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">nmId</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Вопрос</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ответ</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q) => (
                <tr key={q._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{q.createdDate.slice(0, 10)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{q.nmId}</td>
                  <td className="px-3 py-2 text-xs max-w-md truncate">{q.text}</td>
                  <td className="px-3 py-2 text-xs max-w-sm truncate text-gray-500">{q.answer ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={q.isAnswered ? "default" : "destructive"} className={q.isAnswered ? "bg-green-600" : ""}>
                      {q.isAnswered ? "Отвечен" : "Ждёт ответа"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filteredQuestions.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Нет вопросов за выбранный период</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
