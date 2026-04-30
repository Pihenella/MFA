import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoundProvider } from "@/components/finly/Provider/SoundProvider";
import { TavernContext } from "@/components/finly/Provider/TavernProvider";
import { useSound } from "@/hooks/useSound";

const audioInstances: MockAudio[] = [];
const playMock = vi.fn();
const pauseMock = vi.fn();
const loadMock = vi.fn();

class MockAudio extends EventTarget {
  currentTime = 0;
  preload = "";
  pause = pauseMock;
  load = loadMock;
  play = playMock;

  constructor(public src: string) {
    super();
    audioInstances.push(this);
  }
}

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

function Probe({ name = "click" }: { name?: Parameters<typeof useSound>[0] }) {
  const play = useSound(name);
  return (
    <button type="button" onClick={play}>
      play
    </button>
  );
}

function renderSoundProvider({
  tavern,
  name,
}: {
  tavern: boolean;
  name?: Parameters<typeof useSound>[0];
}) {
  render(
    <TavernContext.Provider value={{ tavern, setTavern: vi.fn() }}>
      <SoundProvider>
        <Probe name={name} />
      </SoundProvider>
    </TavernContext.Provider>,
  );
}

describe("SoundProvider", () => {
  beforeEach(() => {
    audioInstances.length = 0;
    playMock.mockReset();
    playMock.mockResolvedValue(undefined);
    pauseMock.mockReset();
    loadMock.mockReset();
    vi.useFakeTimers();
    vi.stubGlobal("Audio", MockAudio);
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not create or play audio outside tavern mode", () => {
    renderSoundProvider({ tavern: false });

    fireEvent.click(screen.getByText("play"));

    expect(audioInstances).toHaveLength(0);
    expect(playMock).not.toHaveBeenCalled();
  });

  it("plays a tavern sprite slot and pauses after its duration", () => {
    renderSoundProvider({ tavern: true, name: "achievement" });

    fireEvent.click(screen.getByText("play"));

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].src).toBe("/sounds/finly.ogg");
    expect(audioInstances[0].currentTime).toBe(0.5);
    expect(playMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);

    expect(pauseMock).toHaveBeenCalledTimes(1);
  });

  it("no-ops when reduced motion is enabled", () => {
    mockReducedMotion(true);

    renderSoundProvider({ tavern: true });

    fireEvent.click(screen.getByText("play"));

    expect(audioInstances).toHaveLength(0);
    expect(playMock).not.toHaveBeenCalled();
  });

  it("no-ops when Audio is unavailable", () => {
    vi.stubGlobal("Audio", undefined);

    renderSoundProvider({ tavern: true });

    fireEvent.click(screen.getByText("play"));

    expect(playMock).not.toHaveBeenCalled();
  });
});
