import { describe, it, expect } from "vitest";
import { OwnerGate } from "./OwnerGate";

describe("OwnerGate", () => {
  it("is exported as a component", () => {
    expect(typeof OwnerGate).toBe("function");
  });
});
