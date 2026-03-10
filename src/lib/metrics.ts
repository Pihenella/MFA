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
  priceWithDisc?: number;
  quantity: number;
  isCancel: boolean;
  date: string;
};

export type Financial = {
  deliveryAmount: number;
  stornoDeliveryAmount: number;
  storageAmount: number;
  penalty: number;
  additionalPayment: number;
  deductionAmount: number;
  ppvzForPay: number;
  retailAmount: number;
  returnAmount?: number;
  docTypeName: string;
  nmId: number;
  supplierArticle: string;
};

export type Cost = {
  nmId: number;
  cost: number;
};

export type Campaign = {
  spent: number;
};

export type NmReport = {
  openCardCount: number;
  addToCartCount: number;
  ordersCount: number;
  buyoutsCount: number;
};

export type DashboardInput = {
  sales: Sale[];
  orders: Order[];
  financials: Financial[];
  costs: Cost[];
  campaigns: Campaign[];
  nmReports: NmReport[];
};

export type DashboardMetrics = {
  // Переходы и корзины
  openCardCount: number;
  addToCartCount: number;
  crToCart: number;
  crToOrder: number;
  // Заказы
  ordersRevenue: number;
  ordersCount: number;
  avgOrderValue: number;
  cancelledRevenue: number;
  cancelledCount: number;
  cancelRate: number;
  // Выручка и валовая прибыль
  salesRetail: number;
  returnsRetail: number;
  netRetail: number;
  salesForPay: number;
  returnsForPay: number;
  revenueForPay: number;
  avgCheckForPay: number;
  salesCount: number;
  returnsCount: number;
  returnRate: number;
  buyoutsCount: number;
  revenuePercent: number;
  wbDiscount: number;
  wbDiscountPercent: number;
  cogs: number;
  cogsPercent: number;
  grossProfit: number;
  grossProfitPercent: number;
  // Расходы на WB
  commission: number;
  commissionPercent: number;
  logistics: number;
  logisticsPercent: number;
  storage: number;
  storagePercent: number;
  ads: number;
  adsPercent: number;
  penalties: number;
  penaltiesPercent: number;
  deductions: number;
  deductionsPercent: number;
  compensation: number;
  compensationPercent: number;
  totalExpenses: number;
  totalExpensesPercent: number;
  // Маржинальная прибыль и налоги
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
  const { sales, orders, financials, costs, campaigns, nmReports } = input;

  const costMap = new Map<number, number>();
  for (const c of costs) costMap.set(c.nmId, c.cost);

  // ── Переходы и корзины (NM Reports) ──
  const openCardCount = nmReports.reduce((s, r) => s + r.openCardCount, 0);
  const addToCartCount = nmReports.reduce((s, r) => s + r.addToCartCount, 0);
  const nmOrdersCount = nmReports.reduce((s, r) => s + r.ordersCount, 0);
  const crToCart = openCardCount > 0 ? (addToCartCount / openCardCount) * 100 : 0;
  const crToOrder = addToCartCount > 0 ? (nmOrdersCount / addToCartCount) * 100 : 0;

  // ── Заказы (по цене продавца = priceWithDisc) ──
  const activeOrders = orders.filter((o) => !o.isCancel);
  const cancelledOrders = orders.filter((o) => o.isCancel);
  const ordersRevenue = activeOrders.reduce((s, o) => s + (o.priceWithDisc ?? o.totalPrice), 0);
  const ordersCount = activeOrders.reduce((s, o) => s + o.quantity, 0);
  const cancelledRevenue = cancelledOrders.reduce((s, o) => s + (o.priceWithDisc ?? o.totalPrice), 0);
  const cancelledCount = cancelledOrders.reduce((s, o) => s + o.quantity, 0);
  // % отмен = отменённые / активные заказы (как в MPFact)
  const cancelRate = ordersCount > 0 ? (cancelledCount / ordersCount) * 100 : 0;
  const avgOrderValue = ordersCount > 0 ? ordersRevenue / ordersCount : 0;

  // ── Продажи и возвраты ──
  const salesOnly = sales.filter((s) => !s.isReturn);
  const returnsOnly = sales.filter((s) => s.isReturn);

  // По розничной цене (цена продаж)
  const salesRetail = salesOnly.reduce((s, x) => s + x.priceWithDisc, 0);
  const returnsRetail = returnsOnly.reduce((s, x) => s + x.priceWithDisc, 0);
  const netRetail = salesRetail - returnsRetail; // Выкупная цена продаж

  // По forPay (с учётом скидок ВБ — реальная выручка продавца)
  const salesForPay = salesOnly.reduce((s, x) => s + x.forPay, 0);
  const returnsForPay = returnsOnly.reduce((s, x) => s + x.forPay, 0);
  const revenueForPay = salesForPay - returnsForPay; // Выручка с учётом скидок ВБ

  const salesCount = salesOnly.reduce((s, x) => s + x.quantity, 0);
  const returnsCount = returnsOnly.reduce((s, x) => s + x.quantity, 0);
  const buyoutsCount = salesCount - returnsCount; // Чистые выкупы

  // % возвратов = возвраты / выкупы (как в MPFact)
  const returnRate = buyoutsCount > 0 ? (returnsCount / buyoutsCount) * 100 : 0;
  const avgCheckForPay = buyoutsCount > 0 ? revenueForPay / buyoutsCount : 0;

  // Выручка, % = buyouts / (activeOrders + cancelledOrders + returns)
  const totalForBuyoutRate = ordersCount + cancelledCount + returnsCount;
  const revenuePercent = totalForBuyoutRate > 0
    ? (buyoutsCount / totalForBuyoutRate) * 100
    : 0;

  // Скидки ВБ (разница между розничной и тем, что получает продавец)
  const wbDiscount = netRetail - revenueForPay;
  const wbDiscountPercent = netRetail > 0 ? (wbDiscount / netRetail) * 100 : 0;

  // ── Себестоимость (COGS) — нетто (продажи минус возвраты) ──
  const cogsSales = salesOnly.reduce((s, x) => {
    const cost = costMap.get(x.nmId) ?? 0;
    return s + cost * x.quantity;
  }, 0);
  const cogsReturns = returnsOnly.reduce((s, x) => {
    const cost = costMap.get(x.nmId) ?? 0;
    return s + cost * x.quantity;
  }, 0);
  const cogs = cogsSales - cogsReturns;
  // Все проценты относительно netRetail (как в MPFact)
  const cogsPercent = netRetail > 0 ? (cogs / netRetail) * 100 : 0;

  // ── Валовая прибыль ──
  const grossProfit = revenueForPay - cogs;
  const grossProfitPercent = netRetail > 0 ? (grossProfit / netRetail) * 100 : 0;

  // ── Расходы маркетплейса (из финансового отчёта) ──
  const logistics = financials.reduce(
    (s, f) => s + (f.deliveryAmount || 0) - (f.stornoDeliveryAmount || 0),
    0,
  );

  const salesFinancials = financials.filter((f) => f.docTypeName === "Продажа");
  const commission = salesFinancials.reduce((s, f) => {
    const netLog = (f.deliveryAmount || 0) - (f.stornoDeliveryAmount || 0);
    return s + (f.retailAmount || 0) - (f.ppvzForPay || 0) - netLog - (f.storageAmount || 0);
  }, 0);

  const storage = financials.reduce((s, f) => s + (f.storageAmount || 0), 0);
  const penalties = financials.reduce((s, f) => s + (f.penalty || 0), 0);
  const deductions = financials.reduce((s, f) => s + (f.deductionAmount || 0), 0);
  const compensation = financials.reduce((s, f) => s + (f.additionalPayment || 0), 0);
  const ads = campaigns.reduce((s, c) => s + (c.spent || 0), 0);

  // Проценты от netRetail (как в MPFact)
  const pct = (v: number) => (netRetail > 0 ? (v / netRetail) * 100 : 0);
  const commissionPercent = pct(commission);
  const logisticsPercent = pct(logistics);
  const storagePercent = pct(storage);
  const adsPercent = pct(ads);
  const penaltiesPercent = pct(penalties);
  const deductionsPercent = pct(deductions);
  const compensationPercent = pct(compensation);

  const totalExpenses = commission + logistics + storage + ads + penalties + deductions - compensation;
  const totalExpensesPercent = pct(totalExpenses);

  // ── Маржинальная прибыль ──
  const marginalProfit = grossProfit - totalExpenses;
  const marginalProfitPercent = pct(marginalProfit);

  // ── Налог (УСН 6% от реальной выручки forPay) ──
  const tax = revenueForPay * TAX_RATE;
  const taxPercent = pct(tax);

  // ── Чистая прибыль ──
  const profit = marginalProfit - tax;
  const profitPercent = pct(profit);

  // ── ROI = прибыль / (себестоимость + реклама) ──
  const totalInvestment = cogs + ads;
  const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;

  return {
    openCardCount, addToCartCount, crToCart, crToOrder,
    ordersRevenue, ordersCount, avgOrderValue, cancelledRevenue, cancelledCount, cancelRate,
    salesRetail, returnsRetail, netRetail,
    salesForPay, returnsForPay, revenueForPay, avgCheckForPay,
    salesCount, returnsCount, returnRate, buyoutsCount,
    revenuePercent, wbDiscount, wbDiscountPercent,
    cogs, cogsPercent, grossProfit, grossProfitPercent,
    commission, commissionPercent, logistics, logisticsPercent,
    storage, storagePercent, ads, adsPercent,
    penalties, penaltiesPercent, deductions, deductionsPercent,
    compensation, compensationPercent,
    totalExpenses, totalExpensesPercent,
    marginalProfit, marginalProfitPercent, tax, taxPercent,
    profit, profitPercent, roi,
  };
}
