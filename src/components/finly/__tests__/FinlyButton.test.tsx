import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinlyButton } from "@/components/finly/FinlyButton";

describe("FinlyButton", () => {
  it("renders primary by default with orange-flame bg", () => {
    render(<FinlyButton>go</FinlyButton>);
    const button = screen.getByRole("button", { name: "go" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("rounded-pill");
  });

  it("secondary variant uses teal", () => {
    render(<FinlyButton variant="secondary">x</FinlyButton>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("border-secondary");
  });

  it("treasure variant has gold gradient class", () => {
    render(<FinlyButton variant="treasure">x</FinlyButton>);
    expect(screen.getByRole("button").className).toContain(
      "bg-gradient-to-r"
    );
  });

  it("asChild passes button styling to the child element", () => {
    render(
      <FinlyButton asChild>
        <a href="/settings">settings</a>
      </FinlyButton>
    );

    const link = screen.getByRole("link", { name: "settings" });
    expect(link).toHaveAttribute("href", "/settings");
    expect(link.className).toContain("rounded-pill");
  });
});
