"use client";

import { useContext } from "react";
import {
  ThemeContext,
  ThemeProvider,
} from "@/components/finly/Provider/ThemeProvider";

export { ThemeProvider };

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
