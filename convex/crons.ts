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

// Минута 0: orders (statistics: 1 req/min)
crons.cron("sync orders",    "0 * * * *", internal.syncAll.syncAllOrders);
// Минута 3: sales
crons.cron("sync sales",     "3 * * * *", internal.syncAll.syncAllSales);
// Минута 6: stocks
crons.cron("sync stocks",    "6 * * * *", internal.syncAll.syncAllStocks);
// Минута 9: financials (может быть долгим: 61с между страницами × N страниц)
crons.cron("sync financials","9 * * * *", internal.syncAll.syncAllFinancials);
// Минута 25: promotion (2 запроса: list + fullstats) — окно 16 мин для financials
crons.cron("sync promotion", "25 * * * *", internal.syncAll.syncAllPromotion);
// Минута 35: analytics (пагинация, 30с между страницами)
crons.cron("sync analytics", "35 * * * *", internal.syncAll.syncAllAnalytics);
// Минута 48+: лёгкие категории — по 2 мин друг от друга
crons.cron("sync content",   "48 * * * *", internal.syncAll.syncAllContent);
crons.cron("sync feedbacks", "50 * * * *", internal.syncAll.syncAllFeedbacks);
crons.cron("sync prices",    "52 * * * *", internal.syncAll.syncAllPrices);
crons.cron("sync returns",   "54 * * * *", internal.syncAll.syncAllReturns);
crons.cron("sync tariffs",   "56 * * * *", internal.syncAll.syncAllTariffs);
// Минута 58: обновить lastSyncAt
crons.cron("update lastSync","58 * * * *", internal.syncAll.updateAllLastSync);

export default crons;
