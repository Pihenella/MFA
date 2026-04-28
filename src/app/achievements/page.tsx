"use client";

import { useQuery } from "convex/react";
import { AuthGate } from "@/components/auth/AuthGate";
import {
  FinlyCard,
  FinlyEmptyState,
  FinlySection,
  MascotIllustration,
} from "@/components/finly";
import { achievementsListAllRef } from "@/lib/convex-refs";
import type { Doc } from "../../../convex/_generated/dataModel";

const TITLES: Record<Doc<"userAchievements">["kind"], string> = {
  firstShop: "Первый магазин",
  firstThousandSales: "1 000 продаж",
  monthlyPlanHit: "План по прибыли выполнен",
  firstMillionProfit: "Первый миллион прибыли",
  tenKSold: "10 000 единиц продано",
  zeroReturnsWeek: "Неделя без возвратов",
  firstReviewFiveStar: "Отзыв на 5 звезд",
  storeAnniversary: "Годовщина магазина",
};

function formatDate(value: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function AchievementsContent() {
  const items = useQuery(achievementsListAllRef);

  if (items === undefined) {
    return (
      <FinlyEmptyState
        pose="empty-data"
        title="Загружаем достижения"
        body="Финли сверяет карту вех и скоро покажет найденные отметки."
      />
    );
  }

  if (items.length === 0) {
    return (
      <FinlyEmptyState
        pose="empty-data"
        title="Достижений пока нет"
        body="Первый магазин, 1 000 продаж, миллион прибыли и другие вехи появятся здесь, когда Финли их заметит."
      />
    );
  }

  return (
    <FinlySection title="Достижения">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((achievement) => (
          <FinlyCard
            key={achievement._id}
            glowing
            accent="gold"
            className="min-h-32"
          >
            <div className="flex items-start gap-3">
              <MascotIllustration
                pose="achievement"
                size={56}
                loading="eager"
                className="shrink-0"
              />
              <div className="min-w-0">
                <div className="font-display text-lg font-semibold text-foreground">
                  {TITLES[achievement.kind] ?? achievement.kind}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Получено {formatDate(achievement.achievedAt)}
                </div>
              </div>
            </div>
          </FinlyCard>
        ))}
      </div>
    </FinlySection>
  );
}

export default function AchievementsPage() {
  return (
    <AuthGate>
      <AchievementsContent />
    </AuthGate>
  );
}
