import { useQuery, useAction } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type Period = { from: string; to: string };

export function useDashboardData(period: Period, comparePeriod: Period, shopId?: Id<"shops">) {
  const fetchAnalytics = useAction(api.actions.fetchAnalytics);
  const fetchedRef = useRef<string>("");

  // Загружаем аналитику для текущего и сравнительного периода при смене дат/магазина
  useEffect(() => {
    if (!shopId) return;
    const key = `${shopId}:${period.from}:${period.to}:${comparePeriod.from}:${comparePeriod.to}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;

    // Запрашиваем аналитику для обоих периодов
    fetchAnalytics({ shopId, dateFrom: period.from, dateTo: period.to }).catch(() => {});
    fetchAnalytics({ shopId, dateFrom: comparePeriod.from, dateTo: comparePeriod.to }).catch(() => {});
  }, [shopId, period.from, period.to, comparePeriod.from, comparePeriod.to, fetchAnalytics]);

  const ordersNow = useQuery(api.dashboard.getOrders, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  const ordersPrev = useQuery(api.dashboard.getOrders, {
    shopId,
    dateFrom: comparePeriod.from,
    dateTo: comparePeriod.to,
  }) ?? [];

  const salesNow = useQuery(api.dashboard.getSales, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  const salesPrev = useQuery(api.dashboard.getSales, {
    shopId,
    dateFrom: comparePeriod.from,
    dateTo: comparePeriod.to,
  }) ?? [];

  const financialsNow = useQuery(api.dashboard.getFinancials, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  const financialsPrev = useQuery(api.dashboard.getFinancials, {
    shopId,
    dateFrom: comparePeriod.from,
    dateTo: comparePeriod.to,
  }) ?? [];

  const costs = useQuery(api.dashboard.getCosts, { shopId }) ?? [];

  const campaignsNow = useQuery(api.dashboard.getCampaigns, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  const campaignsPrev = useQuery(api.dashboard.getCampaigns, {
    shopId,
    dateFrom: comparePeriod.from,
    dateTo: comparePeriod.to,
  }) ?? [];

  // NM Reports — фильтруем по дате (exact match на periodStart/periodEnd)
  const nmReportsNow = useQuery(api.dashboard.getNmReports, {
    shopId,
    dateFrom: period.from,
    dateTo: period.to,
  }) ?? [];

  const nmReportsPrev = useQuery(api.dashboard.getNmReports, {
    shopId,
    dateFrom: comparePeriod.from,
    dateTo: comparePeriod.to,
  }) ?? [];

  return {
    now: { orders: ordersNow, sales: salesNow, financials: financialsNow, costs, campaigns: campaignsNow, nmReports: nmReportsNow },
    prev: { orders: ordersPrev, sales: salesPrev, financials: financialsPrev, costs, campaigns: campaignsPrev, nmReports: nmReportsPrev },
  };
}
