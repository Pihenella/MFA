"use client";

import {
  SoundProvider,
  useSoundContext,
  type SoundName,
} from "@/components/finly/Provider/SoundProvider";

export { SoundProvider };

export function useSound(name: SoundName) {
  const { play } = useSoundContext();
  return () => play(name);
}
