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

describe("computeDashboardMetrics", () => {
  it("computes netRetail as sum of priceWithDisc for non-returns", () => {
    const sales = [makeSale({ priceWithDisc: 1000, forPay: 800 }), makeSale({ priceWithDisc: 2000, forPay: 1600 })];
    const result = computeDashboardMetrics({ ...emptyInput, sales });
    expect(result.netRetail).toBe(3000);
    expect(result.revenueForPay).toBe(2400);
  });

  it("subtracts returns from revenue", () => {
    const sales = [makeSale({ priceWithDisc: 1000, forPay: 800 }), makeSale({ priceWithDisc: 500, forPay: 400, isReturn: true })];
    const result = computeDashboardMetrics({ ...emptyInput, sales });
    expect(result.netRetail).toBe(500);
    expect(result.revenueForPay).toBe(400);
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
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    // commission = 10000 - 8000 - (500 - 0) - 100 = 1400
    expect(result.commission).toBe(1400);
  });

  it("computes net logistics as deliveryAmount minus stornoDeliveryAmount", () => {
    const financials = [
      makeFinancial({ deliveryAmount: 500, stornoDeliveryAmount: 100 }),
      makeFinancial({ deliveryAmount: 300, stornoDeliveryAmount: 50 }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    // logistics = (500-100) + (300-50) = 650
    expect(result.logistics).toBe(650);
  });

  it("excludes non-sale rows from commission calculation", () => {
    const financials = [
      makeFinancial({ retailAmount: 10000, ppvzForPay: 8000, deliveryAmount: 500, storageAmount: 100, docTypeName: "Продажа" }),
      makeFinancial({ retailAmount: 5000, ppvzForPay: 4000, deliveryAmount: 200, storageAmount: 50, docTypeName: "Возврат" }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    // Commission only from "Продажа": 10000 - 8000 - 500 - 100 = 1400
    expect(result.commission).toBe(1400);
  });

  it("computes deductions from deductionAmount", () => {
    const financials = [
      makeFinancial({ deductionAmount: 200 }),
      makeFinancial({ deductionAmount: 300 }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    expect(result.deductions).toBe(500);
  });

  it("includes deductions and penalties in totalExpenses", () => {
    const financials = [
      makeFinancial({ penalty: 100, deductionAmount: 200 }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    // totalExpenses = commission(0) + logistics(0) + storage(0) + ads(0) + penalties(100) + deductions(200) - compensation(0)
    expect(result.totalExpenses).toBe(300);
  });

  it("computes full profit chain correctly with forPay-based revenue", () => {
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
    const result = computeDashboardMetrics({ ...emptyInput, sales, costs, financials });

    // Revenue is now forPay-based
    expect(result.netRetail).toBe(10000);       // priceWithDisc (retail)
    expect(result.revenueForPay).toBe(8000);     // forPay (actual revenue)
    expect(result.cogs).toBe(2000);
    expect(result.grossProfit).toBe(6000);       // 8000 - 2000
    expect(result.logistics).toBe(450);          // 500 - 50
    // commission = 10000 - 8000 - 450 - 100 = 1450
    expect(result.commission).toBe(1450);
    expect(result.penalties).toBe(30);
    expect(result.deductions).toBe(20);
    expect(result.compensation).toBe(10);
    // totalExpenses = 1450 + 450 + 100 + 0 + 30 + 20 - 10 = 2040
    expect(result.totalExpenses).toBe(2040);
    // marginalProfit = 6000 - 2040 = 3960
    expect(result.marginalProfit).toBe(3960);
    // tax = 8000 (forPay) * 0.06 = 480
    expect(result.tax).toBe(480);
    // profit = 3960 - 480 = 3480
    expect(result.profit).toBe(3480);
  });

  it("subtracts returns COGS from total COGS", () => {
    const sales = [
      makeSale({ nmId: 1, priceWithDisc: 5000, forPay: 4000, quantity: 2 }),
      makeSale({ nmId: 1, priceWithDisc: 2500, forPay: 2000, quantity: 1, isReturn: true }),
    ];
    const costs = [{ nmId: 1, cost: 500 }];
    const result = computeDashboardMetrics({ ...emptyInput, sales, costs });
    // cogsSales = 500 * 2 = 1000, cogsReturns = 500 * 1 = 500
    // net COGS = 1000 - 500 = 500
    expect(result.cogs).toBe(500);
    expect(result.buyoutsCount).toBe(1); // 2 sales - 1 return
    // returnRate = returns / buyouts = 1/1 = 100%
    expect(result.returnRate).toBe(100);
  });

  it("computes cancelRate as cancelled / active orders (MPFact style)", () => {
    const orders = [
      { nmId: 1, totalPrice: 1000, quantity: 1, isCancel: false, date: "2026-03-02" },
      { nmId: 1, totalPrice: 1000, quantity: 1, isCancel: false, date: "2026-03-03" },
      { nmId: 1, totalPrice: 1000, quantity: 1, isCancel: true, date: "2026-03-04" },
    ];
    const result = computeDashboardMetrics({ ...emptyInput, orders });
    // cancelRate = 1 cancelled / 2 active = 50%
    expect(result.cancelRate).toBe(50);
  });

  it("computes returnRate as returns / buyouts (MPFact style)", () => {
    const sales = [
      makeSale({ quantity: 1 }),
      makeSale({ quantity: 1 }),
      makeSale({ quantity: 1, isReturn: true }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, sales });
    // buyouts = 2 - 1 = 1, returnRate = 1/1 = 100%
    expect(result.returnRate).toBe(100);
    expect(result.buyoutsCount).toBe(1);
  });

  it("computes NM report metrics", () => {
    const nmReports = [
      { openCardCount: 100, addToCartCount: 10, ordersCount: 5, buyoutsCount: 4 },
      { openCardCount: 200, addToCartCount: 20, ordersCount: 8, buyoutsCount: 6 },
    ];
    const result = computeDashboardMetrics({ ...emptyInput, nmReports });
    expect(result.openCardCount).toBe(300);
    expect(result.addToCartCount).toBe(30);
    expect(result.crToCart).toBeCloseTo(10); // 30/300 * 100
    expect(result.crToOrder).toBeCloseTo(43.33, 1); // 13/30 * 100
  });

  it("computes percentages relative to netRetail", () => {
    const sales = [makeSale({ priceWithDisc: 10000, forPay: 7000 })];
    const costs = [{ nmId: 1, cost: 1000 }];
    const result = computeDashboardMetrics({ ...emptyInput, sales, costs });
    // netRetail = 10000, COGS = 1000
    expect(result.cogsPercent).toBe(10);  // 1000 / 10000 * 100
    // grossProfit = 7000 - 1000 = 6000
    expect(result.grossProfitPercent).toBe(60); // 6000 / 10000 * 100
    // wbDiscount = 10000 - 7000 = 3000
    expect(result.wbDiscount).toBe(3000);
    expect(result.wbDiscountPercent).toBe(30); // 3000 / 10000 * 100
  });
});
