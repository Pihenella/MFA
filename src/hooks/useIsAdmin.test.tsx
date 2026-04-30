import { describe, it, expect } from "vitest";
import { useIsAdmin } from "./useIsAdmin";

describe("useIsAdmin", () => {
  it("is exported as a function", () => {
    expect(typeof useIsAdmin).toBe("function");
  });
});
