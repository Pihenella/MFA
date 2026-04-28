"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useTavern } from "@/hooks/useTavern";

interface Slot {
  offset: number;
  duration: number;
}

const SLOTS = {
  click: { offset: 0.0, duration: 0.15 },
  achievement: { offset: 0.5, duration: 0.5 },
  flip: { offset: 1.5, duration: 0.3 },
} satisfies Record<string, Slot>;

export type SoundName = keyof typeof SLOTS;

interface SoundContextValue {
  play: (name: SoundName) => void;
}

const noop = () => {};

export const SoundContext = createContext<SoundContextValue>({ play: noop });

export function useSoundContext() {
  return useContext(SoundContext);
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createSprite() {
  if (typeof Audio === "undefined") return null;

  try {
    const audio = new Audio("/sounds/finly.ogg");
    audio.preload = "auto";
    return audio;
  } catch {
    return null;
  }
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const { tavern } = useTavern();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const disabledRef = useRef(false);
  const pauseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reduce = prefersReducedMotion();

  useEffect(() => {
    if (!tavern || reduce || disabledRef.current) return;
    if (audioRef.current) return;

    const audio = createSprite();
    if (!audio) {
      disabledRef.current = true;
      return;
    }

    const handleError = () => {
      audioRef.current = null;
      disabledRef.current = true;
    };

    audio.addEventListener("error", handleError);
    audioRef.current = audio;

    try {
      audio.load();
    } catch {
      handleError();
    }

    return () => {
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, [reduce, tavern]);

  useEffect(() => {
    return () => {
      pauseTimersRef.current.forEach(clearTimeout);
      pauseTimersRef.current = [];
    };
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (!tavern || reduce || disabledRef.current) return;

      const audio = audioRef.current;
      const slot = SLOTS[name];
      if (!audio || !slot) return;

      try {
        audio.currentTime = slot.offset;
      } catch {
        disabledRef.current = true;
        audioRef.current = null;
        return;
      }

      try {
        const result = audio.play();
        if (result) {
          result.catch(() => {
            // Browsers may block autoplay; sound stays optional.
          });
        }
      } catch {
        return;
      }

      const timer = setTimeout(() => {
        audio.pause();
        pauseTimersRef.current = pauseTimersRef.current.filter(
          (pauseTimer) => pauseTimer !== timer,
        );
      }, slot.duration * 1000);
      pauseTimersRef.current.push(timer);
    },
    [reduce, tavern],
  );

  const value = useMemo<SoundContextValue>(() => ({ play }), [play]);

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}
