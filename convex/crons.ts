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

// Минута 0: orders
crons.cron("sync orders",    "0 * * * *", internal.syncAll.syncAllOrders);
// Минута 5: sales
crons.cron("sync sales",     "5 * * * *", internal.syncAll.syncAllSales);
// Минута 10: stocks
crons.cron("sync stocks",    "10 * * * *", internal.syncAll.syncAllStocks);
// Минута 15: financials (может быть долгим из-за пагинации)
crons.cron("sync financials","15 * * * *", internal.syncAll.syncAllFinancials);
// Минута 25: promotion (2 запроса: list + fullstats)
crons.cron("sync promotion", "25 * * * *", internal.syncAll.syncAllPromotion);
// Минута 35: analytics (пагинация, 3 req/min)
crons.cron("sync analytics", "35 * * * *", internal.syncAll.syncAllAnalytics);
// Минута 45: content, feedbacks, prices, returns, tariffs
crons.cron("sync content",   "45 * * * *", internal.syncAll.syncAllContent);
crons.cron("sync feedbacks", "47 * * * *", internal.syncAll.syncAllFeedbacks);
crons.cron("sync prices",    "49 * * * *", internal.syncAll.syncAllPrices);
crons.cron("sync returns",   "51 * * * *", internal.syncAll.syncAllReturns);
crons.cron("sync tariffs",   "53 * * * *", internal.syncAll.syncAllTariffs);
// Минута 55: обновить lastSyncAt
crons.cron("update lastSync","55 * * * *", internal.syncAll.updateAllLastSync);

export default crons;
