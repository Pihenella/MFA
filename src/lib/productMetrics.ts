import type { Sale, Financial, Cost, Campaign } from "./metrics";

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
};

export type ProductMetricsInput = {
  sales: Sale[];
  financials: (Financial & { subject?: string })[];
  costs: Cost[];
  campaigns: (Campaign & { nmId?: number })[];
};

export function computeProductMetrics(input: ProductMetricsInput): ProductMetrics[] {
  const { sales, financials, costs, campaigns } = input;

  const costMap = new Map<number, number>();
  for (const c of costs) costMap.set(c.nmId, c.cost);

  // Collect all known nmIds
  const nmIds = new Set<number>();
  for (const s of sales) nmIds.add(s.nmId);
  for (const f of financials) nmIds.add(f.nmId);

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

  // Group campaigns by nmId (if available)
  const adsByNm = new Map<number, number>();
  for (const c of campaigns) {
    const id = (c as { nmId?: number }).nmId;
    if (id) adsByNm.set(id, (adsByNm.get(id) ?? 0) + (c.spent || 0));
  }

  const results: ProductMetrics[] = [];

  for (const nmId of nmIds) {
    const nmSales = salesByNm.get(nmId) ?? [];
    const nmFin = finByNm.get(nmId) ?? [];

    const salesOnly = nmSales.filter((s) => !s.isReturn);
    const returnsOnly = nmSales.filter((s) => s.isReturn);

    const salesRevenue = salesOnly.reduce((s, x) => s + x.priceWithDisc, 0);
    const returnsRevenue = returnsOnly.reduce((s, x) => s + x.priceWithDisc, 0);
    const revenue = salesRevenue - returnsRevenue;
    const salesCount = salesOnly.reduce((s, x) => s + x.quantity, 0);
    const returnsCount = returnsOnly.reduce((s, x) => s + x.quantity, 0);
    const returnRate = salesCount > 0 ? (returnsCount / salesCount) * 100 : 0;

    const unitCost = costMap.get(nmId) ?? 0;
    const cogs = unitCost * salesCount;
    const grossProfit = revenue - cogs;

    // Financial metrics per product
    const logistics = nmFin.reduce(
      (s, f) => s + (f.deliveryAmount || 0) - (f.stornoDeliveryAmount || 0),
      0,
    );

    const salesFin = nmFin.filter((f) => f.docTypeName === "Продажа");
    const commission = salesFin.reduce((s, f) => {
      const netLogistics = (f.deliveryAmount || 0) - (f.stornoDeliveryAmount || 0);
      return s + (f.retailAmount || 0) - (f.ppvzForPay || 0) - netLogistics - (f.storageAmount || 0);
    }, 0);

    const storage = nmFin.reduce((s, f) => s + (f.storageAmount || 0), 0);
    const penalties = nmFin.reduce((s, f) => s + (f.penalty || 0), 0);
    const ads = adsByNm.get(nmId) ?? 0;

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
    });
  }

  return results.sort((a, b) => b.salesRevenue - a.salesRevenue);
}
