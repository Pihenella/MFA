import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinlyCard } from "@/components/finly/FinlyCard";

describe("FinlyCard", () => {
  it("renders children with default gold border", () => {
    render(
      <FinlyCard>
        <span>content</span>
      </FinlyCard>
    );
    const root = screen.getByText("content").parentElement!;
    expect(root.className).toContain("border-gold-frame");
  });

  it("interactive adds tilt and glow class hooks", () => {
    render(
      <FinlyCard interactive>
        <span>x</span>
      </FinlyCard>
    );
    const root = screen.getByText("x").parentElement!;
    expect(root.className).toContain("finly-card-interactive");
    expect(root.className).toContain("hover:shadow-tide");
  });

  it("glowing achievement state has gold glow class", () => {
    render(
      <FinlyCard glowing>
        <span>x</span>
      </FinlyCard>
    );
    const root = screen.getByText("x").parentElement!;
    expect(root.className).toContain("shadow-treasure");
  });
});
