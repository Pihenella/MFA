"use client";
import { useQuery } from "convex/react";
import { usersCurrentRef, type CurrentUser } from "@/lib/convex-refs";

/**
 * Возвращает текущего юзера или null/undefined.
 * - undefined — query loading
 * - null — нет сессии или юзер удалён
 * - CurrentUser — залогинен
 */
export function useCurrentUser(): CurrentUser | null | undefined {
  return useQuery(usersCurrentRef);
}
