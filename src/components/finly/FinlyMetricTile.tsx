import type { HTMLAttributes, KeyboardEvent } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "gold" | "teal" | "flame";

type Achievement = {
  kind: string;
  sinceDate: string;
};

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "onClick"> {
  label: string;
  value: number | string;
  formatted?: string;
  deltaPct?: number;
  comparison?: string;
  accent?: Accent;
  achievement?: Achievement;
  loading?: boolean;
  onClick?: () => void;
}

const ACCENT_BORDER: Record<Accent, string> = {
  gold: "border-gold-frame/40",
  teal: "border-murloc-teal/50",
  flame: "border-orange-flame/50",
};

const numberFmt = new Intl.NumberFormat("ru-RU");

export function FinlyMetricTile({
  label,
  value,
  formatted,
  deltaPct,
  comparison,
  accent = "gold",
  achievement,
  loading = false,
  onClick,
  className,
  ...rest
}: Props) {
  const display =
    formatted ?? (typeof value === "number" ? numberFmt.format(value) : value);
  const hasDelta = deltaPct !== undefined;
  const positive = hasDelta && deltaPct >= 0;
  const interactive = !!onClick;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!interactive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  if (loading) {
    return (
      <div
        aria-label="Загрузка метрики"
        className={cn(
          "finly-metric-tile min-h-[120px] rounded-frame border bg-card p-5 animate-pulse",
          ACCENT_BORDER[accent],
          className
        )}
        {...rest}
      >
        <div className="mb-3 h-3 w-24 rounded bg-muted" />
        <div className="mb-2 h-8 w-32 rounded bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
    );
  }

  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        "finly-metric-tile relative min-h-[120px] rounded-frame border bg-card p-5 transition-all duration-[220ms] [transition-timing-function:var(--ease-tilt)]",
        ACCENT_BORDER[accent],
        interactive &&
          "cursor-pointer outline-none hover:[transform:perspective(800px)_rotateX(2deg)_rotateY(-2deg)_translateZ(0)] hover:shadow-[0_0_0_1px_var(--murloc-teal),0_8px_32px_var(--tide-glow)] hover:shadow-tide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        achievement &&
          "shadow-[0_0_0_2px_var(--gold-frame),0_0_24px_rgba(212,169,58,0.4)] shadow-treasure",
        className
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...rest}
    >
      {achievement ? (
        <span
          aria-label="Достижение"
          className="absolute right-2 top-2 font-display text-lg text-gold-frame"
        >
          ⟡
        </span>
      ) : null}

      <div className="pr-6 text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 break-words font-display text-3xl font-bold text-foreground">
        {display}
      </div>

      {hasDelta || comparison ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {hasDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                positive ? "text-rune-success" : "text-rune-danger"
              )}
            >
              <TrendIcon aria-hidden="true" className="h-3.5 w-3.5" />
              {positive ? "+" : ""}
              {deltaPct.toFixed(1)}%
            </span>
          ) : null}
          {comparison ? (
            <span className="text-muted-foreground">{comparison}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
