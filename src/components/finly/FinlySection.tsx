import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLElement> {
  title: string;
  action?: ReactNode;
}

export function FinlySection({
  title,
  action,
  className,
  children,
  ...rest
}: Props) {
  return (
    <section className={cn("space-y-4", className)} {...rest}>
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            {title}
          </h2>
          <div className="mt-2 h-px bg-gradient-to-r from-gold-frame to-transparent" />
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
