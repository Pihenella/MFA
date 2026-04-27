import { cronJobs } from "convex/server";
import type { FunctionReference } from "convex/server";

const crons = cronJobs();

// Pre-resolved string refs обходят TS2589 (deep `internal` type instantiation
// после расширения). Все referenced функции существуют в runtime.
type SyncCron = FunctionReference<"action", "internal", Record<string, never>>;
const ref = (name: string) =>
  `syncAll:${name}` as unknown as SyncCron;

// Категории разнесены по отдельным кронам чтобы не превышать
// глобальный rate limit WB на продавца (все API считаются вместе).
//
// Лимиты из документации WB:
//   Statistics (orders/sales/stocks/financials): 1 req/min, burst 1
//   Analytics (sales-funnel): 3 req/min, burst 3
//   Promotion (adverts list): 5 req/s; fullstats: 3 req/min
//
// Расписание: каждая категория раз в час, сдвинуты на 5 мин друг от друга.
// WB обновляет данные orders/sales раз в 30 мин, остальное реже — часового интервала достаточно.

// Analytics ПЕРВЫМ — когда глобальный лимит WB полностью восстановлен.
// Без этого analytics всегда получает 429, т.к. лимит уже исчерпан другими кронами.
// Минута 0: analytics (seller-analytics-api, 3 req/min, пагинация 30с)
crons.cron("sync analytics", "0 * * * *", ref("syncAllAnalytics"), {});
// Минута 5: orders (statistics: 1 req/min)
crons.cron("sync orders",    "5 * * * *", ref("syncAllOrders"), {});
// Минута 8: sales
crons.cron("sync sales",     "8 * * * *", ref("syncAllSales"), {});
// Минута 11: stocks
crons.cron("sync stocks",    "11 * * * *", ref("syncAllStocks"), {});
// Минута 14: financials (может быть долгим: 61с между страницами × N страниц)
crons.cron("sync financials","14 * * * *", ref("syncAllFinancials"), {});
// Минута 30: promotion (2 запроса: list + fullstats) — окно 16 мин для financials
crons.cron("sync promotion", "30 * * * *", ref("syncAllPromotion"), {});
// Минута 40+: лёгкие категории
crons.cron("sync content",   "40 * * * *", ref("syncAllContent"), {});
crons.cron("sync feedbacks", "42 * * * *", ref("syncAllFeedbacks"), {});
crons.cron("sync prices",    "44 * * * *", ref("syncAllPrices"), {});
crons.cron("sync returns",   "46 * * * *", ref("syncAllReturns"), {});
crons.cron("sync tariffs",   "48 * * * *", ref("syncAllTariffs"), {});
// Минута 55: обновить lastSyncAt
crons.cron("update lastSync","55 * * * *", ref("updateAllLastSync"), {});

// Истекание старых invites — раз в день в 03:00 UTC
const expireInvitesRef = "org/invites:expireOldInvites" as unknown as FunctionReference<
  "mutation",
  "internal",
  Record<string, never>
>;
crons.daily("expire old invites", { hourUTC: 3, minuteUTC: 0 }, expireInvitesRef);

export default crons;
