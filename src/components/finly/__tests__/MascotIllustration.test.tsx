import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MascotIllustration } from "@/components/finly/MascotIllustration";

describe("MascotIllustration", () => {
  it("renders picture with webp source and png fallback", () => {
    const { container } = render(
      <MascotIllustration pose="hero" size={320} alt="Hero mascot" />
    );
    const picture = container.querySelector("picture");
    expect(picture).toBeTruthy();
    const source = picture?.querySelector("source");
    expect(source?.getAttribute("srcset")).toContain("/mascot/hero.webp");
    const img = picture?.querySelector("img");
    expect(img?.getAttribute("src")).toContain("/mascot/hero.png");
    expect(img?.getAttribute("alt")).toBe("Hero mascot");
    expect(img?.getAttribute("width")).toBe("320");
  });

  it("defaults loading=lazy", () => {
    const { container } = render(
      <MascotIllustration pose="empty-shops" size={200} />
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("supports loading=eager", () => {
    const { container } = render(
      <MascotIllustration pose="hero" size={320} loading="eager" />
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("eager");
  });
});
