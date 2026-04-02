import { describe, it, expect } from "vitest";
import { computeDashboardMetrics } from "./metrics";
import { chunk } from "../../convex/sync/helpers";

const makeFinancial = (overrides = {}) => ({
  deliveryAmount: 0,
  deliveryRub: undefined as number | undefined,
  stornoDeliveryAmount: 0,
  storageAmount: 0,
  penalty: 0,
  additionalPayment: 0,
  deductionAmount: 0,
  ppvzForPay: 0,
  ppvzSalesTotal: undefined as number | undefined,
  acceptance: undefined as number | undefined,
  retailAmount: 0,
  retailPrice: undefined as number | undefined,
  returnAmount: 0,
  docTypeName: "Продажа",
  nmId: 1,
  supplierArticle: "ART-1",
  ...overrides,
});

const emptyInput = { sales: [] as any[], orders: [] as any[], financials: [] as any[], costs: [] as any[], campaigns: [] as any[], nmReports: [] as any[] };

describe("chunk", () => {
  it("splits array into chunks of given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns single chunk when array is smaller than size", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });

  it("returns empty array for empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("handles exact multiples", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });
});

describe("computeDashboardMetrics — financials-based (МП Факт формулы)", () => {
  it("computes revenueSeller from financials retailAmount", () => {
    const financials = [
      makeFinancial({ retailAmount: 10000, ppvzForPay: 8000, docTypeName: "Продажа" }),
      makeFinancial({ retailAmount: 5000, ppvzForPay: 4000, docTypeName: "Продажа" }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    expect(result.salesSeller).toBe(15000);
    expect(result.revenueSeller).toBe(15000);
    expect(result.forPayTotal).toBe(12000);
    expect(result.salesCount).toBe(2);
  });

  it("subtracts returns from revenue (from financials)", () => {
    const financials = [
      makeFinancial({ retailAmount: 10000, ppvzForPay: 8000, docTypeName: "Продажа" }),
      makeFinancial({ retailAmount: -3000, ppvzForPay: -2400, docTypeName: "Возврат" }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    expect(result.salesSeller).toBe(10000);
    expect(result.returnsSeller).toBe(3000);
    expect(result.revenueSeller).toBe(7000);
    expect(result.forPaySales).toBe(8000);
    expect(result.forPayReturns).toBe(2400);
    expect(result.forPayTotal).toBe(5600);
  });

  it("computes commission as revenueSeller - forPayTotal (МП Факт formula)", () => {
    const financials = [
      makeFinancial({ retailAmount: 10000, ppvzForPay: 8000, deliveryAmount: 500, storageAmount: 100, docTypeName: "Продажа" }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    // commission = revenueSeller - forPayTotal = 10000 - 8000 = 2000
    // (NOT subtracting logistics/storage from commission!)
    expect(result.commission).toBe(2000);
  });

  it("computes grossProfit as revenueSeller - cogs (МП Факт formula)", () => {
    const financials = [
      makeFinancial({ retailAmount: 10000, ppvzForPay: 8000, docTypeName: "Продажа" }),
    ];
    const costs = [{ nmId: 1, cost: 2000 }];
    const result = computeDashboardMetrics({ ...emptyInput, financials, costs });
    // grossProfit = revenueSeller(10000) - cogs(2000) = 8000
    expect(result.grossProfit).toBe(8000);
  });

  it("computes net logistics from deliveryRub", () => {
    const financials = [
      makeFinancial({ deliveryRub: 500 }),
      makeFinancial({ deliveryRub: 150 }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    expect(result.logistics).toBe(650);
  });

  it("computes deductions from deductionAmount", () => {
    const financials = [
      makeFinancial({ deductionAmount: 200 }),
      makeFinancial({ deductionAmount: 300 }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    expect(result.deductions).toBe(500);
  });

  it("computes full profit chain correctly (МП Факт style)", () => {
    const financials = [makeFinancial({
      retailAmount: 9000,
      retailPrice: 10000,
      ppvzForPay: 7000,
      deliveryRub: 450,
      storageAmount: 100,
      acceptance: 10,
      penalty: 30,
      deductionAmount: 20,
      additionalPayment: 5,
      docTypeName: "Продажа",
    })];
    const costs = [{ nmId: 1, cost: 2000 }];
    const result = computeDashboardMetrics({ ...emptyInput, financials, costs });

    expect(result.revenueSeller).toBe(10000);
    expect(result.forPayTotal).toBe(7000);
    expect(result.revenueWbDisc).toBe(9000);
    expect(result.cogs).toBe(2000);

    // grossProfit = revenueSeller - cogs = 10000 - 2000 = 8000
    expect(result.grossProfit).toBe(8000);

    // commission = revenueSeller - forPayTotal = 10000 - 7000 = 3000
    expect(result.commission).toBe(3000);

    // logistics = 450
    expect(result.logistics).toBe(450);

    // mpExpenses = commission(3000) + logistics(450) + storage(100) + acceptance(10) + penalties(30) + deductions(20) - compensation(5) = 3605
    expect(result.mpExpenses).toBe(3605);

    // profitBeforeTax = grossProfit(8000) - mpExpenses(3605) - ads(0) = 4395
    expect(result.profitBeforeTax).toBe(4395);

    // tax = revenueWbDisc(9000) * 0.06 = 540
    expect(result.tax).toBe(540);

    // profit = 4395 - 540 = 3855
    expect(result.profit).toBe(3855);

    // roi = profit / cogs = 3855 / 2000 = 192.75%
    expect(result.roi).toBeCloseTo(192.75);
  });

  it("uses retailAmount as fallback when ppvzSalesTotal is missing", () => {
    const financials = [makeFinancial({
      retailAmount: 10000,
      ppvzForPay: 7000,
      ppvzSalesTotal: undefined,
      docTypeName: "Продажа",
    })];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    // Falls back to retailAmount for WB discount price
    expect(result.revenueWbDisc).toBe(10000);
    expect(result.tax).toBe(600); // 10000 * 0.06
  });

  it("counts sales/returns from financials rows", () => {
    const financials = [
      makeFinancial({ retailAmount: 5000, docTypeName: "Продажа", nmId: 1 }),
      makeFinancial({ retailAmount: 3000, docTypeName: "Продажа", nmId: 1 }),
      makeFinancial({ retailAmount: -2000, docTypeName: "Возврат", nmId: 1 }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    expect(result.salesCount).toBe(2);
    expect(result.returnsCount).toBe(1);
    expect(result.buyoutsCount).toBe(1);
    // returnRate = returns / buyouts = 1/1 = 100%
    expect(result.returnRate).toBe(100);
  });

  it("computes COGS from financials nmId counts", () => {
    const financials = [
      makeFinancial({ retailAmount: 5000, docTypeName: "Продажа", nmId: 1 }),
      makeFinancial({ retailAmount: 5000, docTypeName: "Продажа", nmId: 1 }),
      makeFinancial({ retailAmount: -3000, docTypeName: "Возврат", nmId: 1 }),
    ];
    const costs = [{ nmId: 1, cost: 500 }];
    const result = computeDashboardMetrics({ ...emptyInput, financials, costs });
    // 2 sales - 1 return = 1 net unit, cogs = 500 * 1 = 500
    expect(result.cogs).toBe(500);
  });

  it("computes percentages relative to revenueSeller (МП Факт style)", () => {
    const financials = [makeFinancial({
      retailAmount: 10000,
      ppvzForPay: 7000,
      docTypeName: "Продажа",
    })];
    const costs = [{ nmId: 1, cost: 1000 }];
    const result = computeDashboardMetrics({ ...emptyInput, financials, costs });
    // revenueSeller = 10000
    expect(result.cogsPercent).toBe(10); // 1000 / 10000 * 100
    expect(result.commissionPercent).toBe(30); // 3000 / 10000 * 100
    expect(result.grossProfitPercent).toBe(90); // 9000 / 10000 * 100
  });

  it("computes cancelRate as cancelled / active orders", () => {
    const orders = [
      { nmId: 1, totalPrice: 1000, quantity: 1, isCancel: false, date: "2026-03-02" },
      { nmId: 1, totalPrice: 1000, quantity: 1, isCancel: false, date: "2026-03-03" },
      { nmId: 1, totalPrice: 1000, quantity: 1, isCancel: true, date: "2026-03-04" },
    ];
    const result = computeDashboardMetrics({ ...emptyInput, orders });
    expect(result.cancelRate).toBe(50);
  });

  it("computes NM report metrics", () => {
    const nmReports = [
      { openCardCount: 100, addToCartCount: 10, ordersCount: 5, buyoutsCount: 4 },
      { openCardCount: 200, addToCartCount: 20, ordersCount: 8, buyoutsCount: 6 },
    ];
    const result = computeDashboardMetrics({ ...emptyInput, nmReports });
    expect(result.openCardCount).toBe(300);
    expect(result.addToCartCount).toBe(30);
    expect(result.crToCart).toBeCloseTo(10);
    expect(result.crToOrder).toBeCloseTo(43.33, 1);
  });
});
