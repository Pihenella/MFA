import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TavernProvider, useTavern } from "@/hooks/useTavern";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue(undefined),
  useQuery: () => undefined,
}));

function Probe() {
  const { tavern, setTavern } = useTavern();
  return (
    <>
      <span data-testid="tavern">{tavern ? "on" : "off"}</span>
      <button onClick={() => setTavern(!tavern)}>toggle</button>
    </>
  );
}

describe("TavernProvider", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.cookie = "finly_tavern=; max-age=0";
  });

  it("defaults to off", () => {
    render(
      <TavernProvider initialTavern={false}>
        <Probe />
      </TavernProvider>
    );
    expect(screen.getByTestId("tavern")).toHaveTextContent("off");
    expect(document.documentElement.classList.contains("tavern")).toBe(false);
  });

  it("toggle on adds tavern class and persists cookie", () => {
    render(
      <TavernProvider initialTavern={false}>
        <Probe />
      </TavernProvider>
    );
    act(() => screen.getByText("toggle").click());
    expect(document.documentElement.classList.contains("tavern")).toBe(true);
    expect(document.cookie).toContain("finly_tavern=true");
  });
});
