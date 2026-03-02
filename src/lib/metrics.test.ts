import { describe, it, expect } from "vitest";
import { computeDashboardMetrics } from "./metrics";
import { chunk } from "../../convex/sync/helpers";

const makeSale = (overrides = {}) => ({
  nmId: 1,
  priceWithDisc: 1000,
  forPay: 800,
  quantity: 1,
  isReturn: false,
  date: "2026-02-16",
  ...overrides,
});

const makeFinancial = (overrides = {}) => ({
  deliveryAmount: 0,
  stornoDeliveryAmount: 0,
  storageAmount: 0,
  penalty: 0,
  additionalPayment: 0,
  deductionAmount: 0,
  ppvzForPay: 0,
  retailAmount: 0,
  returnAmount: 0,
  docTypeName: "Продажа",
  nmId: 1,
  supplierArticle: "ART-1",
  ...overrides,
});

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

describe("computeDashboardMetrics", () => {
  it("computes revenue as sum of priceWithDisc for non-returns", () => {
    const sales = [makeSale({ priceWithDisc: 1000 }), makeSale({ priceWithDisc: 2000 })];
    const result = computeDashboardMetrics({ sales, orders: [], financials: [], costs: [], campaigns: [] });
    expect(result.revenue).toBe(3000);
  });

  it("subtracts returns from revenue", () => {
    const sales = [makeSale({ priceWithDisc: 1000 }), makeSale({ priceWithDisc: 500, isReturn: true })];
    const result = computeDashboardMetrics({ sales, orders: [], financials: [], costs: [], campaigns: [] });
    expect(result.revenue).toBe(500);
  });

  it("computes commission from financial data using retailAmount - ppvzForPay - netLogistics - storage for sales rows", () => {
    const financials = [makeFinancial({
      retailAmount: 10000,
      ppvzForPay: 8000,
      deliveryAmount: 500,
      stornoDeliveryAmount: 0,
      storageAmount: 100,
      docTypeName: "Продажа",
    })];
    const result = computeDashboardMetrics({ sales: [], orders: [], financials, costs: [], campaigns: [] });
    // commission = 10000 - 8000 - (500 - 0) - 100 = 1400
    expect(result.commission).toBe(1400);
  });

  it("computes net logistics as deliveryAmount minus stornoDeliveryAmount", () => {
    const financials = [
      makeFinancial({ deliveryAmount: 500, stornoDeliveryAmount: 100 }),
      makeFinancial({ deliveryAmount: 300, stornoDeliveryAmount: 50 }),
    ];
    const result = computeDashboardMetrics({ sales: [], orders: [], financials, costs: [], campaigns: [] });
    // logistics = (500-100) + (300-50) = 650
    expect(result.logistics).toBe(650);
  });

  it("excludes non-sale rows from commission calculation", () => {
    const financials = [
      makeFinancial({ retailAmount: 10000, ppvzForPay: 8000, deliveryAmount: 500, storageAmount: 100, docTypeName: "Продажа" }),
      makeFinancial({ retailAmount: 5000, ppvzForPay: 4000, deliveryAmount: 200, storageAmount: 50, docTypeName: "Возврат" }),
    ];
    const result = computeDashboardMetrics({ sales: [], orders: [], financials, costs: [], campaigns: [] });
    // Commission only from "Продажа": 10000 - 8000 - 500 - 100 = 1400
    expect(result.commission).toBe(1400);
  });

  it("computes deductions from deductionAmount", () => {
    const financials = [
      makeFinancial({ deductionAmount: 200 }),
      makeFinancial({ deductionAmount: 300 }),
    ];
    const result = computeDashboardMetrics({ sales: [], orders: [], financials, costs: [], campaigns: [] });
    expect(result.deductions).toBe(500);
  });

  it("includes deductions and penalties in totalExpenses", () => {
    const financials = [
      makeFinancial({ penalty: 100, deductionAmount: 200 }),
    ];
    const result = computeDashboardMetrics({ sales: [], orders: [], financials, costs: [], campaigns: [] });
    // totalExpenses = commission(0) + logistics(0) + storage(0) + ads(0) + penalties(100) + deductions(200) - compensation(0)
    expect(result.totalExpenses).toBe(300);
  });

  it("computes full profit chain correctly", () => {
    const sales = [makeSale({ priceWithDisc: 10000, forPay: 8000 })];
    const costs = [{ nmId: 1, cost: 2000 }];
    const financials = [makeFinancial({
      deliveryAmount: 500,
      stornoDeliveryAmount: 50,
      storageAmount: 100,
      penalty: 30,
      deductionAmount: 20,
      additionalPayment: 10,
      ppvzForPay: 8000,
      retailAmount: 10000,
      docTypeName: "Продажа",
    })];
    const result = computeDashboardMetrics({ sales, orders: [], financials, costs, campaigns: [] });

    expect(result.revenue).toBe(10000);
    expect(result.grossProfit).toBe(8000); // 10000 - 2000
    expect(result.logistics).toBe(450);    // 500 - 50
    // commission = 10000 - 8000 - 450 - 100 = 1450
    expect(result.commission).toBe(1450);
    expect(result.penalties).toBe(30);
    expect(result.deductions).toBe(20);
    expect(result.compensation).toBe(10);
    // totalExpenses = 1450 + 450 + 100 + 0 + 30 + 20 - 10 = 2040
    expect(result.totalExpenses).toBe(2040);
    // marginalProfit = 8000 - 2040 = 5960
    expect(result.marginalProfit).toBe(5960);
    // tax = 10000 * 0.06 = 600
    expect(result.tax).toBe(600);
    // profit = 5960 - 600 = 5360
    expect(result.profit).toBe(5360);
  });
});
