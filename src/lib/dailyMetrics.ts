import type { Sale, Order, Financial, Cost, Campaign } from "./metrics";

export type DailyDataPoint = {
  date: string;
  revenue: number;
  salesRevenue: number;
  returnsRevenue: number;
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
  totalExpenses: number;
  profit: number;
  profitPercent: number;
  returnRate: number;
};

export type AggregationInput = {
  sales: Sale[];
  orders: Order[];
  financials: Financial[];
  costs: Cost[];
  campaigns: (Campaign & { updatedAt?: number })[];
};

export function aggregateByDay(input: AggregationInput): DailyDataPoint[] {
  const { sales, orders, financials, costs, campaigns } = input;

  const costMap = new Map<number, number>();
  for (const c of costs) costMap.set(c.nmId, c.cost);

  const days = new Map<string, DailyDataPoint>();

  const getDay = (date: string) => {
    if (!days.has(date)) {
      days.set(date, {
        date,
        revenue: 0, salesRevenue: 0, returnsRevenue: 0, ordersRevenue: 0,
        salesCount: 0, ordersCount: 0, returnsCount: 0, buyoutsCount: 0,
        cogs: 0, grossProfit: 0, commission: 0, logistics: 0,
        storage: 0, ads: 0, penalties: 0, totalExpenses: 0,
        profit: 0, profitPercent: 0, returnRate: 0,
      });
    }
    return days.get(date)!;
  };

  // Sales
  for (const s of sales) {
    const d = getDay(s.date);
    if (s.isReturn) {
      d.returnsRevenue += s.priceWithDisc;
      d.returnsCount += s.quantity;
    } else {
      d.salesRevenue += s.priceWithDisc;
      d.salesCount += s.quantity;
      d.buyoutsCount += s.quantity;
      d.cogs += (costMap.get(s.nmId) ?? 0) * s.quantity;
    }
  }

  // Orders
  for (const o of orders) {
    if (o.isCancel) continue;
    const d = getDay(o.date);
    d.ordersRevenue += o.totalPrice;
    d.ordersCount += o.quantity;
  }

  // Financials — use dateFrom as the day key
  for (const f of financials) {
    const date = f.docTypeName ? (f as { dateFrom?: string }).dateFrom ?? "" : "";
    if (!date) continue;
    const d = getDay(date);

    const netLogistics = (f.deliveryAmount || 0) - (f.stornoDeliveryAmount || 0);
    d.logistics += netLogistics;
    d.storage += f.storageAmount || 0;
    d.penalties += f.penalty || 0;

    if (f.docTypeName === "Продажа") {
      d.commission += (f.retailAmount || 0) - (f.ppvzForPay || 0) - netLogistics - (f.storageAmount || 0);
    }
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
    d.revenue = d.salesRevenue - d.returnsRevenue;
    d.grossProfit = d.revenue - d.cogs;
    d.totalExpenses = d.commission + d.logistics + d.storage + d.ads + d.penalties;
    d.profit = d.grossProfit - d.totalExpenses;
    d.profitPercent = d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0;
    d.returnRate = d.salesCount > 0 ? (d.returnsCount / d.salesCount) * 100 : 0;
  }

  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
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
        revenue: 0, salesRevenue: 0, returnsRevenue: 0, ordersRevenue: 0,
        salesCount: 0, ordersCount: 0, returnsCount: 0, buyoutsCount: 0,
        cogs: 0, grossProfit: 0, commission: 0, logistics: 0,
        storage: 0, ads: 0, penalties: 0, totalExpenses: 0,
        profit: 0, profitPercent: 0, returnRate: 0,
      });
    }
    const g = groups.get(key)!;
    g.revenue += d.revenue;
    g.salesRevenue += d.salesRevenue;
    g.returnsRevenue += d.returnsRevenue;
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
    g.totalExpenses += d.totalExpenses;
    g.profit += d.profit;
  }

  // Recalculate percent-based fields
  for (const g of groups.values()) {
    g.profitPercent = g.revenue > 0 ? (g.profit / g.revenue) * 100 : 0;
    g.returnRate = g.salesCount > 0 ? (g.returnsCount / g.salesCount) * 100 : 0;
  }

  return Array.from(groups.values()).sort((a, b) => a.date.localeCompare(b.date));
}
