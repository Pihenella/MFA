import { describe, it, expect } from "vitest";
import SettingsPage from "./page";
describe("SettingsPage", () => {
  it("renders", () => {
    expect(typeof SettingsPage).toBe("function");
  });
});
