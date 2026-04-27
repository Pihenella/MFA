import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/analytics auth coverage", () => {
  it("getSalesAnalytics calls ensureShopAccess or listUserShopIds", () => {
    const src = readFileSync("convex/analytics.ts", "utf8");
    const idx = src.indexOf("export const getSalesAnalytics = query");
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx);
    expect(slice).toMatch(/ensure(ShopAccess|Approved)|listUserShopIds/);
  });
});
