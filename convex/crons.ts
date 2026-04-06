import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

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
crons.cron("sync analytics", "0 * * * *", internal.syncAll.syncAllAnalytics);
// Минута 5: orders (statistics: 1 req/min)
crons.cron("sync orders",    "5 * * * *", internal.syncAll.syncAllOrders);
// Минута 8: sales
crons.cron("sync sales",     "8 * * * *", internal.syncAll.syncAllSales);
// Минута 11: stocks
crons.cron("sync stocks",    "11 * * * *", internal.syncAll.syncAllStocks);
// Минута 14: financials (может быть долгим: 61с между страницами × N страниц)
crons.cron("sync financials","14 * * * *", internal.syncAll.syncAllFinancials);
// Минута 30: promotion (2 запроса: list + fullstats) — окно 16 мин для financials
crons.cron("sync promotion", "30 * * * *", internal.syncAll.syncAllPromotion);
// Минута 40+: лёгкие категории
crons.cron("sync content",   "40 * * * *", internal.syncAll.syncAllContent);
crons.cron("sync feedbacks", "42 * * * *", internal.syncAll.syncAllFeedbacks);
crons.cron("sync prices",    "44 * * * *", internal.syncAll.syncAllPrices);
crons.cron("sync returns",   "46 * * * *", internal.syncAll.syncAllReturns);
crons.cron("sync tariffs",   "48 * * * *", internal.syncAll.syncAllTariffs);
// Минута 55: обновить lastSyncAt
crons.cron("update lastSync","55 * * * *", internal.syncAll.updateAllLastSync);

export default crons;
