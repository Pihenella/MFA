"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  usersCurrentRef,
  usersUpdateThemePreferenceRef,
} from "@/lib/convex-refs";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const COOKIE = "finly_theme";

function setCookie(value: Theme) {
  document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? resolveSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(
    initialTheme === "dark" ? "dark" : "light"
  );

  const updateOnServer = useMutation(usersUpdateThemePreferenceRef);
  const me = useQuery(usersCurrentRef);

  useEffect(() => {
    setResolved(applyTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(applyTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    if (!me) return;
    if (me.themePreference !== theme) {
      setThemeState(me.themePreference);
      setCookie(me.themePreference);
    }
  }, [me, theme]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      setCookie(nextTheme);
      if (me) {
        updateOnServer({ themePreference: nextTheme }).catch(() => {
          // Theme still updates locally if the client is offline.
        });
      }
    },
    [me, updateOnServer]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
