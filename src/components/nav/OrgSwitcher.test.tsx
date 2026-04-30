import { describe, it, expect } from "vitest";
import { OrgSwitcher } from "./OrgSwitcher";

describe("OrgSwitcher", () => {
  it("is exported as a component", () => {
    expect(typeof OrgSwitcher).toBe("function");
  });
});
