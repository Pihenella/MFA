"use client";
import { useCurrentUser } from "./useCurrentUser";

export function useIsAdmin(): boolean | undefined {
  const user = useCurrentUser();
  if (user === undefined) return undefined;
  if (!user) return false;
  return user.isSystemAdmin === true;
}
