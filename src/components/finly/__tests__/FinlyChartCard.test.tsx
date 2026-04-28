import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinlyChartCard } from "@/components/finly/FinlyChartCard";

describe("FinlyChartCard", () => {
  it("renders title, subtitle, action, and chart content", () => {
    render(
      <FinlyChartCard
        title="Выручка и прибыль"
        subtitle="Последние 30 дней"
        action={<button>Экспорт</button>}
      >
        <div data-testid="chart">chart body</div>
      </FinlyChartCard>
    );

    const heading = screen.getByRole("heading", {
      level: 3,
      name: "Выручка и прибыль",
    });
    expect(heading.className).toContain("font-display");
    expect(screen.getByText("Последние 30 дней")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Экспорт" })).toBeInTheDocument();
    expect(screen.getByTestId("chart")).toHaveTextContent("chart body");
  });
});
