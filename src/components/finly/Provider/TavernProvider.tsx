"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  usersCurrentRef,
  usersUpdateTavernModeRef,
} from "@/lib/convex-refs";

export interface TavernContextValue {
  tavern: boolean;
  setTavern: (tavern: boolean) => void;
}

export const TavernContext = createContext<TavernContextValue | null>(null);

const COOKIE = "finly_tavern";

function setCookie(value: boolean) {
  document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function TavernProvider({
  children,
  initialTavern,
}: {
  children: ReactNode;
  initialTavern: boolean;
}) {
  const [tavern, setTavernState] = useState(initialTavern);
  const updateOnServer = useMutation(usersUpdateTavernModeRef);
  const me = useQuery(usersCurrentRef);

  useEffect(() => {
    document.documentElement.classList.toggle("tavern", tavern);
  }, [tavern]);

  useEffect(() => {
    if (!me) return;
    if (me.tavernMode !== tavern) {
      setTavernState(me.tavernMode);
      setCookie(me.tavernMode);
    }
  }, [me, tavern]);

  const setTavern = useCallback(
    (nextTavern: boolean) => {
      setTavernState(nextTavern);
      setCookie(nextTavern);
      if (me) {
        updateOnServer({ tavernMode: nextTavern }).catch(() => {
          // Tavern mode still updates locally if the client is offline.
        });
      }
    },
    [me, updateOnServer]
  );

  const value = useMemo<TavernContextValue>(
    () => ({ tavern, setTavern }),
    [tavern, setTavern]
  );

  return (
    <TavernContext.Provider value={value}>{children}</TavernContext.Provider>
  );
}
