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

  it("applies tax rates per shop when financials are aggregated", () => {
    const financials = [
      makeFinancial({ shopId: "shop-a", retailAmount: 10000, docTypeName: "Продажа" }),
      makeFinancial({ shopId: "shop-b", retailAmount: 20000, docTypeName: "Продажа" }),
      makeFinancial({ shopId: "shop-b", retailAmount: -5000, docTypeName: "Возврат" }),
    ];
    const result = computeDashboardMetrics(
      { ...emptyInput, financials },
      { taxRatesByShopId: { "shop-a": 6, "shop-b": 15 } },
    );
    expect(result.tax).toBe(2850); // 10000*6% + (20000-5000)*15%
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

  it("classifies WB Продвижение deductions as ads and Баллы за отзывы as other (bonus_type_name)", () => {
    // Данные взяты из прод WB API для AID Official, неделя 30.03-05.04:
    // МП Факт: ads=67827, otherDed=46701.6
    const financials = [
      makeFinancial({ nmId: 0, deductionAmount: 27075, bonusTypeName: "Оказание услуг «WB Продвижение», документ №291729185", docTypeName: "" }),
      makeFinancial({ nmId: 0, deductionAmount: 17714.4, bonusTypeName: 'Аванс за услугу "Баллы за отзывы"', docTypeName: "" }),
      makeFinancial({ nmId: 0, deductionAmount: 12883.2, bonusTypeName: 'Аванс за услугу "Баллы за отзывы"', docTypeName: "" }),
      makeFinancial({ nmId: 0, deductionAmount: 16104, bonusTypeName: 'Аванс за услугу "Баллы за отзывы"', docTypeName: "" }),
      makeFinancial({ nmId: 0, deductionAmount: 40752, bonusTypeName: "Оказание услуг «WB Продвижение», документ №291838613", docTypeName: "" }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    expect(result.ads).toBe(67827);
    expect(result.deductions).toBeCloseTo(46701.6, 2);
  });

  it("treats deduction without bonus_type_name as 'other' (safe default)", () => {
    const financials = [
      makeFinancial({ nmId: 0, deductionAmount: 50000, bonusTypeName: undefined, docTypeName: "" }),
      makeFinancial({ nmId: 123, deductionAmount: 100, bonusTypeName: undefined, docTypeName: "" }),
    ];
    const result = computeDashboardMetrics({ ...emptyInput, financials });
    expect(result.ads).toBe(0);
    expect(result.deductions).toBe(50100);
  });

  // Регрессионные golden-тесты: проверяем что формулы совпадают с МП Факт до рубля.
  // Данные из xlsx "Детализация по неделям 1-16 Апреля AID Official/Tools" (2026-04).
  describe("golden МП Факт regressions — week totals from April 2026", () => {
    it("AID Official, week 06.04-12.04: revenueSeller, forPay, commission, logistics match МП Факт", () => {
      // Агрегаты недели (без per-row detalization; здесь важны именно формулы)
      const financials = [
        // 60 продаж суммарно на 680458.42 (retailPrice) и 470429.98 (retailAmount), forPay 440080.99
        makeFinancial({ retailPrice: 680458.42, retailAmount: 470429.98, ppvzForPay: 440080.99, nmId: 1, docTypeName: "Продажа" }),
        // 2 возврата на 31217 (retailPrice) и 21872 (retailAmount), forPay 20053.38
        makeFinancial({ retailPrice: -31217, retailAmount: -21872, ppvzForPay: -20053.38, nmId: 1, docTypeName: "Возврат" }),
        // Агрегированные расходы
        makeFinancial({ deliveryRub: 24029.77, nmId: 0, docTypeName: "" }),
        makeFinancial({ storageAmount: 4407, nmId: 0, docTypeName: "" }),
        // Реклама (WB Продвижение)
        makeFinancial({ nmId: 0, deductionAmount: 56883, bonusTypeName: "Оказание услуг «WB Продвижение»", docTypeName: "" }),
      ];
      const result = computeDashboardMetrics({ ...emptyInput, financials });
      expect(result.revenueSeller).toBeCloseTo(649241.42, 2); // МП Факт
      expect(result.forPayTotal).toBeCloseTo(420027.61, 2);
      expect(result.commission).toBeCloseTo(229213.81, 2); // revenueSeller - forPayTotal
      expect(result.logistics).toBeCloseTo(24029.77, 2);
      expect(result.storage).toBeCloseTo(4407, 2);
      expect(result.ads).toBe(56883);
      expect(result.deductions).toBe(0);
      // Налог = revenueWbDisc * 6% = (470429.98 - 21872) * 0.06 = 448557.98 * 0.06
      expect(result.tax).toBeCloseTo(26913.48, 2);
    });

    it("AID Tools, week 30.03-05.04: ads/other split matches МП Факт (52938 + 20691)", () => {
      const financials = [
        makeFinancial({ retailPrice: 468862.06, retailAmount: 327217.6, ppvzForPay: 306181.04, nmId: 1, docTypeName: "Продажа" }),
        makeFinancial({ retailPrice: -11700, retailAmount: -7973, ppvzForPay: -7607.83, nmId: 1, docTypeName: "Возврат" }),
        makeFinancial({ deliveryRub: 49121.11, nmId: 0, docTypeName: "" }),
        makeFinancial({ storageAmount: 2793.32, nmId: 0, docTypeName: "" }),
        // 2 рекламных удержания
        makeFinancial({ nmId: 0, deductionAmount: 27561, bonusTypeName: "Оказание услуг «WB Продвижение»", docTypeName: "" }),
        makeFinancial({ nmId: 0, deductionAmount: 25377, bonusTypeName: "Оказание услуг «WB Продвижение»", docTypeName: "" }),
        // 1 прочее удержание (Баллы за отзывы)
        makeFinancial({ nmId: 0, deductionAmount: 20691, bonusTypeName: 'Аванс за услугу "Баллы за отзывы"', docTypeName: "" }),
      ];
      const result = computeDashboardMetrics({ ...emptyInput, financials });
      expect(result.revenueSeller).toBeCloseTo(457162.06, 2);
      expect(result.forPayTotal).toBeCloseTo(298573.21, 2);
      expect(result.ads).toBe(52938);
      expect(result.deductions).toBe(20691);
      expect(result.tax).toBeCloseTo(19154.676, 2); // (327217.6 - 7973) * 0.06
    });

    it("AID Official, week 30.03-05.04: полный P&L совпадает с МП Факт до рубля", () => {
      const financials = [
        makeFinancial({ retailPrice: 367671, retailAmount: 255066, ppvzForPay: 238501.58, nmId: 1, docTypeName: "Продажа" }),
        // deliveryRub aggregated
        makeFinancial({ deliveryRub: 13289.95, nmId: 0, docTypeName: "" }),
        makeFinancial({ storageAmount: 3433.46, nmId: 0, docTypeName: "" }),
        // Реклама (WB Продвижение): 27075 + 40752 = 67827
        makeFinancial({ nmId: 0, deductionAmount: 27075, bonusTypeName: "Оказание услуг «WB Продвижение»", docTypeName: "" }),
        makeFinancial({ nmId: 0, deductionAmount: 40752, bonusTypeName: "Оказание услуг «WB Продвижение»", docTypeName: "" }),
        // Прочее (Баллы за отзывы): 17714.4 + 12883.2 + 16104 = 46701.6
        makeFinancial({ nmId: 0, deductionAmount: 17714.4, bonusTypeName: 'Аванс за услугу "Баллы за отзывы"', docTypeName: "" }),
        makeFinancial({ nmId: 0, deductionAmount: 12883.2, bonusTypeName: 'Аванс за услугу "Баллы за отзывы"', docTypeName: "" }),
        makeFinancial({ nmId: 0, deductionAmount: 16104, bonusTypeName: 'Аванс за услугу "Баллы за отзывы"', docTypeName: "" }),
      ];
      const result = computeDashboardMetrics({ ...emptyInput, financials });
      expect(result.revenueSeller).toBeCloseTo(367671, 2);
      expect(result.commission).toBeCloseTo(129169.42, 2); // 367671 - 238501.58
      expect(result.logistics).toBeCloseTo(13289.95, 2);
      expect(result.storage).toBeCloseTo(3433.46, 2);
      expect(result.ads).toBe(67827);
      expect(result.deductions).toBeCloseTo(46701.6, 2);
      expect(result.tax).toBeCloseTo(15303.96, 2); // 255066 * 0.06
      // profitBeforeTax = grossProfit(=revenueSeller, т.к. cogs=0) - mpExpenses
      // mpExpenses = 129169.42 + 13289.95 + 3433.46 + 67827 + 46701.6 - 0 = 260421.43
      // profitBeforeTax = 367671 - 260421.43 = 107249.57
      // profit = 107249.57 - 15303.96 = 91945.61 — сверяем не profit (зависит от COGS = -121438 которого тут нет),
      // а что сами slagaemie mpExpenses правильные:
      expect(result.mpExpenses).toBeCloseTo(260421.43, 2);
    });
  });
});
