"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        <p>Convex не настроен. Запустите <code>npx convex dev</code> и проверьте NEXT_PUBLIC_CONVEX_URL.</p>
      </div>
    );
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
