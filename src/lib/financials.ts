type FinancialRow = {
  realizationreportId: number;
  dateFrom: string;
  dateTo: string;
  supplierArticle: string;
  nmId: number;
  retailAmount: number;
  retailPrice?: number;
  returnAmount: number;
  deliveryAmount: number;
  deliveryRub?: number;
  stornoDeliveryAmount: number;
  deductionAmount: number;
  ppvzForPay: number;
  ppvzSalesTotal?: number;
  acceptance?: number;
  penalty: number;
  additionalPayment: number;
  storageAmount: number;
  docTypeName: string;
  supplierOperName?: string;
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
    s.logistics += r.deliveryRub ?? (r.deliveryAmount - (r.stornoDeliveryAmount || 0));
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
    s.logistics += r.deliveryRub ?? (r.deliveryAmount - (r.stornoDeliveryAmount || 0));
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
    salesWbDisc: number;
    returnsWbDisc: number;
    salesQty: number;
    returnsQty: number;
    logistics: number;
    storage: number;
    acceptance: number;
    penalties: number;
    surcharges: number;
    deductions: number;
    adDeductions: number;
    otherDeductions: number;
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
        salesWbDisc: 0,
        returnsWbDisc: 0,
        salesQty: 0,
        returnsQty: 0,
        logistics: 0,
        storage: 0,
        acceptance: 0,
        penalties: 0,
        surcharges: 0,
        deductions: 0,
        adDeductions: 0,
        otherDeductions: 0,
        nmIds: new Set(),
        salesByNm: new Map(),
        returnsByNm: new Map(),
      });
    }
    const s = map.get(r.realizationreportId)!;
    s.nmIds.add(r.nmId);

    const isSale = r.docTypeName === "Продажа" && (r.retailAmount > 0 || r.nmId > 0);
    const isReturn = r.docTypeName === "Возврат" && r.nmId > 0;

    if (isSale) {
      s.salesSeller += r.retailPrice ?? r.retailAmount;
      s.forPaySales += r.ppvzForPay;
      s.salesWbDisc += r.retailAmount;
      s.salesQty += 1;
      s.salesByNm.set(r.nmId, (s.salesByNm.get(r.nmId) ?? 0) + 1);
    } else if (isReturn) {
      s.returnsSeller += Math.abs(r.retailPrice ?? r.retailAmount);
      s.forPayReturns += Math.abs(r.ppvzForPay);
      s.returnsWbDisc += Math.abs(r.retailAmount);
      s.returnsQty += 1;
      s.returnsByNm.set(r.nmId, (s.returnsByNm.get(r.nmId) ?? 0) + 1);
    }
    s.logistics += r.deliveryRub ?? 0;
    s.storage += r.storageAmount;
    s.acceptance += r.acceptance ?? 0;
    s.penalties += r.penalty;
    s.surcharges += r.additionalPayment;
    const ded = r.deductionAmount || 0;
    if (ded > 0 && r.nmId === 0 && ded >= 10000) {
      s.adDeductions += ded;
    } else {
      s.otherDeductions += ded;
    }
  }

  const reportCount = map.size;
  const adsPerReport = reportCount > 0 ? campaignsSpent / reportCount : 0;

  const result: MpfactReportRow[] = [];

  for (const s of map.values()) {
    const revenueSeller = s.salesSeller - s.returnsSeller;
    const forPayTotal = s.forPaySales - s.forPayReturns;
    const revenueWbDisc = s.salesWbDisc - s.returnsWbDisc;
    const buyoutsQty = s.salesQty - s.returnsQty;
    const returnsPct = buyoutsQty > 0 ? (s.returnsQty / buyoutsQty) * 100 : 0;

    let costTotal = 0;
    for (const nmId of s.nmIds) {
      const unitCost = costMap.get(nmId) ?? 0;
      const sold = s.salesByNm.get(nmId) ?? 0;
      const returned = s.returnsByNm.get(nmId) ?? 0;
      costTotal += unitCost * (sold - returned);
    }

    const commission = revenueSeller - forPayTotal;
    const grossProfit = revenueSeller - costTotal;
    // Реклама: максимум из campaigns API (пропорционально) и рекламных удержаний
    const adsForReport = Math.max(adsPerReport, s.adDeductions);
    const mpExpenses = commission + Math.abs(s.logistics) + Math.abs(s.storage) + Math.abs(s.acceptance) + Math.abs(s.penalties) + adsForReport + Math.abs(s.otherDeductions) - s.surcharges;
    const profitBeforeTax = grossProfit - mpExpenses;
    // Налог = 6% от выручки со скидкой WB
    const tax = revenueWbDisc * 0.06;
    const profit = profitBeforeTax - tax;
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
      salesWbDisc: s.salesWbDisc,
      returnsWbDisc: -s.returnsWbDisc,
      revenueWbDisc,
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
      commission: -commission,
      commissionPct: pct(-commission, revenueSeller),
      logistics: -Math.abs(s.logistics),
      logisticsPct: pct(-Math.abs(s.logistics), revenueSeller),
      surcharges: s.surcharges,
      surchargesPct: pct(s.surcharges, revenueSeller),
      penalties: -Math.abs(s.penalties),
      penaltiesPct: pct(-Math.abs(s.penalties), revenueSeller),
      storage: -Math.abs(s.storage),
      storagePct: pct(-Math.abs(s.storage), revenueSeller),
      paidAcceptance: -Math.abs(s.acceptance),
      paidAcceptancePct: pct(-Math.abs(s.acceptance), revenueSeller),
      advertising: -adsForReport,
      loanPayment: null,
      advertisingPct: pct(-adsForReport, revenueSeller),
      otherDeductions: -Math.abs(s.otherDeductions),
      otherDeductionsPct: pct(-Math.abs(s.otherDeductions), revenueSeller),
      otherCharges: null,
      otherChargesPct: null,
      mpExpenses: -mpExpenses,
      profitBeforeTax,
      profitBeforeTaxPct: pct(profitBeforeTax, revenueSeller),
      tax: -tax,
      taxPct: pct(-tax, revenueSeller),
      payoutToAccount: forPayTotal,
      payoutToAccountPct: pct(forPayTotal, revenueSeller),
    });
  }

  return result.sort((a, b) => b.interval.localeCompare(a.interval));
}

export type MpfactDetailRow = {
  date: string;
  year: number;
  month: string;
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
};

export function groupByPeriodFull(
  rows: FinancialRow[],
  granularity: "day" | "week" | "month",
  costMap: Map<number, number>,
  campaignsSpent: number,
): MpfactDetailRow[] {
  const getKey = (dateStr: string): string => {
    if (granularity === "day") return dateStr;
    if (granularity === "month") return dateStr.slice(0, 7);
    // week: ISO week (Monday-based)
    const d = new Date(dateStr);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - day);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  };

  const map = new Map<string, {
    key: string;
    firstDate: string;
    salesSeller: number;
    returnsSeller: number;
    forPaySales: number;
    forPayReturns: number;
    salesWbDisc: number;
    returnsWbDisc: number;
    salesQty: number;
    returnsQty: number;
    logistics: number;
    storage: number;
    acceptance: number;
    penalties: number;
    surcharges: number;
    deductions: number;
    adDeductions: number;
    otherDeductions: number;
    nmIds: Set<number>;
    salesByNm: Map<number, number>;
    returnsByNm: Map<number, number>;
  }>();

  for (const r of rows) {
    const opDate = (r as any).rrDt ?? r.dateFrom;
    const key = getKey(opDate);
    if (!map.has(key)) {
      map.set(key, {
        key,
        firstDate: opDate,
        salesSeller: 0,
        returnsSeller: 0,
        forPaySales: 0,
        forPayReturns: 0,
        salesWbDisc: 0,
        returnsWbDisc: 0,
        salesQty: 0,
        returnsQty: 0,
        logistics: 0,
        storage: 0,
        acceptance: 0,
        penalties: 0,
        surcharges: 0,
        deductions: 0,
        adDeductions: 0,
        otherDeductions: 0,
        nmIds: new Set(),
        salesByNm: new Map(),
        returnsByNm: new Map(),
      });
    }
    const s = map.get(key)!;
    if (opDate < s.firstDate) s.firstDate = opDate;
    s.nmIds.add(r.nmId);

    const isSale = r.docTypeName === "Продажа" && (r.retailAmount > 0 || r.nmId > 0);
    const isReturn = r.docTypeName === "Возврат" && r.nmId > 0;

    if (isSale) {
      s.salesSeller += r.retailPrice ?? r.retailAmount;
      s.forPaySales += r.ppvzForPay;
      s.salesWbDisc += r.retailAmount;
      s.salesQty += 1;
      s.salesByNm.set(r.nmId, (s.salesByNm.get(r.nmId) ?? 0) + 1);
    } else if (isReturn) {
      s.returnsSeller += Math.abs(r.retailPrice ?? r.retailAmount);
      s.forPayReturns += Math.abs(r.ppvzForPay);
      s.returnsWbDisc += Math.abs(r.retailAmount);
      s.returnsQty += 1;
      s.returnsByNm.set(r.nmId, (s.returnsByNm.get(r.nmId) ?? 0) + 1);
    }
    s.logistics += r.deliveryRub ?? 0;
    s.storage += r.storageAmount;
    s.acceptance += r.acceptance ?? 0;
    s.penalties += r.penalty;
    s.surcharges += r.additionalPayment;
    const ded = r.deductionAmount || 0;
    if (ded > 0 && r.nmId === 0 && ded >= 10000) {
      s.adDeductions = (s.adDeductions ?? 0) + ded;
    } else {
      s.otherDeductions = (s.otherDeductions ?? 0) + ded;
    }
  }

  const periodCount = map.size;
  const adsPerPeriod = periodCount > 0 ? campaignsSpent / periodCount : 0;

  const result: MpfactDetailRow[] = [];

  for (const s of map.values()) {
    const revenueSeller = s.salesSeller - s.returnsSeller;
    const forPayTotal = s.forPaySales - s.forPayReturns;
    const revenueWbDisc = s.salesWbDisc - s.returnsWbDisc;
    const buyoutsQty = s.salesQty - s.returnsQty;
    const returnsPct = buyoutsQty > 0 ? (s.returnsQty / buyoutsQty) * 100 : 0;

    let costTotal = 0;
    for (const nmId of s.nmIds) {
      const unitCost = costMap.get(nmId) ?? 0;
      const sold = s.salesByNm.get(nmId) ?? 0;
      const returned = s.returnsByNm.get(nmId) ?? 0;
      costTotal += unitCost * (sold - returned);
    }

    const commission = revenueSeller - forPayTotal;
    const grossProfit = revenueSeller - costTotal;
    const adDed = s.adDeductions;
    const othDed = s.otherDeductions;
    const adsForPeriod = Math.max(adsPerPeriod, adDed);
    const mpExpenses = commission + Math.abs(s.logistics) + Math.abs(s.storage) + Math.abs(s.acceptance) + Math.abs(s.penalties) + adsForPeriod + Math.abs(othDed) - s.surcharges;
    const profitBeforeTax = grossProfit - mpExpenses;
    const tax = revenueWbDisc * 0.06;
    const profit = profitBeforeTax - tax;
    const roi = costTotal > 0 ? (profit / costTotal) * 100 : 0;

    const pct = (val: number, base: number) => base !== 0 ? (val / Math.abs(base)) * 100 : 0;

    const d = new Date(s.firstDate);
    result.push({
      date: s.firstDate,
      year: d.getFullYear(),
      month: s.firstDate.slice(0, 7),
      profit,
      profitPct: pct(profit, revenueSeller),
      roi,
      salesSeller: s.salesSeller,
      returnsSeller: s.returnsSeller,
      revenueSeller,
      salesWbDisc: s.salesWbDisc,
      returnsWbDisc: -s.returnsWbDisc,
      revenueWbDisc,
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
      commission: -commission,
      commissionPct: pct(-commission, revenueSeller),
      logistics: -Math.abs(s.logistics),
      logisticsPct: pct(-Math.abs(s.logistics), revenueSeller),
      surcharges: s.surcharges,
      surchargesPct: pct(s.surcharges, revenueSeller),
      penalties: -Math.abs(s.penalties),
      penaltiesPct: pct(-Math.abs(s.penalties), revenueSeller),
      storage: -Math.abs(s.storage),
      storagePct: pct(-Math.abs(s.storage), revenueSeller),
      paidAcceptance: -Math.abs(s.acceptance),
      paidAcceptancePct: pct(-Math.abs(s.acceptance), revenueSeller),
      advertising: -adsForPeriod,
      advertisingPct: pct(-adsForPeriod, revenueSeller),
      otherDeductions: -Math.abs(othDed),
      otherDeductionsPct: pct(-Math.abs(othDed), revenueSeller),
      otherCharges: null,
      otherChargesPct: null,
      mpExpenses: -mpExpenses,
      profitBeforeTax,
      profitBeforeTaxPct: pct(profitBeforeTax, revenueSeller),
      tax: -tax,
      taxPct: pct(-tax, revenueSeller),
    });
  }

  return result.sort((a, b) => b.date.localeCompare(a.date));
}
