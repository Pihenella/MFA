import { describe, it, expect } from "vitest";
import { execSync } from "child_process";

describe("frontend pages do not use deprecated shopsListRef", () => {
  it("only shopsListMineRef is used in src/app/**/*.tsx", () => {
    // -w (word boundary) — чтобы не матчить shopsListMineRef
    // exclude — этот файл содержит литерал имени ref для проверки.
    const needle = ["shops", "List", "Ref"].join("");
    const out = execSync(
      `grep -rlnw "${needle}" --exclude=no-deprecated-shops-list.test.ts src/app src/hooks src/components || true`,
      { encoding: "utf8" }
    );
    expect(out.trim()).toBe("");
  });
});
