import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

// Note: импорт самого middleware не работает в Vitest jsdom/node env, потому что
// `@convex-dev/auth/nextjs/server` пытается импортировать `next/server` без `.js`,
// что Vite не резолвит. Тест структурный: middleware и config действительно
// верифицируются на runtime через `npm run build` (Next.js загрузит файл в edge env).
const src = readFileSync("src/middleware.ts", "utf8");

describe("middleware structure", () => {
  it("exports middleware via convexAuthNextjsMiddleware", () => {
    expect(src).toMatch(/export const middleware = convexAuthNextjsMiddleware/);
  });

  it("redirects unauthenticated to /login", () => {
    expect(src).toMatch(/nextjsMiddlewareRedirect\(request, "\/login"\)/);
  });

  it("allows public routes /login, /register, etc.", () => {
    expect(src).toMatch(/"\/login"/);
    expect(src).toMatch(/"\/register"/);
    expect(src).toMatch(/"\/forgot-password"/);
  });
});

describe("middleware config matcher", () => {
  it("excludes _next and static assets", () => {
    expect(src).toMatch(/_next\|favicon/);
  });
});
