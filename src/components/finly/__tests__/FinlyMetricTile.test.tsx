import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinlyMetricTile } from "@/components/finly/FinlyMetricTile";

describe("FinlyMetricTile", () => {
  it("renders label, value, delta and comparison", () => {
    render(
      <FinlyMetricTile
        label="Прибыль"
        value={847320}
        formatted="847 320 ₽"
        deltaPct={12.4}
        comparison="vs. март"
      />
    );

    expect(screen.getByText("Прибыль")).toBeInTheDocument();
    expect(screen.getByText("847 320 ₽")).toBeInTheDocument();
    expect(screen.getByText(/12\.4/)).toBeInTheDocument();
    expect(screen.getByText("vs. март")).toBeInTheDocument();
  });

  it("formats value with intl when no formatted prop", () => {
    render(<FinlyMetricTile label="X" value={1000} />);
    expect(screen.getByText(/1\s?000/)).toBeInTheDocument();
  });

  it("shows marker and treasure shadow on achievement", () => {
    render(
      <FinlyMetricTile
        label="X"
        value={1}
        achievement={{ kind: "monthlyPlanHit", sinceDate: "2026-04-01" }}
      />
    );

    const tile = screen.getByText("X").closest(".finly-metric-tile")!;
    expect(tile.className).toContain("shadow-treasure");
    expect(screen.getByLabelText(/достижение/i)).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    render(<FinlyMetricTile label="X" value={0} loading />);
    expect(screen.getByLabelText(/загрузка/i)).toBeInTheDocument();
  });
});
