import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("sync.ts and syncAll.ts have no public handlers", () => {
  it.each(["convex/sync.ts", "convex/syncAll.ts"])("%s exports only internal*", (file) => {
    const src = readFileSync(file, "utf8");
    const publicMatches = src.match(/=\s*(action|mutation|query)\s*\(/g) ?? [];
    expect(publicMatches.filter((m) => !m.includes("internal"))).toEqual([]);
  });
});
