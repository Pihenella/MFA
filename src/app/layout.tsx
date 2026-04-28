import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import {
  ThemeProvider,
  type Theme,
} from "@/components/finly/Provider/ThemeProvider";
import { TavernProvider } from "@/components/finly/Provider/TavernProvider";
import { Footer } from "@/components/nav/Footer";
import { TopNav } from "@/components/nav/TopNav";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});
const cinzel = Cinzel({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Finly — финансы селлера на маркетплейсах",
};

function parseInitialTheme(value: string | undefined): Theme {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialTheme = parseInitialTheme(cookieStore.get("finly_theme")?.value);
  const initialTavern = cookieStore.get("finly_tavern")?.value === "true";
  const initialDarkClass = initialTheme === "dark" ? "dark" : "";
  const htmlClassName = [
    inter.variable,
    cinzel.variable,
    initialDarkClass,
    initialTavern ? "tavern" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="ru"
        className={htmlClassName}
        suppressHydrationWarning
      >
        <body className="bg-background text-foreground min-h-screen flex flex-col">
          <ConvexClientProvider>
            <ThemeProvider initialTheme={initialTheme}>
              <TavernProvider initialTavern={initialTavern}>
                <TopNav />
                <main className="max-w-screen-2xl mx-auto px-4 py-6 flex-1 w-full">
                  {children}
                </main>
                <Footer />
              </TavernProvider>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
