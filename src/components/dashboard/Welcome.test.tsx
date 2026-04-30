import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Welcome } from "./Welcome";

describe("Welcome", () => {
  it("renders user name and CTA buttons", () => {
    const { getByText, getAllByText } = render(<Welcome userName="Юрий" />);
    expect(getByText(/Юрий/)).toBeTruthy();
    expect(getAllByText(/Wildberries/).length).toBeGreaterThan(0);
    expect(getAllByText(/Ozon/).length).toBeGreaterThan(0);
  });
});
