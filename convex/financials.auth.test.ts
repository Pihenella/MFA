import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/financials auth coverage", () => {
  const src = readFileSync("convex/financials.ts", "utf8");
  it.each(["getReports", "clearByShop"])("%s calls ensure helper", (fn) => {
    const idx = src.indexOf(`export const ${fn} =`);
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 1200);
    expect(slice).toMatch(/ensure(ShopAccess|Approved)|listUserShopIds/);
  });
});
