"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  ChevronDown,
  LogOut,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { usersCurrentRef } from "@/lib/convex-refs";
import { cn } from "@/lib/utils";

export function AvatarMenu() {
  const me = useQuery(usersCurrentRef);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!me) return null;

  const initials = (me.name || me.email || "?").trim().slice(0, 1).toUpperCase();
  const items = [
    { label: "Профиль", href: "/settings", icon: User },
    { label: "Команда", href: "/org/team", icon: Users },
    { label: "Настройки", href: "/org/settings", icon: Settings },
    ...(me.isSystemAdmin
      ? [{ label: "Админ-панель", href: "/admin/users", icon: ShieldCheck }]
      : []),
  ];

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-muted"
        aria-label="Меню профиля"
        aria-expanded={open}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {initials}
        </span>
        <ChevronDown aria-hidden="true" size={14} className="text-muted-foreground" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-frame border border-border bg-popover py-1 shadow-rune">
            <div className="border-b border-border px-4 py-3">
              <div className="truncate text-sm font-medium text-foreground">
                {me.name || "—"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {me.email}
              </div>
            </div>

            {items.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm text-foreground transition hover:bg-muted"
                )}
              >
                <Icon aria-hidden="true" size={16} className="text-muted-foreground" />
                {label}
              </Link>
            ))}

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 border-t border-border px-4 py-2 text-sm text-rune-danger transition hover:bg-muted"
            >
              <LogOut aria-hidden="true" size={16} />
              Выйти
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
