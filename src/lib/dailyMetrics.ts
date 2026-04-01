import type { Order, Financial, Cost, Campaign } from "./metrics";

export type DailyDataPoint = {
  date: string;
  revenueSeller: number;
  salesSeller: number;
  returnsSeller: number;
  ordersRevenue: number;
  salesCount: number;
  ordersCount: number;
  returnsCount: number;
  buyoutsCount: number;
  cogs: number;
  grossProfit: number;
  commission: number;
  logistics: number;
  storage: number;
  ads: number;
  penalties: number;
  mpExpenses: number;
  profit: number;
  profitPercent: number;
  returnRate: number;
};

export type AggregationInput = {
  orders: Order[];
  financials: (Financial & { dateFrom?: string })[];
  costs: Cost[];
  campaigns: (Campaign & { updatedAt?: number })[];
};

export function aggregateByDay(input: AggregationInput): DailyDataPoint[] {
  const { orders, financials, costs, campaigns } = input;

  const costMap = new Map<number, number>();
  for (const c of costs) costMap.set(c.nmId, c.cost);

  const days = new Map<string, DailyDataPoint & {
    forPayTotal: number;
    salesByNm: Map<number, number>;
    returnsByNm: Map<number, number>;
  }>();

  const getDay = (date: string) => {
    if (!days.has(date)) {
      days.set(date, {
        date,
        revenueSeller: 0, salesSeller: 0, returnsSeller: 0, ordersRevenue: 0,
        salesCount: 0, ordersCount: 0, returnsCount: 0, buyoutsCount: 0,
        cogs: 0, grossProfit: 0, commission: 0, logistics: 0,
        storage: 0, ads: 0, penalties: 0, mpExpenses: 0,
        profit: 0, profitPercent: 0, returnRate: 0,
        forPayTotal: 0,
        salesByNm: new Map(),
        returnsByNm: new Map(),
      });
    }
    return days.get(date)!;
  };

  // Financials — единый источник для P&L (как МП Факт)
  for (const f of financials) {
    const date = f.dateFrom ?? "";
    if (!date) continue;
    const d = getDay(date);

    if (f.docTypeName === "Продажа") {
      d.salesSeller += f.retailAmount || 0;
      d.forPayTotal += f.ppvzForPay || 0;
      d.salesCount += 1;
      d.salesByNm.set(f.nmId, (d.salesByNm.get(f.nmId) ?? 0) + 1);
    } else if (f.docTypeName === "Возврат") {
      d.returnsSeller += Math.abs(f.retailAmount || 0);
      d.forPayTotal -= Math.abs(f.ppvzForPay || 0);
      d.returnsCount += 1;
      d.returnsByNm.set(f.nmId, (d.returnsByNm.get(f.nmId) ?? 0) + 1);
    }

    d.logistics += (f.deliveryAmount || 0) - (f.stornoDeliveryAmount || 0);
    d.storage += f.storageAmount || 0;
    d.penalties += f.penalty || 0;
  }

  // Orders
  for (const o of orders) {
    if (o.isCancel) continue;
    const d = getDay(o.date);
    d.ordersRevenue += o.totalPrice;
    d.ordersCount += o.quantity;
  }

  // Campaigns
  for (const c of campaigns) {
    if (!c.updatedAt) continue;
    const date = new Date(c.updatedAt).toISOString().slice(0, 10);
    const d = getDay(date);
    d.ads += c.spent || 0;
  }

  // Finalize each day
  for (const d of days.values()) {
    d.revenueSeller = d.salesSeller - d.returnsSeller;
    d.buyoutsCount = d.salesCount - d.returnsCount;

    // COGS from financials nmId counts
    let cogs = 0;
    const allNmIds = new Set([...d.salesByNm.keys(), ...d.returnsByNm.keys()]);
    for (const nmId of allNmIds) {
      const unitCost = costMap.get(nmId) ?? 0;
      const sold = d.salesByNm.get(nmId) ?? 0;
      const returned = d.returnsByNm.get(nmId) ?? 0;
      cogs += unitCost * (sold - returned);
    }
    d.cogs = cogs;

    // Комиссия = revenueSeller - forPayTotal (как в МП Факт)
    d.commission = d.revenueSeller - d.forPayTotal;
    // Валовая прибыль = revenueSeller - cogs
    d.grossProfit = d.revenueSeller - d.cogs;
    d.mpExpenses = d.commission + d.logistics + d.storage + d.ads + d.penalties;
    d.profit = d.grossProfit - d.mpExpenses;
    d.profitPercent = d.revenueSeller > 0 ? (d.profit / d.revenueSeller) * 100 : 0;
    d.returnRate = d.buyoutsCount > 0 ? (d.returnsCount / d.buyoutsCount) * 100 : 0;
  }

  return Array.from(days.values())
    .map(({ salesByNm, returnsByNm, forPayTotal, ...rest }) => rest)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateByWeek(dailyData: DailyDataPoint[]): DailyDataPoint[] {
  const getWeekStart = (date: string) => {
    const d = new Date(date);
    const day = d.getDay() || 7; // Monday = 1
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().slice(0, 10);
  };

  return aggregateGroup(dailyData, getWeekStart);
}

export function aggregateByMonth(dailyData: DailyDataPoint[]): DailyDataPoint[] {
  return aggregateGroup(dailyData, (date) => date.slice(0, 7));
}

function aggregateGroup(
  dailyData: DailyDataPoint[],
  keyFn: (date: string) => string,
): DailyDataPoint[] {
  const groups = new Map<string, DailyDataPoint>();

  for (const d of dailyData) {
    const key = keyFn(d.date);
    if (!groups.has(key)) {
      groups.set(key, {
        date: key,
        revenueSeller: 0, salesSeller: 0, returnsSeller: 0, ordersRevenue: 0,
        salesCount: 0, ordersCount: 0, returnsCount: 0, buyoutsCount: 0,
        cogs: 0, grossProfit: 0, commission: 0, logistics: 0,
        storage: 0, ads: 0, penalties: 0, mpExpenses: 0,
        profit: 0, profitPercent: 0, returnRate: 0,
      });
    }
    const g = groups.get(key)!;
    g.revenueSeller += d.revenueSeller;
    g.salesSeller += d.salesSeller;
    g.returnsSeller += d.returnsSeller;
    g.ordersRevenue += d.ordersRevenue;
    g.salesCount += d.salesCount;
    g.ordersCount += d.ordersCount;
    g.returnsCount += d.returnsCount;
    g.buyoutsCount += d.buyoutsCount;
    g.cogs += d.cogs;
    g.grossProfit += d.grossProfit;
    g.commission += d.commission;
    g.logistics += d.logistics;
    g.storage += d.storage;
    g.ads += d.ads;
    g.penalties += d.penalties;
    g.mpExpenses += d.mpExpenses;
    g.profit += d.profit;
  }

  // Recalculate percent-based fields
  for (const g of groups.values()) {
    g.profitPercent = g.revenueSeller > 0 ? (g.profit / g.revenueSeller) * 100 : 0;
    g.returnRate = g.buyoutsCount > 0 ? (g.returnsCount / g.buyoutsCount) * 100 : 0;
  }

  return Array.from(groups.values()).sort((a, b) => a.date.localeCompare(b.date));
}
