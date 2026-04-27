import { describe, it, expect } from "vitest";
import RejectedPage from "./page";
describe("RejectedPage", () => {
  it("renders", () => {
    expect(typeof RejectedPage).toBe("function");
  });
});
