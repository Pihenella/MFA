export type Sale = {
  nmId: number;
  priceWithDisc: number;
  forPay: number;
  quantity: number;
  isReturn: boolean;
  date: string;
};

export type Order = {
  nmId: number;
  totalPrice: number;
  quantity: number;
  isCancel: boolean;
  date: string;
};

export type Financial = {
  deliveryAmount: number;
  stornoDeliveryAmount?: number;
  storageAmount: number;
  penalty: number;
  additionalPayment: number;
  ppvzForPay: number;
  retailAmount: number;
  returnAmount?: number;
  docTypeName: string;
};

export type Cost = {
  nmId: number;
  cost: number;
};

export type Campaign = {
  spent: number;
};

export type DashboardInput = {
  sales: Sale[];
  orders: Order[];
  financials: Financial[];
  costs: Cost[];
  campaigns: Campaign[];
};

export type DashboardMetrics = {
  // Orders
  ordersRevenue: number;
  ordersCount: number;
  cancelledRevenue: number;
  cancelledCount: number;
  cancelRate: number;
  // Revenue
  salesRevenue: number;
  returnsRevenue: number;
  revenue: number;
  avgCheck: number;
  salesCount: number;
  returnsCount: number;
  returnRate: number;
  buyoutsCount: number;
  buyoutRate: number;
  cogs: number;
  cogsPercent: number;
  avgCogs: number;
  // Gross profit
  grossProfit: number;
  grossProfitPercent: number;
  // Marketplace expenses
  commission: number;
  commissionPercent: number;
  logistics: number;
  logisticsPercent: number;
  storage: number;
  storagePercent: number;
  ads: number;
  adsPercent: number;
  otherServices: number;
  otherServicesPercent: number;
  compensation: number;
  compensationPercent: number;
  totalExpenses: number;
  totalExpensesPercent: number;
  // Margin & tax
  marginalProfit: number;
  marginalProfitPercent: number;
  tax: number;
  taxPercent: number;
  profit: number;
  profitPercent: number;
  roi: number;
};

const TAX_RATE = 0.06; // УСН 6%

export function computeDashboardMetrics(input: DashboardInput): DashboardMetrics {
  const { sales, orders, financials, costs, campaigns } = input;

  const costMap = new Map<number, number>();
  for (const c of costs) costMap.set(c.nmId, c.cost);

  // Orders
  const activeOrders = orders.filter((o) => !o.isCancel);
  const cancelledOrders = orders.filter((o) => o.isCancel);
  const ordersRevenue = activeOrders.reduce((s, o) => s + o.totalPrice, 0);
  const ordersCount = activeOrders.reduce((s, o) => s + o.quantity, 0);
  const cancelledRevenue = cancelledOrders.reduce((s, o) => s + o.totalPrice, 0);
  const cancelledCount = cancelledOrders.reduce((s, o) => s + o.quantity, 0);
  const totalOrders = ordersCount + cancelledCount;
  const cancelRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

  // Sales & returns
  const salesOnly = sales.filter((s) => !s.isReturn);
  const returnsOnly = sales.filter((s) => s.isReturn);
  const salesRevenue = salesOnly.reduce((s, x) => s + x.priceWithDisc, 0);
  const returnsRevenue = returnsOnly.reduce((s, x) => s + x.priceWithDisc, 0);
  const revenue = salesRevenue - returnsRevenue;
  const salesCount = salesOnly.reduce((s, x) => s + x.quantity, 0);
  const returnsCount = returnsOnly.reduce((s, x) => s + x.quantity, 0);
  const returnRate = salesCount > 0 ? (returnsCount / salesCount) * 100 : 0;
  const buyoutsCount = salesCount;
  const totalOrdersForBuyout = ordersCount + returnsCount;
  const buyoutRate = totalOrdersForBuyout > 0 ? (buyoutsCount / totalOrdersForBuyout) * 100 : 0;
  const avgCheck = salesCount > 0 ? salesRevenue / salesCount : 0;

  // COGS
  const cogs = salesOnly.reduce((s, x) => {
    const cost = costMap.get(x.nmId) ?? 0;
    return s + cost * x.quantity;
  }, 0);
  const cogsPercent = revenue > 0 ? (cogs / revenue) * 100 : 0;
  const avgCogs = salesCount > 0 ? cogs / salesCount : 0;

  // Gross profit
  const grossProfit = revenue - cogs;
  const grossProfitPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // Marketplace expenses (from financials)
  const logistics = financials.reduce((s, f) => s + (f.deliveryAmount || 0), 0);
  const storage = financials.reduce((s, f) => s + (f.storageAmount || 0), 0);
  const compensation = financials.reduce((s, f) => s + (f.additionalPayment || 0), 0);
  const penalties = financials.reduce((s, f) => s + (f.penalty || 0), 0);
  const otherServices = penalties;

  // Commission = revenue - forPay - logistics
  const forPay = sales.filter(s => !s.isReturn).reduce((s, x) => s + x.forPay, 0);
  const commission = Math.max(0, revenue - forPay - logistics);
  const commissionPercent = revenue > 0 ? (commission / revenue) * 100 : 0;

  // Ads
  const ads = campaigns.reduce((s, c) => s + (c.spent || 0), 0);

  const logisticsPercent = revenue > 0 ? (logistics / revenue) * 100 : 0;
  const storagePercent = revenue > 0 ? (storage / revenue) * 100 : 0;
  const adsPercent = revenue > 0 ? (ads / revenue) * 100 : 0;
  const otherServicesPercent = revenue > 0 ? (otherServices / revenue) * 100 : 0;
  const compensationPercent = revenue > 0 ? (compensation / revenue) * 100 : 0;

  const totalExpenses = commission + logistics + storage + ads + otherServices - compensation;
  const totalExpensesPercent = revenue > 0 ? (totalExpenses / revenue) * 100 : 0;

  // Marginal profit
  const marginalProfit = grossProfit - totalExpenses;
  const marginalProfitPercent = revenue > 0 ? (marginalProfit / revenue) * 100 : 0;

  // Tax (УСН 6%)
  const tax = revenue * TAX_RATE;
  const taxPercent = TAX_RATE * 100;

  // Net profit
  const profit = marginalProfit - tax;
  const profitPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
  const roi = cogs > 0 ? (profit / cogs) * 100 : 0;

  return {
    ordersRevenue, ordersCount, cancelledRevenue, cancelledCount, cancelRate,
    salesRevenue, returnsRevenue, revenue, avgCheck, salesCount, returnsCount,
    returnRate, buyoutsCount, buyoutRate, cogs, cogsPercent, avgCogs,
    grossProfit, grossProfitPercent,
    commission, commissionPercent, logistics, logisticsPercent,
    storage, storagePercent, ads, adsPercent,
    otherServices, otherServicesPercent, compensation, compensationPercent,
    totalExpenses, totalExpensesPercent,
    marginalProfit, marginalProfitPercent, tax, taxPercent,
    profit, profitPercent, roi,
  };
}
