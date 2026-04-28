import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "treasure";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "finly-button-primary bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border border-secondary text-secondary hover:bg-secondary/10",
  ghost: "text-foreground hover:bg-muted",
  treasure:
    "bg-gradient-to-r from-gold-frame to-orange-flame text-scroll-ink hover:opacity-95",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function FinlyButton({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-pill font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        className
      )}
      {...rest}
    />
  );
}
