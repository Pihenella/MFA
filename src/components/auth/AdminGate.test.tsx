import { describe, it, expect } from "vitest";
import { AdminGate } from "./AdminGate";

describe("AdminGate", () => {
  it("is exported as a component", () => {
    expect(typeof AdminGate).toBe("function");
  });
});
