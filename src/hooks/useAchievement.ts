"use client";

import { useContext } from "react";
import {
  AchievementContext,
  AchievementProvider,
} from "@/components/finly/Provider/AchievementProvider";

export { AchievementProvider };

export function useAchievement() {
  const ctx = useContext(AchievementContext);
  if (!ctx) {
    throw new Error(
      "useAchievement must be used inside <AchievementProvider>",
    );
  }
  return ctx;
}
