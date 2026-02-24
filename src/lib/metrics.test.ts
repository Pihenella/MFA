import { describe, it, expect } from "vitest";
import { computeDashboardMetrics } from "./metrics";

const makeSale = (overrides = {}) => ({
  nmId: 1,
  priceWithDisc: 1000,
  forPay: 800,
  quantity: 1,
  isReturn: false,
  date: "2026-02-16",
  ...overrides,
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
