import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinlyAuthLayout } from "@/components/finly/FinlyAuthLayout";

describe("FinlyAuthLayout", () => {
  it("renders mascot, title, subtitle, and children", () => {
    render(
      <FinlyAuthLayout
        mascotPose="empty-data"
        title="Вернуться к карте"
        subtitle="Введите пароль, чтобы продолжить разведку."
      >
        <form aria-label="login form">
          <button>Войти</button>
        </form>
      </FinlyAuthLayout>
    );

    expect(screen.getAllByRole("img", { name: /examining a scroll/i })).toHaveLength(2);
    expect(
      screen.getAllByRole("heading", { level: 1, name: "Вернуться к карте" })
    ).toHaveLength(2);
    expect(screen.getByText("Введите пароль, чтобы продолжить разведку.")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "login form" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
  });
});
