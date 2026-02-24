type FinancialRow = {
  realizationreportId: number;
  dateFrom: string;
  dateTo: string;
  supplierArticle: string;
  nmId: number;
  retailAmount: number;
  returnAmount: number;
  deliveryAmount: number;
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
        logistics: 0, storage: 0, penalty: 0, compensation: 0,
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
    s.logistics += r.deliveryAmount;
    s.storage += r.storageAmount;
    s.penalty += r.penalty;
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

  const map = new Map<string, any>();
  for (const r of rows) {
    const key = getWeekKey(r.dateFrom);
    if (!map.has(key)) {
      map.set(key, { week: key, salesRevenue: 0, returnsRevenue: 0, revenue: 0, forPay: 0, logistics: 0, salesCount: 0, returnsCount: 0 });
    }
    const s = map.get(key)!;
    if (r.docTypeName === "Продажа") { s.salesRevenue += r.retailAmount; s.salesCount += 1; }
    if (r.docTypeName === "Возврат") { s.returnsRevenue += r.retailAmount; s.returnsCount += 1; }
    s.forPay += r.ppvzForPay;
    s.logistics += r.deliveryAmount;
  }
  return Array.from(map.values())
    .map((s) => ({ ...s, revenue: s.salesRevenue - s.returnsRevenue }))
    .sort((a, b) => b.week.localeCompare(a.week));
}
