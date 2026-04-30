"use client";

import { X } from "lucide-react";
import { FinlyCard } from "./FinlyCard";
import {
  MascotIllustration,
  type MascotPose,
} from "./MascotIllustration";

interface Props {
  title: string;
  body?: string;
  mascotPose?: MascotPose;
  onClose: () => void;
}

export function FinlyAchievementToast({
  title,
  body,
  mascotPose = "achievement",
  onClose,
}: Props) {
  return (
    <FinlyCard
      role="alert"
      aria-live="polite"
      glowing
      accent="gold"
      className="w-full p-4 shadow-treasure"
      style={{ animation: "achievement-enter 380ms cubic-bezier(.2,.9,.3,1)" }}
    >
      <div className="flex items-start gap-3">
        <MascotIllustration
          pose={mascotPose}
          size={64}
          loading="eager"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-semibold text-foreground">
            {title}
          </div>
          {body ? (
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {body}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть достижение"
          className="rounded-frame p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </FinlyCard>
  );
}
