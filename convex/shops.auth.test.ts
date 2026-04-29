import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/shops auth coverage", () => {
  const src = readFileSync("convex/shops.ts", "utf8");

  it.each(["add", "remove", "setActive", "updateCategories", "updateTaxRate", "getSyncLog"])(
    "%s handler calls ensureShopAccess or ensureOrgOwner",
    (fn) => {
      const fnRegex = new RegExp(`export const ${fn} = mutation|export const ${fn} = query`);
      expect(src).toMatch(fnRegex);
      const idx = src.search(fnRegex);
      const slice = src.slice(idx, idx + 1500);
      expect(slice).toMatch(/ensure(ShopAccess|OrgOwner|OrgMember|Approved)/);
    }
  );
});
