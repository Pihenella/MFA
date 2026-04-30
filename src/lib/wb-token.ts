export type WbTokenType = "base" | "test" | "personal" | "service" | "unknown";

export type WbTokenInfo = {
  type: WbTokenType;
  label: string;
  categories: string[];
  readOnly: boolean;
  expiresAt?: number;
};

const TOKEN_TYPE_LABELS: Record<WbTokenType, string> = {
  base: "Base token",
  test: "Test token",
  personal: "Personal token",
  service: "Service token",
  unknown: "Unknown token",
};

const CATEGORY_BITS: Array<[number, string]> = [
  [1, "Content"],
  [2, "Analytics"],
  [3, "Prices"],
  [4, "Marketplace"],
  [5, "Statistics"],
  [6, "Promotion"],
  [7, "Feedbacks"],
  [9, "Buyers chat"],
  [10, "Supplies"],
  [11, "Returns"],
  [12, "Documents"],
  [13, "Finance"],
  [16, "Users"],
];

const READ_ONLY_BIT = 30;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const BASE_TOKEN_SYNC_INTERVALS_MS: Record<string, number> = {
  analytics: 30 * MINUTE_MS,
  campaigns: HOUR_MS,
  feedbacks: 12 * MINUTE_MS,
  questions: 12 * MINUTE_MS,
  financials: 12 * HOUR_MS,
};

function decodeBase64UrlJson(value: string): unknown {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function decodeWbTokenPayload(token: string): Record<string, unknown> | null {
  const payload = token.trim().split(".")[1];
  if (!payload) return null;

  try {
    const decoded = decodeBase64UrlJson(payload);
    return decoded && typeof decoded === "object"
      ? decoded as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function numberField(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function tokenType(payload: Record<string, unknown> | null): WbTokenType {
  if (!payload) return "unknown";

  const acc = numberField(payload, "acc");
  const forValue = payload.for;
  const t = payload.t;

  if (acc === 1 && forValue === undefined && t === false) return "base";
  if (acc === 2 && forValue === undefined && t === true) return "test";
  if (acc === 3 && forValue === "self" && t === false) return "personal";
  if (
    acc === 4 &&
    typeof forValue === "string" &&
    forValue.startsWith("asid:") &&
    t === false
  ) {
    return "service";
  }
  return "unknown";
}

function hasBit(bitmask: number, bitPosition: number): boolean {
  return (bitmask & (1 << (bitPosition - 1))) !== 0;
}

export function getWbTokenInfo(token: string): WbTokenInfo {
  const payload = decodeWbTokenPayload(token);
  const type = tokenType(payload);
  const bitmask = payload ? numberField(payload, "s") ?? 0 : 0;
  const categories = CATEGORY_BITS
    .filter(([bit]) => hasBit(bitmask, bit))
    .map(([, category]) => category);
  const expiresAt = payload ? numberField(payload, "exp") : undefined;

  return {
    type,
    label: TOKEN_TYPE_LABELS[type],
    categories,
    readOnly: hasBit(bitmask, READ_ONLY_BIT),
    expiresAt,
  };
}

export function getWbBaseTokenSyncIntervalMs(endpoint: string): number | undefined {
  return BASE_TOKEN_SYNC_INTERVALS_MS[endpoint];
}

export function isWbBaseToken(token: string): boolean {
  return getWbTokenInfo(token).type === "base";
}
