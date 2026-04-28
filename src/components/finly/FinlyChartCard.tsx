import type { ReactNode } from "react";
import { FinlyCard } from "./FinlyCard";

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function FinlyChartCard({ title, subtitle, action, children }: Props) {
  return (
    <FinlyCard className="p-0">
      <header className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-foreground">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="px-5 pb-5 pt-4">{children}</div>
    </FinlyCard>
  );
}
