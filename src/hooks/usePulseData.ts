import { getOrdersRef, getFinancialsRef, getCostsRef, getCampaignsRef } from "../lib/convex-refs";
import { useQuery } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";
import { useMemo } from "react";
import { aggregateByDay, aggregateByWeek, aggregateByMonth, type DailyDataPoint } from "@/lib/dailyMetrics";

type Period = { from: string; to: string };
type Granularity = "day" | "week" | "month";

export function usePulseData(period: Period, shopId?: Id<"shops">, granularity: Granularity = "day") {
  const orders = useQuery(getOrdersRef, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  // Пульс показывает дневной/недельный/месячный срез — нужна rrDt-based фильтрация,
  // чтобы каждая операция попадала в свой день. Дашборд использует недельный фильтр как МПФакт.
  const financials = useQuery(getFinancialsRef, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
    byOperationDate: true,
  }) ?? [];

  const costs = useQuery(getCostsRef, { shopId }) ?? [];

  const campaigns = useQuery(getCampaignsRef, {
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
