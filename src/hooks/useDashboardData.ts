import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type Period = { from: string; to: string };

export function useDashboardData(period: Period, comparePeriod: Period, shopId?: Id<"shops">) {
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

  // NM Reports — фильтруем по дате на клиенте (periodStart/periodEnd пересекается с выбранным периодом)
  const allNmReports = useQuery(api.dashboard.getNmReports, { shopId }) ?? [];

  const filterNmByPeriod = (p: Period) =>
    allNmReports.filter((r) => {
      const ps = (r as any).periodStart ?? "";
      const pe = (r as any).periodEnd ?? "";
      // Пересечение: report.start <= period.to && report.end >= period.from
      return ps <= p.to && pe >= p.from;
    });

  const nmReportsNow = filterNmByPeriod(period);
  const nmReportsPrev = filterNmByPeriod(comparePeriod);

  return {
    now: { orders: ordersNow, sales: salesNow, financials: financialsNow, costs, campaigns: campaignsNow, nmReports: nmReportsNow },
    prev: { orders: ordersPrev, sales: salesPrev, financials: financialsPrev, costs, campaigns: campaignsPrev, nmReports: nmReportsPrev },
  };
}
