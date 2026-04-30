import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinlySection } from "@/components/finly/FinlySection";

describe("FinlySection", () => {
  it("renders title, action, and children", () => {
    render(
      <FinlySection title="Магазины" action={<button>Добавить</button>}>
        <p>Список магазинов</p>
      </FinlySection>
    );

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Магазины",
    });
    expect(heading.className).toContain("font-display");
    expect(screen.getByRole("button", { name: "Добавить" })).toBeInTheDocument();
    expect(screen.getByText("Список магазинов")).toBeInTheDocument();
  });
});
