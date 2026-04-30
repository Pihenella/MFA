import { describe, expect, it } from "vitest";
import {
  decodeWbTokenPayload,
  getWbBaseTokenSyncIntervalMs,
  getWbTokenInfo,
  isWbBaseToken,
} from "./wb-token";

function token(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

describe("WB token helpers", () => {
  it("detects Base token payloads without exposing the token value", () => {
    const apiKey = token({
      acc: 1,
      t: false,
      s: 16126,
      exp: 1791230073,
    });

    expect(isWbBaseToken(apiKey)).toBe(true);
    expect(getWbTokenInfo(apiKey)).toMatchObject({
      type: "base",
      label: "Base token",
      categories: [
        "Analytics",
        "Prices",
        "Marketplace",
        "Statistics",
        "Promotion",
        "Feedbacks",
        "Supplies",
        "Returns",
        "Documents",
        "Finance",
      ],
      readOnly: false,
      expiresAt: 1791230073,
    });
  });

  it("detects personal token payloads", () => {
    const apiKey = token({ acc: 3, for: "self", t: false, s: 2 });

    expect(isWbBaseToken(apiKey)).toBe(false);
    expect(getWbTokenInfo(apiKey).type).toBe("personal");
  });

  it("returns null for malformed payloads", () => {
    expect(decodeWbTokenPayload("not-a-jwt")).toBeNull();
    expect(getWbTokenInfo("not-a-jwt").type).toBe("unknown");
  });

  it("keeps Base endpoint cadence values explicit", () => {
    expect(getWbBaseTokenSyncIntervalMs("feedbacks")).toBe(12 * 60_000);
    expect(getWbBaseTokenSyncIntervalMs("analytics")).toBe(30 * 60_000);
    expect(getWbBaseTokenSyncIntervalMs("campaigns")).toBe(60 * 60_000);
    expect(getWbBaseTokenSyncIntervalMs("financials")).toBe(12 * 60 * 60_000);
    expect(getWbBaseTokenSyncIntervalMs("orders")).toBeUndefined();
  });
});
