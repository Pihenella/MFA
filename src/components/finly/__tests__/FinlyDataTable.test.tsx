import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinlyDataTable } from "@/components/finly/FinlyDataTable";

type Row = {
  id: string;
  sku: string;
  revenue: number;
};

const rows: Row[] = [
  { id: "1", sku: "WB-100", revenue: 1200 },
  { id: "2", sku: "WB-200", revenue: 2400 },
];

describe("FinlyDataTable", () => {
  it("renders headers, default cells, and custom rendered cells", () => {
    render(
      <FinlyDataTable
        columns={[
          { key: "sku", header: "SKU" },
          {
            key: "revenue",
            header: "Выручка",
            align: "right",
            render: (row) => `${row.revenue.toLocaleString("ru-RU")} ₽`,
          },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
      />
    );

    expect(screen.getByRole("columnheader", { name: "SKU" })).toBeInTheDocument();
    const revenueHeader = screen.getByRole("columnheader", { name: "Выручка" });
    expect(revenueHeader.className).toContain("text-right");
    expect(screen.getByText("WB-100")).toBeInTheDocument();
    expect(screen.getByText("1 200 ₽")).toBeInTheDocument();
  });

  it("renders empty state when rows are empty", () => {
    render(
      <FinlyDataTable
        columns={[{ key: "sku", header: "SKU" }]}
        rows={[]}
        rowKey={(row: Row) => row.id}
        empty={<span>Данных пока нет</span>}
      />
    );

    expect(screen.getByText("Данных пока нет")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("uses dense spacing when requested", () => {
    render(
      <FinlyDataTable
        dense
        columns={[{ key: "sku", header: "SKU" }]}
        rows={rows}
        rowKey={(row) => row.id}
      />
    );

    expect(screen.getByRole("columnheader", { name: "SKU" }).className).toContain(
      "px-3"
    );
  });
});
