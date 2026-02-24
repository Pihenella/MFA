"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const WB_MENU = [
  { label: "Дашборд", href: "/" },
  { label: "Товары", href: "/products" },
  { label: "Финансовые отчеты", href: "/financials" },
];

export function TopNav() {
  const pathname = usePathname();
  const isWbActive = WB_MENU.some((item) => pathname === item.href);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-violet-600">
          MFA
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

        {/* Settings link */}
        <div className="ml-auto">
          <Link
            href="/settings"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Настройки
          </Link>
        </div>
      </div>
    </header>
  );
}
