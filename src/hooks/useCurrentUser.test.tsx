import { describe, it, expect } from "vitest";
import { useCurrentUser } from "./useCurrentUser";

describe("useCurrentUser", () => {
  it("is exported as a function", () => {
    expect(typeof useCurrentUser).toBe("function");
  });
});
