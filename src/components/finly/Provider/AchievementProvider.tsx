"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { FinlyAchievementToast } from "../FinlyAchievementToast";
import type { MascotPose } from "../MascotIllustration";
import {
  achievementsMarkSeenRef,
  achievementsNewSinceLastSeenRef,
} from "@/lib/convex-refs";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

const MAX_VISIBLE_TOASTS = 3;

const ACHIEVEMENT_COPY: Record<
  Doc<"userAchievements">["kind"],
  { title: string; body: string }
> = {
  firstShop: {
    title: "Первый магазин!",
    body: "Карта Финли открыта. Дальше будем отмечать важные вехи вместе.",
  },
  firstThousandSales: {
    title: "1 000 продаж!",
    body: "Отличный темп: первая тысяча заказов уже в истории.",
  },
  monthlyPlanHit: {
    title: "План по прибыли выполнен!",
    body: "Месячная цель закрыта. Финли поднимает кубок за точный курс.",
  },
  firstMillionProfit: {
    title: "Первый миллион прибыли!",
    body: "Сильная веха для магазина и всей команды.",
  },
  tenKSold: {
    title: "10 000 единиц продано!",
    body: "Склад, карточки и спрос сыграли в одну сторону.",
  },
  zeroReturnsWeek: {
    title: "Неделя без возвратов!",
    body: "Качество держит строй, а клиенты довольны.",
  },
  firstReviewFiveStar: {
    title: "Первый отзыв на 5 звезд!",
    body: "Покупатель оценил товар по максимуму.",
  },
  storeAnniversary: {
    title: "Годовщина магазина!",
    body: "Еще один год на карте. Есть что отпраздновать.",
  },
};

export interface AchievementToastInput {
  kind: Doc<"userAchievements">["kind"] | string;
  title: string;
  body?: string;
  mascotPose?: MascotPose;
}

interface Toast extends AchievementToastInput {
  id: string;
  achievementId?: Id<"userAchievements">;
}

export interface AchievementContextValue {
  show: (toast: AchievementToastInput) => void;
}

export const AchievementContext =
  createContext<AchievementContextValue | null>(null);

function copyForAchievement(achievement: Doc<"userAchievements">) {
  return (
    ACHIEVEMENT_COPY[achievement.kind] ?? {
      title: "Новое достижение!",
      body: "Финли добавил новую отметку на карту.",
    }
  );
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const newAchievements = useQuery(achievementsNewSinceLastSeenRef);
  const markSeen = useMutation(achievementsMarkSeenRef);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const processedIds = useRef(new Set<string>());
  const manualToastId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((toast: AchievementToastInput) => {
    manualToastId.current += 1;
    const id = `manual-${manualToastId.current}`;
    setToasts((current) =>
      [{ id, mascotPose: "achievement" as const, ...toast }, ...current].slice(
        0,
        MAX_VISIBLE_TOASTS,
      ),
    );
  }, []);

  useEffect(() => {
    if (!newAchievements?.length) return;

    const unseen = newAchievements.filter(
      (achievement) => !processedIds.current.has(String(achievement._id)),
    );
    if (!unseen.length) return;

    const next = unseen.slice(0, MAX_VISIBLE_TOASTS).map((achievement) => {
      const copy = copyForAchievement(achievement);
      processedIds.current.add(String(achievement._id));
      return {
        id: String(achievement._id),
        achievementId: achievement._id,
        kind: achievement.kind,
        title: copy.title,
        body: copy.body,
        mascotPose: "achievement" as const,
      };
    });

    setToasts((current) =>
      [...next, ...current].slice(0, MAX_VISIBLE_TOASTS),
    );

    next.forEach((toast) => {
      if (!toast.achievementId) return;
      markSeen({ achievementId: toast.achievementId }).catch(() => {
        processedIds.current.delete(String(toast.achievementId));
      });
    });
  }, [markSeen, newAchievements]);

  const value = useMemo<AchievementContextValue>(() => ({ show }), [show]);

  return (
    <AchievementContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-20 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 sm:right-6">
        {toasts.map((toast) => (
          <FinlyAchievementToast
            key={toast.id}
            title={toast.title}
            body={toast.body}
            mascotPose={toast.mascotPose}
            onClose={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </AchievementContext.Provider>
  );
}
