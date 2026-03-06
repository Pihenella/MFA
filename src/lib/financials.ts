type FinancialRow = {
  realizationreportId: number;
  dateFrom: string;
  dateTo: string;
  supplierArticle: string;
  nmId: number;
  retailAmount: number;
  returnAmount: number;
  deliveryAmount: number;
  stornoDeliveryAmount: number;
  deductionAmount: number;
  ppvzForPay: number;
  penalty: number;
  additionalPayment: number;
  storageAmount: number;
  docTypeName: string;
  warehouseName: string;
  siteCountry: string;
};

type ReportSummary = {
  reportId: number;
  dateFrom: string;
  dateTo: string;
  salesRevenue: number;
  returnsRevenue: number;
  revenue: number;
  forPay: number;
  logistics: number;
  storage: number;
  penalty: number;
  deductions: number;
  compensation: number;
  salesCount: number;
  returnsCount: number;
};

export function groupByReport(rows: FinancialRow[]): ReportSummary[] {
  const map = new Map<number, ReportSummary>();
  for (const r of rows) {
    if (!map.has(r.realizationreportId)) {
      map.set(r.realizationreportId, {
        reportId: r.realizationreportId,
        dateFrom: r.dateFrom,
        dateTo: r.dateTo,
        salesRevenue: 0, returnsRevenue: 0, revenue: 0, forPay: 0,
        logistics: 0, storage: 0, penalty: 0, deductions: 0, compensation: 0,
        salesCount: 0, returnsCount: 0,
      });
    }
    const s = map.get(r.realizationreportId)!;
    if (r.docTypeName === "Продажа") {
      s.salesRevenue += r.retailAmount;
      s.salesCount += 1;
    } else if (r.docTypeName === "Возврат") {
      s.returnsRevenue += r.retailAmount;
      s.returnsCount += 1;
    }
    s.forPay += r.ppvzForPay;
    s.logistics += r.deliveryAmount - (r.stornoDeliveryAmount || 0);
    s.storage += r.storageAmount;
    s.penalty += r.penalty;
    s.deductions += r.deductionAmount || 0;
    s.compensation += r.additionalPayment;
  }
  const result = Array.from(map.values());
  result.forEach((s) => { s.revenue = s.salesRevenue - s.returnsRevenue; });
  return result.sort((a, b) => b.dateFrom.localeCompare(a.dateFrom));
}

export function groupByWeek(rows: FinancialRow[]) {
  // Group by ISO week (Monday-based)
  const getWeekKey = (date: string) => {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - day);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  };

  const map = new Map<string, {
    week: string;
    salesRevenue: number;
    returnsRevenue: number;
    revenue: number;
    forPay: number;
    logistics: number;
    deductions: number;
    salesCount: number;
    returnsCount: number;
  }>();
  for (const r of rows) {
    const key = getWeekKey(r.dateFrom);
    if (!map.has(key)) {
      map.set(key, { week: key, salesRevenue: 0, returnsRevenue: 0, revenue: 0, forPay: 0, logistics: 0, deductions: 0, salesCount: 0, returnsCount: 0 });
    }
    const s = map.get(key)!;
    if (r.docTypeName === "Продажа") { s.salesRevenue += r.retailAmount; s.salesCount += 1; }
    if (r.docTypeName === "Возврат") { s.returnsRevenue += r.retailAmount; s.returnsCount += 1; }
    s.forPay += r.ppvzForPay;
    s.logistics += r.deliveryAmount - (r.stornoDeliveryAmount || 0);
    s.deductions += r.deductionAmount || 0;
  }
  return Array.from(map.values())
    .map((s) => ({ ...s, revenue: s.salesRevenue - s.returnsRevenue }))
    .sort((a, b) => b.week.localeCompare(a.week));
}

export type MpfactReportRow = {
  shopName: string;
  reportId: number;
  interval: string;
  profit: number;
  profitPct: number;
  roi: number;
  salesSeller: number;
  returnsSeller: number;
  revenueSeller: number;
  salesWbDisc: number | null;
  returnsWbDisc: number | null;
  revenueWbDisc: number | null;
  forPaySales: number;
  forPayReturns: number;
  forPayTotal: number;
  salesQty: number;
  returnsQty: number;
  buyoutsQty: number;
  returnsPct: number;
  costTotal: number;
  costPct: number;
  grossProfit: number;
  grossProfitPct: number;
  commission: number;
  commissionPct: number;
  logistics: number;
  logisticsPct: number;
  surcharges: number;
  surchargesPct: number;
  penalties: number;
  penaltiesPct: number;
  storage: number;
  storagePct: number;
  paidAcceptance: number | null;
  paidAcceptancePct: number | null;
  advertising: number;
  loanPayment: number | null;
  advertisingPct: number;
  otherDeductions: number;
  otherDeductionsPct: number;
  otherCharges: number | null;
  otherChargesPct: number | null;
  mpExpenses: number;
  profitBeforeTax: number;
  profitBeforeTaxPct: number;
  tax: number | null;
  taxPct: number | null;
  payoutToAccount: number;
  payoutToAccountPct: number;
};

export function groupByReportFull(
  rows: FinancialRow[],
  shopName: string,
  costMap: Map<number, number>,
  campaignsSpent: number,
): MpfactReportRow[] {
  const map = new Map<number, {
    reportId: number;
    dateFrom: string;
    dateTo: string;
    salesSeller: number;
    returnsSeller: number;
    forPaySales: number;
    forPayReturns: number;
    salesQty: number;
    returnsQty: number;
    logistics: number;
    storage: number;
    penalties: number;
    surcharges: number;
    deductions: number;
    nmIds: Set<number>;
    salesByNm: Map<number, number>;
    returnsByNm: Map<number, number>;
  }>();

  for (const r of rows) {
    if (!map.has(r.realizationreportId)) {
      map.set(r.realizationreportId, {
        reportId: r.realizationreportId,
        dateFrom: r.dateFrom,
        dateTo: r.dateTo,
        salesSeller: 0,
        returnsSeller: 0,
        forPaySales: 0,
        forPayReturns: 0,
        salesQty: 0,
        returnsQty: 0,
        logistics: 0,
        storage: 0,
        penalties: 0,
        surcharges: 0,
        deductions: 0,
        nmIds: new Set(),
        salesByNm: new Map(),
        returnsByNm: new Map(),
      });
    }
    const s = map.get(r.realizationreportId)!;
    s.nmIds.add(r.nmId);

    if (r.docTypeName === "Продажа") {
      s.salesSeller += r.retailAmount;
      s.forPaySales += r.ppvzForPay;
      s.salesQty += 1;
      s.salesByNm.set(r.nmId, (s.salesByNm.get(r.nmId) ?? 0) + 1);
    } else if (r.docTypeName === "Возврат") {
      s.returnsSeller += Math.abs(r.retailAmount);
      s.forPayReturns += Math.abs(r.ppvzForPay);
      s.returnsQty += 1;
      s.returnsByNm.set(r.nmId, (s.returnsByNm.get(r.nmId) ?? 0) + 1);
    }
    s.logistics += r.deliveryAmount - (r.stornoDeliveryAmount || 0);
    s.storage += r.storageAmount;
    s.penalties += r.penalty;
    s.surcharges += r.additionalPayment;
    s.deductions += r.deductionAmount || 0;
  }

  const reportCount = map.size;
  const adsPerReport = reportCount > 0 ? campaignsSpent / reportCount : 0;

  const result: MpfactReportRow[] = [];

  for (const s of map.values()) {
    const revenueSeller = s.salesSeller - s.returnsSeller;
    const forPayTotal = s.forPaySales - s.forPayReturns;
    const buyoutsQty = s.salesQty - s.returnsQty;
    const returnsPct = s.salesQty > 0 ? (s.returnsQty / s.salesQty) * 100 : 0;

    // Cost: sum cost * net qty per nmId
    let costTotal = 0;
    for (const nmId of s.nmIds) {
      const unitCost = costMap.get(nmId) ?? 0;
      const sold = s.salesByNm.get(nmId) ?? 0;
      const returned = s.returnsByNm.get(nmId) ?? 0;
      costTotal += unitCost * (sold - returned);
    }

    const commission = s.salesSeller - s.forPaySales - s.logistics;
    const grossProfit = forPayTotal - costTotal;
    const mpExpenses = Math.abs(commission) + Math.abs(s.logistics) + Math.abs(s.storage) + Math.abs(s.penalties) + Math.abs(s.deductions);
    const profitBeforeTax = forPayTotal - costTotal - adsPerReport;
    const profit = profitBeforeTax;
    const roi = costTotal > 0 ? (profit / costTotal) * 100 : 0;

    const pct = (val: number, base: number) => base !== 0 ? (val / Math.abs(base)) * 100 : 0;

    result.push({
      shopName,
      reportId: s.reportId,
      interval: `${s.dateFrom}—${s.dateTo}`,
      profit,
      profitPct: pct(profit, revenueSeller),
      roi,
      salesSeller: s.salesSeller,
      returnsSeller: s.returnsSeller,
      revenueSeller,
      salesWbDisc: null,
      returnsWbDisc: null,
      revenueWbDisc: null,
      forPaySales: s.forPaySales,
      forPayReturns: -s.forPayReturns,
      forPayTotal,
      salesQty: s.salesQty,
      returnsQty: s.returnsQty,
      buyoutsQty,
      returnsPct,
      costTotal: -costTotal,
      costPct: pct(-costTotal, revenueSeller),
      grossProfit,
      grossProfitPct: pct(grossProfit, revenueSeller),
      commission: -Math.abs(commission),
      commissionPct: pct(-Math.abs(commission), revenueSeller),
      logistics: -Math.abs(s.logistics),
      logisticsPct: pct(-Math.abs(s.logistics), revenueSeller),
      surcharges: s.surcharges,
      surchargesPct: pct(s.surcharges, revenueSeller),
      penalties: -Math.abs(s.penalties),
      penaltiesPct: pct(-Math.abs(s.penalties), revenueSeller),
      storage: -Math.abs(s.storage),
      storagePct: pct(-Math.abs(s.storage), revenueSeller),
      paidAcceptance: null,
      paidAcceptancePct: null,
      advertising: -adsPerReport,
      loanPayment: null,
      advertisingPct: pct(-adsPerReport, revenueSeller),
      otherDeductions: -Math.abs(s.deductions),
      otherDeductionsPct: pct(-Math.abs(s.deductions), revenueSeller),
      otherCharges: null,
      otherChargesPct: null,
      mpExpenses: -mpExpenses,
      profitBeforeTax,
      profitBeforeTaxPct: pct(profitBeforeTax, revenueSeller),
      tax: null,
      taxPct: null,
      payoutToAccount: forPayTotal,
      payoutToAccountPct: pct(forPayTotal, revenueSeller),
    });
  }

  return result.sort((a, b) => b.interval.localeCompare(a.interval));
}
