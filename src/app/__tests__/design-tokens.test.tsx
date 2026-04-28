import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

describe("design tokens", () => {
  it.each([
    "--color-tavern-bg",
    "--color-tavern-surface",
    "--color-tavern-elevated",
    "--color-orange-flame",
    "--color-murloc-teal",
    "--color-gold-frame",
    "--color-scroll-ink",
    "--color-scroll-faded",
    "--color-rune-success",
    "--color-rune-danger",
    "--color-tide-glow",
  ])("declares %s in :root and .dark", (token) => {
    const rootSection = css.match(/:root\s*\{[\s\S]*?\}/)![0];
    const darkSection = css.match(/\.dark\s*\{[\s\S]*?\}/)![0];
    expect(rootSection).toContain(token);
    expect(darkSection).toContain(token);
  });

  it("re-binds primary to orange-flame", () => {
    expect(css).toMatch(/--primary:\s*var\(--orange-flame\)/);
  });

  it("declares --radius-frame and --radius-pill", () => {
    expect(css).toContain("--radius-frame");
    expect(css).toContain("--radius-pill");
  });
});
