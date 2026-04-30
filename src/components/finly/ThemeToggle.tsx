"use client";

import { MonitorCog, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { Theme } from "@/components/finly/Provider/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const buttons: Array<{
    value: Theme;
    icon: typeof Sun;
    label: string;
  }> = [
    { value: "light", icon: Sun, label: "Светлая тема" },
    { value: "dark", icon: Moon, label: "Темная тема" },
    { value: "system", icon: MonitorCog, label: "Системная тема" },
  ];

  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      {buttons.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          title={label}
          onClick={() => setTheme(value)}
          className={`flex size-8 items-center justify-center rounded-sm transition-colors ${
            theme === value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
