import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Accent = "gold" | "teal" | "flame";

interface Props extends HTMLAttributes<HTMLDivElement> {
  accent?: Accent;
  interactive?: boolean;
  glowing?: boolean;
}

const ACCENT: Record<Accent, string> = {
  gold: "border-gold-frame/40",
  teal: "border-murloc-teal/50",
  flame: "border-orange-flame/50",
};

export function FinlyCard({
  accent = "gold",
  interactive = false,
  glowing = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        "rounded-frame border bg-card p-4 transition-shadow",
        ACCENT[accent],
        interactive &&
          "finly-card-interactive cursor-pointer hover:shadow-[0_0_0_1px_var(--murloc-teal),0_8px_32px_var(--tide-glow)] hover:shadow-tide",
        glowing &&
          "shadow-[0_0_0_2px_var(--gold-frame),0_0_24px_rgba(212,169,58,0.4)] shadow-treasure",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
