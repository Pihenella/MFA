"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { Menu } from "lucide-react";
import { MascotIllustration } from "@/components/finly/MascotIllustration";
import { ThemeToggle } from "@/components/finly/ThemeToggle";
import { usersCurrentRef } from "@/lib/convex-refs";
import { cn } from "@/lib/utils";
import { AvatarMenu } from "./AvatarMenu";
import { OrgSwitcher } from "./OrgSwitcher";

const NAV_ITEMS = [
  { label: "Дашборд", href: "/" },
  { label: "Аналитика", href: "/analytics" },
  { label: "Пульс", href: "/pulse" },
  { label: "Товары", href: "/products" },
  { label: "Финансы", href: "/financials" },
  { label: "Цены", href: "/prices" },
  { label: "Возвраты", href: "/returns" },
  { label: "Отзывы", href: "/feedbacks" },
];

export function TopNav() {
  const me = useQuery(usersCurrentRef);
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showNav = me?.status === "approved";

  return (
    <header className="sticky top-0 z-50 border-b border-gold-frame/30 bg-card">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <MascotIllustration pose="nav-icon" size={32} loading="eager" />
          <span className="font-display text-xl font-semibold text-foreground">
            Finly
          </span>
        </Link>

        {showNav ? (
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ label, href }) => {
              const active =
                pathname === href || (href !== "/" && pathname.startsWith(href));

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-sm transition",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {label}
                  {active ? (
                    <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-orange-flame" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {showNav ? <OrgSwitcher /> : null}
          {me ? <AvatarMenu /> : null}
          {me === null ? (
            <Link href="/login" className="text-sm text-foreground hover:underline">
              Войти
            </Link>
          ) : null}
          {showNav ? (
            <button
              type="button"
              className="rounded-md p-2 hover:bg-muted md:hidden"
              onClick={() => setDrawerOpen((current) => !current)}
              aria-label="Открыть меню"
              aria-expanded={drawerOpen}
            >
              <Menu aria-hidden="true" size={20} />
            </button>
          ) : null}
        </div>
      </div>

      {showNav && drawerOpen ? (
        <div className="border-t border-border bg-popover md:hidden">
          <nav className="grid grid-cols-2 gap-1 px-4 py-3">
            {NAV_ITEMS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawerOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
