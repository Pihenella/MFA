import type { ReactNode } from "react";
import { MascotIllustration, type MascotPose } from "./MascotIllustration";

interface Props {
  children: ReactNode;
  mascotPose?: MascotPose;
  title?: string;
  subtitle?: string;
}

export function FinlyAuthLayout({
  children,
  mascotPose = "hero",
  title,
  subtitle,
}: Props) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div className="hidden flex-col items-center text-center md:flex">
          <MascotIllustration pose={mascotPose} size={320} loading="eager" />
          {title ? (
            <h1 className="mt-6 font-display text-3xl font-bold text-foreground">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className="mt-3 max-w-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        <div className="rounded-frame border border-border bg-popover p-6 shadow-rune md:p-8">
          <div className="mb-6 text-center md:hidden">
            <MascotIllustration pose={mascotPose} size={160} loading="eager" />
            {title ? (
              <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
                {title}
              </h1>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
