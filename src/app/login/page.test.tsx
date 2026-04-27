import { describe, it, expect } from "vitest";
import LoginPage from "./page";

describe("LoginPage", () => {
  it("is a valid React component", () => {
    expect(typeof LoginPage).toBe("function");
  });
});
