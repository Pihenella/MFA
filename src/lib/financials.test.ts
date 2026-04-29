import { describe, expect, it } from "vitest";
import { groupByPeriodFull, groupByReportFull } from "./financials";

const sale = {
  realizationreportId: 101,
  dateFrom: "2026-04-13",
  dateTo: "2026-04-19",
  rrDt: "2026-04-15",
  supplierArticle: "AID-1",
  nmId: 1001,
  retailAmount: 9000,
  retailPrice: 10000,
  returnAmount: 0,
  deliveryAmount: 1,
  deliveryRub: 300,
  stornoDeliveryAmount: 0,
  deductionAmount: 0,
  ppvzForPay: 8000,
  ppvzSalesTotal: 0,
  acceptance: 0,
  penalty: 0,
  additionalPayment: 0,
  storageAmount: 100,
  docTypeName: "Продажа",
  warehouseName: "Коледино",
  siteCountry: "RU",
};

const returnRow = {
  ...sale,
  rrDt: "2026-04-16",
  retailAmount: 1800,
  retailPrice: 2000,
  ppvzForPay: 1600,
  docTypeName: "Возврат",
};

const secondSale = {
  ...sale,
  rrDt: "2026-04-17",
};

describe("financial report grouping", () => {
  it("matches MPFact signs for returns and applies the selected tax rate", () => {
    const [row] = groupByReportFull(
      [sale, secondSale, returnRow],
      "AID Tools",
      new Map([[1001, 2500]]),
      0,
      15,
    );

    expect(row.salesSeller).toBe(20000);
    expect(row.returnsSeller).toBe(-2000);
    expect(row.revenueSeller).toBe(18000);
    expect(row.returnsWbDisc).toBe(-1800);
    expect(row.returnsQty).toBe(-1);
    expect(row.returnsPct).toBe(-100);
    expect(row.tax).toBe(-2430);
  });

  it("uses MPFact signs in period details too", () => {
    const rows = groupByPeriodFull(
      [sale, secondSale, returnRow],
      "week",
      new Map([[1001, 2500]]),
      0,
      6,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].returnsSeller).toBe(-2000);
    expect(rows[0].returnsWbDisc).toBe(-1800);
    expect(rows[0].returnsQty).toBe(-1);
    expect(rows[0].returnsPct).toBe(-100);
  });
});
