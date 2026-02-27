import { describe, it, expect } from "vitest";
import { computeDashboardMetrics } from "./metrics";
import { chunk } from "../../convex/sync";

const makeSale = (overrides = {}) => ({
  nmId: 1,
  priceWithDisc: 1000,
  forPay: 800,
  quantity: 1,
  isReturn: false,
  date: "2026-02-16",
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

  it("computes profit = revenue - cost - logistics - commission - storage - ads", () => {
    const sales = [makeSale({ priceWithDisc: 10000, forPay: 8000 })];
    const costs = [{ nmId: 1, cost: 2000 }];
    const financials = [{ deliveryAmount: 500, storageAmount: 100, penalty: 0, additionalPayment: 0, ppvzForPay: 8000, retailAmount: 10000, returnAmount: 0, docTypeName: "Продажа" }];
    const result = computeDashboardMetrics({ sales, orders: [], financials, costs, campaigns: [] });
    // commission = revenue - forPay - logistics = 10000 - 8000 - 500 = 1500
    expect(result.commission).toBe(1500);
    // gross = revenue - cost = 10000 - 2000 = 8000
    expect(result.grossProfit).toBe(8000);
  });
});
