import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { TopNav } from "@/components/nav/TopNav";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "MFA — Marketplace Finance Analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <ConvexClientProvider>
          <TopNav />
          <main className="max-w-screen-2xl mx-auto px-4 py-6">{children}</main>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
