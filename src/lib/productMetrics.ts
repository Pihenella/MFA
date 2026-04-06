import type { Sale, Financial, Cost, Campaign } from "./metrics";

export type NmReport = {
  nmId: number;
  openCardCount: number;
  addToCartCount: number;
  ordersCount: number;
  buyoutsCount: number;
  convOpenToCart: number;
  convCartToOrder: number;
};

export type ProductMetrics = {
  nmId: number;
  supplierArticle: string;
  subject: string;
  salesRevenue: number;
  salesCount: number;
  returnsCount: number;
  returnRate: number;
  cogs: number;
  grossProfit: number;
  commission: number;
  logistics: number;
  storage: number;
  penalties: number;
  ads: number;
  profit: number;
  profitPercent: number;
  roi: number;
  // NM Report data
  views: number;
  addToCart: number;
  addToCartRate: number;
  cartToOrderRate: number;
};

export type ProductMetricsInput = {
  sales: Sale[];
  financials: (Financial & { subject?: string })[];
  costs: Cost[];
  campaigns: (Campaign & { nmId?: number })[];
  nmReports?: NmReport[];
};

export function computeProductMetrics(input: ProductMetricsInput): ProductMetrics[] {
  const { sales, financials, costs, campaigns, nmReports } = input;

  const costMap = new Map<number, number>();
  for (const c of costs) costMap.set(c.nmId, c.cost);

  // NM Reports by nmId
  const nmReportMap = new Map<number, NmReport>();
  if (nmReports) {
    for (const r of nmReports) nmReportMap.set(r.nmId, r);
  }

  // Collect all known nmIds
  const nmIds = new Set<number>();
  for (const s of sales) nmIds.add(s.nmId);
  for (const f of financials) nmIds.add(f.nmId);
  if (nmReports) {
    for (const r of nmReports) nmIds.add(r.nmId);
  }

  // Group sales by nmId
  const salesByNm = new Map<number, Sale[]>();
  for (const s of sales) {
    if (!salesByNm.has(s.nmId)) salesByNm.set(s.nmId, []);
    salesByNm.get(s.nmId)!.push(s);
  }

  // Group financials by nmId
  const finByNm = new Map<number, Financial[]>();
  for (const f of financials) {
    if (!finByNm.has(f.nmId)) finByNm.set(f.nmId, []);
    finByNm.get(f.nmId)!.push(f);
  }

  // Рекламные удержания в финансовом отчёте идут с nmId=0,
  // их нельзя разнести по конкретным товарам — реклама = 0 на уровне товара

  const results: ProductMetrics[] = [];

  for (const nmId of nmIds) {
    const nmSales = salesByNm.get(nmId) ?? [];
    const nmFin = finByNm.get(nmId) ?? [];

    // Все финансовые метрики из financials (как МП Факт)
    const salesFin = nmFin.filter((f) => f.docTypeName === "Продажа");
    const returnsFin = nmFin.filter((f) => f.docTypeName === "Возврат");

    const salesRevenue = salesFin.reduce((s, f) => s + (f.retailPrice ?? f.retailAmount ?? 0), 0);
    const returnsRevenue = returnsFin.reduce((s, f) => s + Math.abs(f.retailPrice ?? f.retailAmount ?? 0), 0);
    const revenue = salesRevenue - returnsRevenue;
    const salesCount = salesFin.length;
    const returnsCount = returnsFin.length;
    const buyouts = salesCount - returnsCount;
    const returnRate = buyouts > 0 ? (returnsCount / buyouts) * 100 : 0;

    const unitCost = costMap.get(nmId) ?? 0;
    const cogs = unitCost * buyouts;
    // Валовая прибыль = выручка по цене продавца - себестоимость
    const grossProfit = revenue - cogs;

    // К перечислению
    const forPaySales = salesFin.reduce((s, f) => s + (f.ppvzForPay || 0), 0);
    const forPayReturns = returnsFin.reduce((s, f) => s + Math.abs(f.ppvzForPay || 0), 0);
    const forPayTotal = forPaySales - forPayReturns;

    // Комиссия = выручка - к перечислению (как в МП Факт)
    const commission = revenue - forPayTotal;

    const logistics = nmFin.reduce(
      (s, f) => s + (f.deliveryRub ?? 0),
      0,
    );
    const storage = nmFin.reduce((s, f) => s + (f.storageAmount || 0), 0);
    const penalties = nmFin.reduce((s, f) => s + (f.penalty || 0), 0);
    const ads = 0; // Реклама учитывается только на уровне дашборда (удержания с nmId=0)

    const totalExpenses = commission + logistics + storage + ads + penalties;
    const profit = grossProfit - totalExpenses;
    const profitPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
    const roi = cogs > 0 ? (profit / cogs) * 100 : 0;

    // Get article and subject from financials (fallback to sale data)
    let supplierArticle = "";
    let subject = "";
    if (nmFin.length > 0) {
      supplierArticle = nmFin[0].supplierArticle || "";
      subject = (nmFin[0] as { subject?: string }).subject ?? "";
    }
    if (!supplierArticle) {
      const sale = nmSales[0];
      if (sale) supplierArticle = String(sale.nmId);
    }

    // NM Report data
    const nmReport = nmReportMap.get(nmId);
    const views = nmReport?.openCardCount ?? 0;
    const addToCart = nmReport?.addToCartCount ?? 0;
    const addToCartRate = nmReport?.convOpenToCart ?? (views > 0 ? (addToCart / views) * 100 : 0);
    const cartToOrderRate = nmReport?.convCartToOrder ?? 0;

    results.push({
      nmId,
      supplierArticle,
      subject,
      salesRevenue: revenue,
      salesCount,
      returnsCount,
      returnRate,
      cogs,
      grossProfit,
      commission,
      logistics,
      storage,
      penalties,
      ads,
      profit,
      profitPercent,
      roi,
      views,
      addToCart,
      addToCartRate,
      cartToOrderRate,
    });
  }

  return results.sort((a, b) => b.salesRevenue - a.salesRevenue);
}
