"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useAuthActions } from "@convex-dev/auth/react";
import { OrgSwitcher } from "./OrgSwitcher";

const WB_MENU = [
  { label: "Дашборд", href: "/" },
  { label: "Рука на пульсе", href: "/pulse" },
  { label: "Аналитика продаж", href: "/analytics" },
  { label: "Товары", href: "/products" },
  { label: "Финансовые отчеты", href: "/financials" },
  { label: "Отзывы и вопросы", href: "/feedbacks" },
  { label: "Возвраты", href: "/returns" },
  { label: "Цены", href: "/prices" },
];

export function TopNav() {
  const pathname = usePathname();
  const isWbActive = WB_MENU.some((item) => pathname === item.href);
  const user = useCurrentUser();
  const org = useCurrentOrg();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const isOwner = org?.role === "owner";
  const isAdmin = user?.isSystemAdmin === true;
  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-violet-600">
          Finly
        </Link>

        {/* WB Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition-colors",
              isWbActive
                ? "bg-violet-50 text-violet-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            Wildberries <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {WB_MENU.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full cursor-pointer",
                    pathname === item.href && "text-violet-700 font-medium"
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ozon — disabled placeholder */}
        <span className="text-sm text-gray-400 cursor-not-allowed flex items-center gap-1">
          Ozon <ChevronDown className="h-4 w-4" />
        </span>

        {/* Settings + user menu */}
        <div className="ml-auto flex items-center gap-3">
          <OrgSwitcher />
          {isOwner && (
            <Link
              href="/org/team"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Команда
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/users"
              className="text-sm text-violet-600 hover:underline"
            >
              Админ
            </Link>
          )}
          <Link
            href="/settings"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Настройки
          </Link>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm px-2 py-1 hover:bg-gray-100 rounded-md">
                <UserIcon className="h-4 w-4" />
                {user.name || user.email}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
