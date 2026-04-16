import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useMemo } from "react";
import { aggregateByDay, aggregateByWeek, aggregateByMonth, type DailyDataPoint } from "@/lib/dailyMetrics";

type Period = { from: string; to: string };
type Granularity = "day" | "week" | "month";

export function usePulseData(period: Period, shopId?: Id<"shops">, granularity: Granularity = "day") {
  const orders = useQuery(api.dashboard.getOrders, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  // Пульс показывает дневной/недельный/месячный срез — нужна rrDt-based фильтрация,
  // чтобы каждая операция попадала в свой день. Дашборд использует недельный фильтр как МПФакт.
  const financials = useQuery(api.dashboard.getFinancials, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
    byOperationDate: true,
  }) ?? [];

  const costs = useQuery(api.dashboard.getCosts, { shopId }) ?? [];

  const campaigns = useQuery(api.dashboard.getCampaigns, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  const data: DailyDataPoint[] = useMemo(() => {
    const daily = aggregateByDay({ orders, financials, costs, campaigns });
    switch (granularity) {
      case "week": return aggregateByWeek(daily);
      case "month": return aggregateByMonth(daily);
      default: return daily;
    }
  }, [orders, financials, costs, campaigns, granularity]);

  return data;
}
