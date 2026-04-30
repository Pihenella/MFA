import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ConvexClientProvider } from "./ConvexClientProvider";

describe("ConvexClientProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders fallback when NEXT_PUBLIC_CONVEX_URL not set", () => {
    const original = process.env.NEXT_PUBLIC_CONVEX_URL;
    process.env.NEXT_PUBLIC_CONVEX_URL = "";
    const { getByText } = render(
      <ConvexClientProvider><span>child</span></ConvexClientProvider>
    );
    expect(getByText(/Convex не настроен/)).toBeTruthy();
    process.env.NEXT_PUBLIC_CONVEX_URL = original;
  });
});
