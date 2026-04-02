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
  deliveryRub?: number;
  stornoDeliveryAmount: number;
  storageAmount: number;
  penalty: number;
  additionalPayment: number;
  deductionAmount: number;
  ppvzForPay: number;
  ppvzSalesTotal?: number;
  acceptance?: number;
  retailAmount: number;
  retailPrice?: number;
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
  // Выручка (из financials — как МП Факт)
  salesSeller: number;
  returnsSeller: number;
  revenueSeller: number;
  salesWbDisc: number;
  returnsWbDisc: number;
  revenueWbDisc: number;
  forPaySales: number;
  forPayReturns: number;
  forPayTotal: number;
  avgCheck: number;
  salesCount: number;
  returnsCount: number;
  returnRate: number;
  buyoutsCount: number;
  // Себестоимость и валовая прибыль
  cogs: number;
  cogsPercent: number;
  grossProfit: number;
  grossProfitPercent: number;
  // Расходы на МП
  commission: number;
  commissionPercent: number;
  logistics: number;
  logisticsPercent: number;
  storage: number;
  storagePercent: number;
  acceptance: number;
  acceptancePercent: number;
  ads: number;
  adsPercent: number;
  penalties: number;
  penaltiesPercent: number;
  deductions: number;
  deductionsPercent: number;
  compensation: number;
  compensationPercent: number;
  mpExpenses: number;
  mpExpensesPercent: number;
  // Прибыль и налоги
  profitBeforeTax: number;
  profitBeforeTaxPercent: number;
  tax: number;
  taxPercent: number;
  profit: number;
  profitPercent: number;
  roi: number;
};

const TAX_RATE = 0.06; // УСН 6%

export function computeDashboardMetrics(input: DashboardInput): DashboardMetrics {
  const { orders, financials, costs, campaigns, nmReports } = input;

  const costMap = new Map<number, number>();
  for (const c of costs) costMap.set(c.nmId, c.cost);

  // ── Переходы и корзины (NM Reports — без изменений) ──
  const openCardCount = nmReports.reduce((s, r) => s + r.openCardCount, 0);
  const addToCartCount = nmReports.reduce((s, r) => s + r.addToCartCount, 0);
  const nmOrdersCount = nmReports.reduce((s, r) => s + r.ordersCount, 0);
  const crToCart = openCardCount > 0 ? (addToCartCount / openCardCount) * 100 : 0;
  const crToOrder = addToCartCount > 0 ? (nmOrdersCount / addToCartCount) * 100 : 0;

  // ── Заказы (из orders — без изменений) ──
  const activeOrders = orders.filter((o) => !o.isCancel);
  const cancelledOrders = orders.filter((o) => o.isCancel);
  const ordersRevenue = activeOrders.reduce((s, o) => s + (o.priceWithDisc ?? o.totalPrice), 0);
  const ordersCount = activeOrders.reduce((s, o) => s + o.quantity, 0);
  const cancelledRevenue = cancelledOrders.reduce((s, o) => s + (o.priceWithDisc ?? o.totalPrice), 0);
  const cancelledCount = cancelledOrders.reduce((s, o) => s + o.quantity, 0);
  const cancelRate = ordersCount > 0 ? (cancelledCount / ordersCount) * 100 : 0;
  const avgOrderValue = ordersCount > 0 ? ordersRevenue / ordersCount : 0;

  // ══════════════════════════════════════════════════════════════
  // ВСЯ ФИНАНСОВАЯ АНАЛИТИКА — ТОЛЬКО ИЗ financials (reportDetailByPeriod)
  // Как в МП Факт: единый источник данных для P&L
  // ══════════════════════════════════════════════════════════════

  const salesFin = financials.filter((f) => f.docTypeName === "Продажа");
  const returnsFin = financials.filter((f) => f.docTypeName === "Возврат");

  // ── Продажи и возвраты (цена продавца = retailPrice, со скидкой WB = retailAmount) ──
  const salesSeller = salesFin.reduce((s, f) => s + (f.retailPrice ?? f.retailAmount ?? 0), 0);
  const returnsSeller = returnsFin.reduce((s, f) => s + Math.abs(f.retailPrice ?? f.retailAmount ?? 0), 0);
  const revenueSeller = salesSeller - returnsSeller;

  // ── Продажи со скидкой WB (retailAmount = цена после SPP скидки) ──
  const salesWbDisc = salesFin.reduce((s, f) => s + (f.retailAmount ?? 0), 0);
  const returnsWbDisc = returnsFin.reduce((s, f) => s + Math.abs(f.retailAmount ?? 0), 0);
  const revenueWbDisc = salesWbDisc - returnsWbDisc;

  // ── К перечислению (ppvzForPay) ──
  const forPaySales = salesFin.reduce((s, f) => s + (f.ppvzForPay || 0), 0);
  const forPayReturns = returnsFin.reduce((s, f) => s + Math.abs(f.ppvzForPay || 0), 0);
  const forPayTotal = forPaySales - forPayReturns;

  // ── Количество (из financials — каждая строка = 1 единица) ──
  const salesCount = salesFin.length;
  const returnsCount = returnsFin.length;
  const buyoutsCount = salesCount - returnsCount;
  const returnRate = buyoutsCount > 0 ? (returnsCount / buyoutsCount) * 100 : 0;
  const avgCheck = buyoutsCount > 0 ? revenueSeller / buyoutsCount : 0;

  // ── Себестоимость (COGS) — нетто по nmId ──
  const salesByNm = new Map<number, number>();
  const returnsByNm = new Map<number, number>();
  for (const f of salesFin) {
    salesByNm.set(f.nmId, (salesByNm.get(f.nmId) ?? 0) + 1);
  }
  for (const f of returnsFin) {
    returnsByNm.set(f.nmId, (returnsByNm.get(f.nmId) ?? 0) + 1);
  }
  const allNmIds = new Set([...salesByNm.keys(), ...returnsByNm.keys()]);
  let cogs = 0;
  for (const nmId of allNmIds) {
    const unitCost = costMap.get(nmId) ?? 0;
    const sold = salesByNm.get(nmId) ?? 0;
    const returned = returnsByNm.get(nmId) ?? 0;
    cogs += unitCost * (sold - returned);
  }

  // Все проценты относительно revenueSeller (как в МП Факт)
  const pct = (v: number) => (revenueSeller !== 0 ? (v / Math.abs(revenueSeller)) * 100 : 0);

  const cogsPercent = pct(cogs);

  // ── Валовая прибыль = Выручка (цена продавца) - Себестоимость ──
  const grossProfit = revenueSeller - cogs;
  const grossProfitPercent = pct(grossProfit);

  // ── Расходы маркетплейса (из financials — все строки) ──

  // Комиссия = Выручка(цена продавца) - К перечислению (чистая разница, как в МП Факт)
  const commission = revenueSeller - forPayTotal;

  // Логистика (deliveryRub = стоимость в руб, deliveryAmount = кол-во)
  const logistics = financials.reduce(
    (s, f) => s + (f.deliveryRub ?? 0),
    0,
  );

  // Хранение
  const storage = financials.reduce((s, f) => s + (f.storageAmount || 0), 0);

  // Платная приёмка
  const acceptance = financials.reduce((s, f) => s + (f.acceptance || 0), 0);

  // Штрафы
  const penalties = financials.reduce((s, f) => s + (f.penalty || 0), 0);

  // Удержания
  const deductions = financials.reduce((s, f) => s + (f.deductionAmount || 0), 0);

  // Компенсации (доплаты)
  const compensation = financials.reduce((s, f) => s + (f.additionalPayment || 0), 0);

  // Реклама
  const ads = campaigns.reduce((s, c) => s + (c.spent || 0), 0);

  // Удержания из отчёта реализации включают рекламу — вычитаем чтобы не считать дважды
  const otherDeductions = Math.max(0, deductions - ads);

  const commissionPercent = pct(commission);
  const logisticsPercent = pct(logistics);
  const storagePercent = pct(storage);
  const acceptancePercent = pct(acceptance);
  const adsPercent = pct(ads);
  const penaltiesPercent = pct(penalties);
  const deductionsPercent = pct(otherDeductions);
  const compensationPercent = pct(compensation);

  // Итого расходы МП (как в МП Факт — без рекламы, она отдельно)
  const mpExpenses = commission + logistics + storage + acceptance + penalties + otherDeductions - compensation;
  const mpExpensesPercent = pct(mpExpenses);

  // ── Прибыль до налога = Валовая прибыль - Расходы МП - Реклама ──
  const profitBeforeTax = grossProfit - mpExpenses - ads;
  const profitBeforeTaxPercent = pct(profitBeforeTax);

  // ── Налог (УСН 6% от выручки со скидкой WB — как в МП Факт) ──
  const tax = revenueWbDisc * TAX_RATE;
  const taxPercent = pct(tax);

  // ── Чистая прибыль ──
  const profit = profitBeforeTax - tax;
  const profitPercent = pct(profit);

  // ── ROI = прибыль / себестоимость (как в МП Факт) ──
  const roi = cogs > 0 ? (profit / cogs) * 100 : 0;

  return {
    openCardCount, addToCartCount, crToCart, crToOrder,
    ordersRevenue, ordersCount, avgOrderValue, cancelledRevenue, cancelledCount, cancelRate,
    salesSeller, returnsSeller, revenueSeller,
    salesWbDisc, returnsWbDisc, revenueWbDisc,
    forPaySales, forPayReturns, forPayTotal,
    avgCheck, salesCount, returnsCount, returnRate, buyoutsCount,
    cogs, cogsPercent, grossProfit, grossProfitPercent,
    commission, commissionPercent, logistics, logisticsPercent,
    storage, storagePercent, acceptance, acceptancePercent,
    ads, adsPercent, penalties, penaltiesPercent,
    deductions: otherDeductions, deductionsPercent, compensation, compensationPercent,
    mpExpenses, mpExpensesPercent,
    profitBeforeTax, profitBeforeTaxPercent, tax, taxPercent,
    profit, profitPercent, roi,
  };
}
