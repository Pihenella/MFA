import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/costs auth coverage", () => {
  const src = readFileSync("convex/costs.ts", "utf8");
  it.each(["upsertCost", "upsertBulk", "listByShop"])("%s calls ensureShopAccess", (fn) => {
    const idx = src.indexOf(`export const ${fn} =`);
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 1500);
    expect(slice).toMatch(/ensureShopAccess/);
  });
});
