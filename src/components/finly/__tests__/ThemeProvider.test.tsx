import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue(undefined),
  useQuery: () => undefined,
}));

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("light")}>light</button>
      <button onClick={() => setTheme("system")}>system</button>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.cookie = "finly_theme=; max-age=0";
  });

  it("defaults to system", () => {
    render(
      <ThemeProvider initialTheme="system">
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("system");
  });

  it("setTheme('dark') adds dark class on html", () => {
    render(
      <ThemeProvider initialTheme="system">
        <Probe />
      </ThemeProvider>
    );
    act(() => screen.getByText("dark").click());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("setTheme('light') removes dark class", () => {
    render(
      <ThemeProvider initialTheme="dark">
        <Probe />
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    act(() => screen.getByText("light").click());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists theme to cookie", () => {
    render(
      <ThemeProvider initialTheme="system">
        <Probe />
      </ThemeProvider>
    );
    act(() => screen.getByText("dark").click());
    expect(document.cookie).toContain("finly_theme=dark");
  });
});
