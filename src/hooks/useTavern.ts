"use client";

import { useContext } from "react";
import {
  TavernContext,
  TavernProvider,
} from "@/components/finly/Provider/TavernProvider";

export { TavernProvider };

export function useTavern() {
  const ctx = useContext(TavernContext);
  if (!ctx) throw new Error("useTavern must be used inside <TavernProvider>");
  return ctx;
}
