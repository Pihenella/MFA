import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";

describe("FinlyEmptyState", () => {
  it("renders mascot, title, body, and link CTA", () => {
    render(
      <FinlyEmptyState
        pose="empty-shops"
        title="Пока нет магазинов"
        body="Подключите первый магазин, чтобы начать разведку."
        cta={{ label: "Подключить", href: "/settings" }}
      />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Пока нет магазинов" })
    ).toBeInTheDocument();
    expect(screen.getByText("Подключите первый магазин, чтобы начать разведку.")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Подключить" });
    expect(link).toHaveAttribute("href", "/settings");
    expect(link.className).toContain("rounded-pill");
  });

  it("renders button CTA with click handler", () => {
    const onClick = vi.fn();
    render(
      <FinlyEmptyState
        pose="not-found"
        title="Маршрут потерян"
        cta={{ label: "Вернуться", onClick }}
      />
    );

    screen.getByRole("button", { name: "Вернуться" }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
