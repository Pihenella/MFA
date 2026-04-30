import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "danger" | "info" | "gold" | "muted";

const TONE: Record<Tone, string> = {
  success: "bg-rune-success/15 text-rune-success border-rune-success/30",
  danger: "bg-rune-danger/15 text-rune-danger border-rune-danger/30",
  info: "bg-murloc-teal/15 text-murloc-teal border-murloc-teal/30",
  gold: "bg-gold-frame/15 text-gold-frame border-gold-frame/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export function FinlyBadge({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
