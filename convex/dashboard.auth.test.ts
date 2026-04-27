import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/dashboard auth coverage", () => {
  const src = readFileSync("convex/dashboard.ts", "utf8");
  const handlers = [
    "getOrders", "getSales", "getStocks", "getFinancials", "getCampaigns",
    "getNmReports", "getProductCards", "getFeedbacks", "getQuestions",
    "getPrices", "getReturns", "getCosts",
  ];

  it.each(handlers)("%s calls ensureShopAccess or listUserShopIds", (fn) => {
    const idx = src.indexOf(`export const ${fn} = query`);
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 2500);
    expect(slice).toMatch(/ensure(ShopAccess|Approved)|listUserShopIds/);
  });
});
