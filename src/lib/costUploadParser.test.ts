import { describe, it, expect } from "vitest";
import {
  parseSimpleCostFile,
  isRealizationReport,
  parseRealizationReport,
} from "./costUploadParser";

describe("parseSimpleCostFile", () => {
  it("parses English column names", () => {
    const rows = [
      { nmId: 12345, supplierArticle: "ART-1", cost: 150 },
      { nmId: 67890, supplierArticle: "ART-2", cost: 200 },
    ];
    const result = parseSimpleCostFile(rows);
    expect(result).toEqual([
      { nmId: 12345, supplierArticle: "ART-1", cost: 150 },
      { nmId: 67890, supplierArticle: "ART-2", cost: 200 },
    ]);
  });

  it("parses Russian column names", () => {
    const rows = [
      { "Артикул WB": 11111, "Артикул поставщика": "АРТ-1", "Себестоимость": 300 },
      { "Артикул WB": 22222, "Артикул поставщика": "АРТ-2", "Себестоимость": 450 },
    ];
    const result = parseSimpleCostFile(rows);
    expect(result).toEqual([
      { nmId: 11111, supplierArticle: "АРТ-1", cost: 300 },
      { nmId: 22222, supplierArticle: "АРТ-2", cost: 450 },
    ]);
  });

  it("parses alternative Russian column names", () => {
    const rows = [
      { "Номенклатура": 33333, "Артикул": "АРТ-3", "Закупочная цена": 100 },
    ];
    const result = parseSimpleCostFile(rows);
    expect(result).toEqual([
      { nmId: 33333, supplierArticle: "АРТ-3", cost: 100 },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(parseSimpleCostFile([])).toEqual([]);
  });

  it("skips rows without nmId", () => {
    const rows = [
      { nmId: 12345, cost: 100 },
      { nmId: "", cost: 200 },
      { nmId: null, cost: 300 },
    ];
    const result = parseSimpleCostFile(rows as any);
    expect(result).toHaveLength(1);
    expect(result[0].nmId).toBe(12345);
  });

  it("skips rows without cost", () => {
    const rows = [
      { nmId: 12345, cost: 100 },
      { nmId: 67890, cost: "" },
      { nmId: 11111, cost: undefined },
    ];
    const result = parseSimpleCostFile(rows as any);
    expect(result).toHaveLength(1);
    expect(result[0].nmId).toBe(12345);
  });

  it("skips rows with negative or zero nmId", () => {
    const rows = [
      { nmId: 0, cost: 100 },
      { nmId: -5, cost: 200 },
      { nmId: 12345, cost: 300 },
    ];
    const result = parseSimpleCostFile(rows as any);
    expect(result).toHaveLength(1);
    expect(result[0].nmId).toBe(12345);
  });

  it("handles missing article column gracefully", () => {
    const rows = [{ nmId: 12345, cost: 100 }];
    const result = parseSimpleCostFile(rows);
    expect(result).toEqual([{ nmId: 12345, supplierArticle: "", cost: 100 }]);
  });
});

describe("isRealizationReport", () => {
  it("detects realization report by marker columns", () => {
    const rows = [
      { realizationreport_id: 1, rr_dt: "2024-01-01", retail_amount: 500, nm_id: 123 },
    ];
    expect(isRealizationReport(rows)).toBe(true);
  });

  it("returns false for cost file", () => {
    const rows = [{ nmId: 123, cost: 100 }];
    expect(isRealizationReport(rows)).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(isRealizationReport([])).toBe(false);
  });
});

describe("parseRealizationReport", () => {
  it("extracts unique catalog from realization report", () => {
    const rows = [
      { nm_id: 111, sa_name: "ART-1", subject_name: "Футболка", retail_amount: 500 },
      { nm_id: 111, sa_name: "ART-1", subject_name: "Футболка", retail_amount: 300 },
      { nm_id: 222, sa_name: "ART-2", subject_name: "Штаны", retail_amount: 700 },
    ];
    const result = parseRealizationReport(rows);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ nmId: 111, supplierArticle: "ART-1", subject: "Футболка" });
    expect(result[1]).toEqual({ nmId: 222, supplierArticle: "ART-2", subject: "Штаны" });
  });

  it("returns empty for empty input", () => {
    expect(parseRealizationReport([])).toEqual([]);
  });

  it("skips invalid nmId values", () => {
    const rows = [
      { nm_id: 0, sa_name: "ART-1", subject_name: "Футболка" },
      { nm_id: 123, sa_name: "ART-2", subject_name: "Штаны" },
    ];
    const result = parseRealizationReport(rows);
    expect(result).toHaveLength(1);
    expect(result[0].nmId).toBe(123);
  });
});
