import { describe, it, expect } from "vitest";
import { useCurrentOrg } from "./useCurrentOrg";

describe("useCurrentOrg", () => {
  it("is exported as a function", () => {
    expect(typeof useCurrentOrg).toBe("function");
  });
});
