import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/actions auth coverage", () => {
  const src = readFileSync("convex/actions.ts", "utf8");
  it.each(["triggerSync", "fetchAnalytics"])("%s calls verifyShopAccessRef", (fn) => {
    const idx = src.indexOf(`export const ${fn} = action`);
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 1500);
    expect(slice).toMatch(/verifyShopAccessRef|ensureShopAccess/);
  });
});
