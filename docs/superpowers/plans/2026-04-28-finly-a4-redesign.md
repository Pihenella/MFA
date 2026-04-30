# Finly A.4 — Redesign «Карта Финли» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести Finly на бренд-систему «Карта Финли» (Murloc Tide палитра, Hearthstone-карточки в SaaS-теле, опциональный Tavern Mode, mascot-forward), редизайнить все страницы, добавить achievements, закрыть техдолг A.3 (AuthGate на 11 страницах). Цифры дашборда не должны измениться.

**Architecture:** Tailwind v4 семантические дизайн-токены в `globals.css` + namespace `src/components/finly/` поверх shadcn-примитивов. Light/dark/Tavern Mode персистятся в cookie + Convex `users.themePreference|tavernMode`. Achievements живут в `userAchievements` таблице с idempotent record-функцией; UI через provider-context. Маскот — 6 поз, SVG-плейсхолдеры от Claude → финальные WebP от GPT (см. промпты в спеке §6.3).

**Tech Stack:** Next.js 16, React 19, Convex 1.32, Tailwind v4, shadcn, vitest, @testing-library/react, recharts, @convex-dev/auth.

**Spec:** `docs/superpowers/specs/2026-04-28-finly-a4-redesign-design.md`

**Branch:** Продолжаем `mfa-a2-auth-ui` (PR #3) — A.4 коммитится сверху A.3. После закрытия A.4 PR #3 помечаем ready-for-review и мерджим как одно большое A.1+A.2+A.3+A.4 release.

**Convex deployment:** dev `energized-wolverine-691`. После каждого таска делать `npx convex deploy --yes` если затронуты `convex/*` файлы. Затем `git add && commit && push` (memory: `feedback_deploy_workflow.md`).

**Out of scope (см. спек §14):** финальные PNG-маскоты от GPT (Юрий генерит позже), полный маркетинговый лендинг, ESLint custom-rule, контент Privacy/Terms, push в Telegram-бот.

---

## File Map

**Создаются:**

```
src/components/finly/
  index.ts
  FinlyCard.tsx
  FinlyButton.tsx
  FinlyBadge.tsx
  FinlySection.tsx
  FinlyEmptyState.tsx
  FinlyMetricTile.tsx
  FinlyChartCard.tsx
  FinlyDataTable.tsx
  FinlyAuthLayout.tsx
  FinlyAchievementToast.tsx
  TavernToggle.tsx
  ThemeToggle.tsx
  MascotIllustration.tsx
  Provider/
    ThemeProvider.tsx
    TavernProvider.tsx
    SoundProvider.tsx
    AchievementProvider.tsx
  __tests__/
    FinlyCard.test.tsx
    FinlyButton.test.tsx
    FinlyMetricTile.test.tsx
    FinlyChartCard.test.tsx
    FinlyDataTable.test.tsx
    FinlyAuthLayout.test.tsx
    FinlyAchievementToast.test.tsx
    MascotIllustration.test.tsx
    ThemeProvider.test.tsx
    TavernProvider.test.tsx
    SoundProvider.test.tsx
    AchievementProvider.test.tsx

src/components/nav/
  Footer.tsx
  AvatarMenu.tsx

src/app/
  layout.tsx                 (modified)
  achievements/
    page.tsx
  legal/
    privacy/page.tsx
    terms/page.tsx
  not-found.tsx              (custom 404)
  __tests__/
    auth-gate-coverage.test.tsx

src/hooks/
  useTheme.ts
  useTavern.ts
  useSound.ts
  useAchievement.ts

public/mascot/
  nav-icon.svg
  hero.svg
  empty-shops.svg
  empty-data.svg
  achievement.svg
  not-found.svg

public/sounds/
  finly.ogg                  (placeholder — silent ogg)
  README.md                  (instructions for replacing)

convex/
  schema.ts                  (modified — themePreference, tavernMode, monthlyProfitGoal, userAchievements)
  users.ts                   (modified — current() returns new fields, add updateThemePreference, updateTavernMode)
  achievements.ts            (new — recordIfNew, newSinceLastSeen, markSeen, listAll)
  achievements.test.ts       (new)
```

**Модифицируются (страницы — обёртка в AuthGate, замена компонентов):**
- `src/app/page.tsx` (dashboard)
- `src/app/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `verify-email/page.tsx`, `pending-approval/page.tsx`, `rejected/page.tsx`
- `src/app/invite/[token]/page.tsx`
- `src/app/analytics/page.tsx`, `pulse/page.tsx`, `products/page.tsx`, `financials/page.tsx`, `prices/page.tsx`, `returns/page.tsx`, `feedbacks/page.tsx`, `settings/page.tsx`
- `src/app/admin/users/page.tsx`, `org/team/page.tsx`, `org/settings/page.tsx`
- `src/app/globals.css`
- `src/components/nav/TopNav.tsx`, `OrgSwitcher.tsx`
- `src/components/dashboard/*.tsx` (под Финли-токены)
- `src/components/auth/AuthGate.tsx` (loader использует токены)
- `src/lib/convex-refs.ts` (добавить refs для achievements + новых users-mutations)

**Удаляются:** ничего (примитивы shadcn остаются, дашборд `MetricCard.tsx` заменяется через `FinlyMetricTile`, но удалить можно после T18).

---

## Task 1: AuthGate coverage — обернуть 11 страниц + параметризированный тест

**Files:**
- Modify: `src/components/auth/AuthGate.tsx` (мелкий cleanup loader-стилей)
- Modify: `src/app/pulse/page.tsx`, `analytics/page.tsx`, `products/page.tsx`, `financials/page.tsx`, `feedbacks/page.tsx`, `returns/page.tsx`, `prices/page.tsx`, `settings/page.tsx`, `org/team/page.tsx`, `org/settings/page.tsx`, `admin/users/page.tsx`
- Test: `src/app/__tests__/auth-gate-coverage.test.tsx`

- [ ] **Step 1: Read all 11 page files и зафиксировать текущий entry-export**

Run: `grep -l 'export default' src/app/{pulse,analytics,products,financials,feedbacks,returns,prices,settings}/page.tsx src/app/{admin/users,org/team,org/settings}/page.tsx`

Каждая страница имеет `export default function NamePage() { ... }`. Цель: вынести содержимое в `NameContent`, обернуть в `<AuthGate>`.

- [ ] **Step 2: Написать failing-тест auth-gate-coverage**

Создаём `src/app/__tests__/auth-gate-coverage.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock useCurrentUser hook
const useCurrentUserMock = vi.fn();
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/test",
}));

// Mock convex hooks used inside content components
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

const PAGES = [
  { name: "pulse",         load: () => import("@/app/pulse/page") },
  { name: "analytics",     load: () => import("@/app/analytics/page") },
  { name: "products",      load: () => import("@/app/products/page") },
  { name: "financials",    load: () => import("@/app/financials/page") },
  { name: "feedbacks",     load: () => import("@/app/feedbacks/page") },
  { name: "returns",       load: () => import("@/app/returns/page") },
  { name: "prices",        load: () => import("@/app/prices/page") },
  { name: "settings",      load: () => import("@/app/settings/page") },
  { name: "org/team",      load: () => import("@/app/org/team/page") },
  { name: "org/settings",  load: () => import("@/app/org/settings/page") },
  { name: "admin/users",   load: () => import("@/app/admin/users/page") },
];

describe.each(PAGES)("AuthGate coverage: %s", ({ name, load }) => {
  beforeEach(() => {
    useCurrentUserMock.mockReset();
    replaceMock.mockReset();
  });

  it(`${name}: undefined user shows loader, no crash`, async () => {
    useCurrentUserMock.mockReturnValue(undefined);
    const Page = (await load()).default;
    render(<Page />);
    expect(screen.getByText(/загрузка/i)).toBeInTheDocument();
  });

  it(`${name}: pending user redirects to /pending-approval`, async () => {
    useCurrentUserMock.mockReturnValue({ _id: "u1", status: "pending" });
    const Page = (await load()).default;
    render(<Page />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/pending-approval"));
  });

  it(`${name}: null user redirects to /login`, async () => {
    useCurrentUserMock.mockReturnValue(null);
    const Page = (await load()).default;
    render(<Page />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });
});
```

- [ ] **Step 3: Run test — ожидаем FAIL**

Run: `npx vitest run src/app/__tests__/auth-gate-coverage.test.tsx`
Expected: FAIL — pending-юзер либо не редиректит, либо страницы крашат на `useQuery` (`ensureApproved` throw).

- [ ] **Step 4: Обернуть каждую страницу. Pattern:**

Для `src/app/pulse/page.tsx` (и каждой из 11 аналогично):

```tsx
"use client";
import { AuthGate } from "@/components/auth/AuthGate";
// ... остальные существующие импорты переезжают вниз в Content

export default function PulsePage() {
  return (
    <AuthGate>
      <PulseContent />
    </AuthGate>
  );
}

function PulseContent() {
  // ВСЁ существующее содержимое функции PulsePage переезжает сюда
}
```

Для каждой из 11 страниц повторить этот pattern: оригинальное `export default function XPage()` переименовать в `XContent` (или близкое имя) и сделать его НЕ default; новый `export default function XPage()` = `<AuthGate><XContent/></AuthGate>`.

- [ ] **Step 5: Обновить loader в AuthGate под токены (минимальный cleanup)**

Modify `src/components/auth/AuthGate.tsx:32-36`:

```tsx
if (user === undefined) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      Загрузка…
    </div>
  );
}
```

(`text-gray-400` → `text-muted-foreground`. После T2 этот класс будет резолвиться в наш `--color-scroll-faded`.)

- [ ] **Step 6: Run tests — ожидаем PASS**

Run: `npx vitest run src/app/__tests__/auth-gate-coverage.test.tsx`
Expected: 33 tests pass (3 × 11 pages).

- [ ] **Step 7: Run full test suite — никаких регрессий**

Run: `npm run test`
Expected: все существующие 115+ тестов и новые 33 зелёные.

- [ ] **Step 8: Commit**

```bash
git add src/app src/components/auth/AuthGate.tsx
git commit -m "$(cat <<'EOF'
fix(auth): wrap 11 pages in AuthGate (A.4 T1)

Closes А.3 tech-debt: pending users could crash on direct visit to
internal pages because useQuery → ensureApproved throw. Now every
page exports a thin Page wrapper that renders <AuthGate><Content/></AuthGate>.

Adds parametrized auth-gate-coverage test covering loading, pending,
and null states for all 11 pages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin mfa-a2-auth-ui
```

---

## Task 2: Design tokens — palette в globals.css

**Files:**
- Modify: `src/app/globals.css`
- Test: `src/app/__tests__/design-tokens.test.tsx`

- [ ] **Step 1: Failing-тест на наличие токенов**

Create `src/app/__tests__/design-tokens.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

describe("design tokens", () => {
  it.each([
    "--color-tavern-bg",
    "--color-tavern-surface",
    "--color-tavern-elevated",
    "--color-orange-flame",
    "--color-murloc-teal",
    "--color-gold-frame",
    "--color-scroll-ink",
    "--color-scroll-faded",
    "--color-rune-success",
    "--color-rune-danger",
    "--color-tide-glow",
  ])("declares %s in :root and .dark", (token) => {
    const rootSection = css.match(/:root\s*\{[^}]*\}/s)![0];
    const darkSection = css.match(/\.dark\s*\{[^}]*\}/s)![0];
    expect(rootSection).toContain(token);
    expect(darkSection).toContain(token);
  });

  it("re-binds primary to orange-flame", () => {
    expect(css).toMatch(/--primary:\s*var\(--color-orange-flame\)/);
  });

  it("declares --radius-frame and --radius-pill", () => {
    expect(css).toContain("--radius-frame");
    expect(css).toContain("--radius-pill");
  });
});
```

- [ ] **Step 2: Run test — ожидаем FAIL**

Run: `npx vitest run src/app/__tests__/design-tokens.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Переписать `src/app/globals.css`**

Replace полностью содержимое (новая палитра + перепривязка shadcn-токенов):

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));
@custom-variant tavern (&:is(.tavern *));

@theme inline {
  /* base shadcn vars (re-bound below) */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --font-display: var(--font-cinzel);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);

  /* Finly Murloc Tide tokens */
  --color-tavern-bg: var(--tavern-bg);
  --color-tavern-surface: var(--tavern-surface);
  --color-tavern-elevated: var(--tavern-elevated);
  --color-orange-flame: var(--orange-flame);
  --color-murloc-teal: var(--murloc-teal);
  --color-gold-frame: var(--gold-frame);
  --color-scroll-ink: var(--scroll-ink);
  --color-scroll-faded: var(--scroll-faded);
  --color-rune-success: var(--rune-success);
  --color-rune-danger: var(--rune-danger);
  --color-tide-glow: var(--tide-glow);

  /* radii */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-frame: var(--radius-frame-val);
  --radius-pill: 9999px;

  /* motion */
  --ease-tilt: cubic-bezier(0.2, 0.9, 0.3, 1);
  --ease-rune: cubic-bezier(0.4, 0, 0.2, 1);
}

:root {
  --radius: 0.5rem;
  --radius-frame-val: 0.25rem;

  /* Finly Murloc Tide — light */
  --tavern-bg: oklch(0.97 0.02 90);
  --tavern-surface: oklch(0.99 0.01 90);
  --tavern-elevated: oklch(1 0 0);
  --orange-flame: #f97316;
  --murloc-teal: #2c8a92;
  --gold-frame: #b8881e;
  --scroll-ink: #1a1208;
  --scroll-faded: #6a5a3c;
  --rune-success: #2e8b57;
  --rune-danger: #c0392b;
  --tide-glow: rgba(44, 138, 146, 0.25);

  /* shadcn re-bindings (light) */
  --background: var(--tavern-bg);
  --foreground: var(--scroll-ink);
  --card: var(--tavern-surface);
  --card-foreground: var(--scroll-ink);
  --popover: var(--tavern-elevated);
  --popover-foreground: var(--scroll-ink);
  --primary: var(--orange-flame);
  --primary-foreground: oklch(1 0 0);
  --secondary: var(--murloc-teal);
  --secondary-foreground: oklch(1 0 0);
  --muted: var(--tavern-surface);
  --muted-foreground: var(--scroll-faded);
  --accent: var(--murloc-teal);
  --accent-foreground: oklch(1 0 0);
  --destructive: var(--rune-danger);
  --border: color-mix(in oklch, var(--gold-frame) 30%, transparent);
  --input: color-mix(in oklch, var(--gold-frame) 30%, transparent);
  --ring: var(--murloc-teal);
  --chart-1: var(--orange-flame);
  --chart-2: var(--murloc-teal);
  --chart-3: var(--gold-frame);
  --chart-4: var(--rune-success);
  --chart-5: var(--rune-danger);
  --sidebar: var(--tavern-surface);
  --sidebar-foreground: var(--scroll-ink);
  --sidebar-primary: var(--orange-flame);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: var(--tavern-bg);
  --sidebar-accent-foreground: var(--scroll-ink);
  --sidebar-border: color-mix(in oklch, var(--gold-frame) 30%, transparent);
  --sidebar-ring: var(--murloc-teal);
}

.dark {
  /* Finly Murloc Tide — dark */
  --tavern-bg: oklch(0.10 0.04 220);
  --tavern-surface: oklch(0.16 0.05 215);
  --tavern-elevated: oklch(0.22 0.06 210);
  --orange-flame: #ff8a3d;
  --murloc-teal: #3bb0b8;
  --gold-frame: #d4a93a;
  --scroll-ink: #f5e9c4;
  --scroll-faded: #a99770;
  --rune-success: #4cc080;
  --rune-danger: #e85a4a;
  --tide-glow: rgba(44, 138, 146, 0.4);

  --background: var(--tavern-bg);
  --foreground: var(--scroll-ink);
  --card: var(--tavern-surface);
  --card-foreground: var(--scroll-ink);
  --popover: var(--tavern-elevated);
  --popover-foreground: var(--scroll-ink);
  --primary: var(--orange-flame);
  --primary-foreground: oklch(0.10 0.04 220);
  --secondary: var(--murloc-teal);
  --secondary-foreground: oklch(0.10 0.04 220);
  --muted: var(--tavern-surface);
  --muted-foreground: var(--scroll-faded);
  --accent: var(--murloc-teal);
  --accent-foreground: oklch(0.10 0.04 220);
  --destructive: var(--rune-danger);
  --border: color-mix(in oklch, var(--gold-frame) 40%, transparent);
  --input: color-mix(in oklch, var(--gold-frame) 40%, transparent);
  --ring: var(--murloc-teal);
  --chart-1: var(--orange-flame);
  --chart-2: var(--murloc-teal);
  --chart-3: var(--gold-frame);
  --chart-4: var(--rune-success);
  --chart-5: var(--rune-danger);
  --sidebar: var(--tavern-surface);
  --sidebar-foreground: var(--scroll-ink);
  --sidebar-primary: var(--orange-flame);
  --sidebar-primary-foreground: oklch(0.10 0.04 220);
  --sidebar-accent: var(--tavern-bg);
  --sidebar-accent-foreground: var(--scroll-ink);
  --sidebar-border: color-mix(in oklch, var(--gold-frame) 40%, transparent);
  --sidebar-ring: var(--murloc-teal);
}

/* Tavern Mode — additional CSS rules */
.tavern .finly-card-interactive,
.tavern .finly-button-primary {
  animation: tide-shimmer 5s ease-in-out infinite;
}
.tavern .finly-metric-tile:hover {
  transform: perspective(800px) rotateX(3deg) rotateY(-3deg) translateZ(0);
}

@keyframes tide-shimmer {
  0%, 100% { box-shadow: 0 0 0 1px var(--murloc-teal), 0 4px 16px var(--tide-glow); }
  50%      { box-shadow: 0 0 0 1px var(--murloc-teal), 0 8px 32px var(--tide-glow); }
}

/* Achievement toast slide-in */
@keyframes achievement-enter {
  0%   { opacity: 0; transform: translateY(-12px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans), system-ui, sans-serif;
  }

  /* prefers-reduced-motion: убиваем все анимации */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0ms !important;
      transition-duration: 0ms !important;
    }
    .tavern .finly-metric-tile:hover {
      transform: none !important;
    }
  }
}
```

- [ ] **Step 4: Run test — ожидаем PASS**

Run: `npx vitest run src/app/__tests__/design-tokens.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run build чтобы убедиться что Tailwind v4 принимает синтаксис**

Run: `npm run build`
Expected: build succeeds. Если ошибка про `color-mix` или `oklch` — обернуть в `@supports` (но Tailwind v4 + Next 16 их поддерживает на baseline).

- [ ] **Step 6: Run typecheck + полные тесты**

Run: `npm run typecheck && npm run test`
Expected: всё зелёное.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/__tests__/design-tokens.test.tsx
git commit -m "feat(theme): Murloc Tide design tokens + Tavern variant (A.4 T2)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin mfa-a2-auth-ui
```

---

## Task 3: Cinzel display font + layout wiring

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Подключить Cinzel через next/font/google**

Edit `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="ru" className={`${inter.variable} ${cinzel.variable}`}>
        <body className="bg-background text-foreground min-h-screen flex flex-col">
          <ConvexClientProvider>
            <TopNav />
            <main className="max-w-screen-2xl mx-auto px-4 py-6 flex-1 w-full">{children}</main>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
```

(Footer + Provider-wrapping добавим в T15/T6/T7. Сейчас только шрифты + flex-чейн для будущего footer.)

- [ ] **Step 2: Verify Cinzel доступен через утилиту `font-display`**

Add to `src/app/__tests__/design-tokens.test.tsx` (новый describe-блок):

```tsx
describe("typography", () => {
  it("layout.tsx wires Inter + Cinzel via next/font", () => {
    const layout = fs.readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain('Cinzel');
    expect(layout).toContain('--font-cinzel');
    expect(layout).toContain('--font-inter');
  });
});
```

- [ ] **Step 3: Run tests + build**

```bash
npm run test
npm run build
```

Expected: oба зелёные. Build качает шрифт от Google в кеш.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/__tests__/design-tokens.test.tsx
git commit -m "feat(theme): wire Inter + Cinzel via next/font (A.4 T3)"
git push origin mfa-a2-auth-ui
```

---

## Task 4: Convex schema delta — themePreference, tavernMode, monthlyProfitGoal, userAchievements

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Добавить новые поля в `users` и новую таблицу `userAchievements`**

Edit `convex/schema.ts`. В блоке `users: defineTable({ ... })` добавить перед закрывающей `})`:

```ts
    themePreference: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    tavernMode: v.optional(v.boolean()),
    monthlyProfitGoal: v.optional(v.number()),
```

Добавить новую таблицу (после `users.....index("by_status", ["status"]),` и перед `organizations:`):

```ts
  userAchievements: defineTable({
    userId: v.id("users"),
    kind: v.union(
      v.literal("firstShop"),
      v.literal("firstThousandSales"),
      v.literal("monthlyPlanHit"),
      v.literal("firstMillionProfit"),
      v.literal("tenKSold"),
      v.literal("zeroReturnsWeek"),
      v.literal("firstReviewFiveStar"),
      v.literal("storeAnniversary")
    ),
    achievedAt: v.number(),
    payload: v.optional(v.any()),
    seenAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_kind", ["userId", "kind"])
    .index("by_user_unseen", ["userId", "seenAt"]),
```

- [ ] **Step 2: Деплой схемы на dev**

Run: `npx convex deploy --yes`
Expected: schema applied without migration errors. Existing users получают `undefined` для новых полей.

- [ ] **Step 3: Verify через Convex dashboard или CLI**

Run: `npx convex run "users:current" '{}' 2>&1 | head -5` (если есть авторизованная сессия) или просто проверить, что deploy прошёл без warning о breaking change.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(convex): schema delta for theme/tavern/achievements (A.4 T4)"
git push origin mfa-a2-auth-ui
```

---

## Task 5: User mutations + convex-refs — updateThemePreference, updateTavernMode, expose new fields in current()

**Files:**
- Modify: `convex/users.ts`
- Modify: `src/lib/convex-refs.ts`

- [ ] **Step 1: Добавить мутации в `convex/users.ts`**

Append to `convex/users.ts`:

```ts
import { mutation } from "./_generated/server";

export const updateThemePreference = mutation({
  args: {
    themePreference: v.union(
      v.literal("light"),
      v.literal("dark"),
      v.literal("system")
    ),
  },
  handler: async (ctx, { themePreference }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    await ctx.db.patch(userId, { themePreference });
  },
});

export const updateTavernMode = mutation({
  args: { tavernMode: v.boolean() },
  handler: async (ctx, { tavernMode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    await ctx.db.patch(userId, { tavernMode });
  },
});

export const updateMonthlyProfitGoal = mutation({
  args: { monthlyProfitGoal: v.union(v.number(), v.null()) },
  handler: async (ctx, { monthlyProfitGoal }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    if (monthlyProfitGoal === null) {
      await ctx.db.patch(userId, { monthlyProfitGoal: undefined });
    } else {
      await ctx.db.patch(userId, { monthlyProfitGoal });
    }
  },
});
```

Также не забудь импортировать `v` сверху если ещё нет:
```ts
import { v } from "convex/values";
```

- [ ] **Step 2: Расширить `current()` query для отдачи новых полей**

Modify `current` handler — добавить три новых поля в return:

```ts
    return {
      _id: user._id,
      email: user.email ?? "",
      // ... все существующие поля
      themePreference: user.themePreference ?? "system" as const,
      tavernMode: user.tavernMode ?? false,
      monthlyProfitGoal: user.monthlyProfitGoal ?? null,
    };
```

- [ ] **Step 3: Добавить refs в `src/lib/convex-refs.ts`**

Append к разделу users:

```ts
export const usersUpdateThemePreferenceRef = "users:updateThemePreference" as unknown as Mut<
  { themePreference: "light" | "dark" | "system" }
>;
export const usersUpdateTavernModeRef = "users:updateTavernMode" as unknown as Mut<
  { tavernMode: boolean }
>;
export const usersUpdateMonthlyProfitGoalRef = "users:updateMonthlyProfitGoal" as unknown as Mut<
  { monthlyProfitGoal: number | null }
>;
```

И обновить тип `CurrentUser` (если он в этом файле или в convex-api.ts), чтобы отражал новые поля.

- [ ] **Step 4: Deploy**

Run: `npx convex deploy --yes`
Expected: mutations registered, no errors.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Если падает на CurrentUser — обновить тип в convex-refs / convex-api.

- [ ] **Step 6: Commit**

```bash
git add convex/users.ts src/lib/convex-refs.ts
git commit -m "feat(convex): users.updateThemePreference + updateTavernMode + monthlyProfitGoal (A.4 T5)"
git push origin mfa-a2-auth-ui
```

---

## Task 6: ThemeProvider + ThemeToggle + cookie sync

**Files:**
- Create: `src/components/finly/Provider/ThemeProvider.tsx`
- Create: `src/components/finly/ThemeToggle.tsx`
- Create: `src/hooks/useTheme.ts`
- Create: `src/components/finly/__tests__/ThemeProvider.test.tsx`
- Modify: `src/app/layout.tsx` (читать cookie на сервере, прокинуть initial)

- [ ] **Step 1: Failing-тест ThemeProvider — cookie persistence**

Create `src/components/finly/__tests__/ThemeProvider.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import "@testing-library/jest-dom/vitest";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue(undefined),
  useQuery: () => undefined,
}));

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("light")}>light</button>
      <button onClick={() => setTheme("system")}>system</button>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.cookie = "finly_theme=; max-age=0";
  });

  it("defaults to system", () => {
    render(<ThemeProvider initialTheme="system"><Probe /></ThemeProvider>);
    expect(screen.getByTestId("theme")).toHaveTextContent("system");
  });

  it("setTheme('dark') adds dark class on html", () => {
    render(<ThemeProvider initialTheme="system"><Probe /></ThemeProvider>);
    act(() => screen.getByText("dark").click());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("setTheme('light') removes dark class", () => {
    render(<ThemeProvider initialTheme="dark"><Probe /></ThemeProvider>);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    act(() => screen.getByText("light").click());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists theme to cookie", () => {
    render(<ThemeProvider initialTheme="system"><Probe /></ThemeProvider>);
    act(() => screen.getByText("dark").click());
    expect(document.cookie).toContain("finly_theme=dark");
  });
});
```

- [ ] **Step 2: Run test — ожидаем FAIL (модулей нет)**

Run: `npx vitest run src/components/finly/__tests__/ThemeProvider.test.tsx`
Expected: FAIL — `Cannot find module @/hooks/useTheme`.

- [ ] **Step 3: Создать `src/components/finly/Provider/ThemeProvider.tsx`**

```tsx
"use client";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { usersUpdateThemePreferenceRef, usersCurrentRef } from "@/lib/convex-refs";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const COOKIE = "finly_theme";

function setCookie(value: Theme) {
  document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  let resolved: "light" | "dark";
  if (t === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } else {
    resolved = t;
  }
  root.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(
    initialTheme === "dark" ? "dark" : "light"
  );

  const updateOnServer = useMutation(usersUpdateThemePreferenceRef);
  const me = useQuery(usersCurrentRef);

  // Apply on every theme change
  useEffect(() => {
    const r = applyTheme(theme);
    setResolved(r);
  }, [theme]);

  // Listen to system preference changes when theme=system
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(applyTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Sync cookie ↔ Convex on login
  useEffect(() => {
    if (!me) return;
    if (me.themePreference && me.themePreference !== theme) {
      setThemeState(me.themePreference);
      setCookie(me.themePreference);
    }
  }, [me, theme]);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      setCookie(t);
      if (me) updateOnServer({ themePreference: t }).catch(() => { /* offline ok */ });
    },
    [me, updateOnServer]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

- [ ] **Step 4: Создать `src/hooks/useTheme.ts`**

```ts
"use client";
import { useContext } from "react";
import { ThemeContext, ThemeProvider } from "@/components/finly/Provider/ThemeProvider";

export { ThemeProvider };

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
```

- [ ] **Step 5: Run test — PASS**

Run: `npx vitest run src/components/finly/__tests__/ThemeProvider.test.tsx`
Expected: PASS.

- [ ] **Step 6: Создать `src/components/finly/ThemeToggle.tsx`**

```tsx
"use client";
import { Sun, Moon, MonitorCog } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const buttons: Array<{ value: "light" | "dark" | "system"; icon: typeof Sun; label: string }> = [
    { value: "light",  icon: Sun,        label: "Light theme" },
    { value: "dark",   icon: Moon,       label: "Dark theme" },
    { value: "system", icon: MonitorCog, label: "System theme" },
  ];
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      {buttons.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={`p-1.5 rounded-sm transition-colors ${
            theme === value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Server-side initial theme in layout.tsx**

Modify `src/app/layout.tsx`:

```tsx
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/finly/Provider/ThemeProvider";

// ... existing imports

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialTheme = (cookieStore.get("finly_theme")?.value ?? "system") as
    | "light" | "dark" | "system";
  const initialDarkClass = initialTheme === "dark" ? "dark" : "";

  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="ru" className={`${inter.variable} ${cinzel.variable} ${initialDarkClass}`}>
        <body className="bg-background text-foreground min-h-screen flex flex-col">
          <ConvexClientProvider>
            <ThemeProvider initialTheme={initialTheme}>
              <TopNav />
              <main className="max-w-screen-2xl mx-auto px-4 py-6 flex-1 w-full">{children}</main>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
```

(`async` для cookies() — Next 15+/16 требует.)

- [ ] **Step 8: Run tests + build**

```bash
npm run test
npm run build
```

Expected: всё зелёное.

- [ ] **Step 9: Commit**

```bash
git add src/components/finly src/hooks/useTheme.ts src/app/layout.tsx
git commit -m "feat(theme): ThemeProvider + ThemeToggle + cookie+Convex sync (A.4 T6)"
git push origin mfa-a2-auth-ui
```

---

## Task 7: TavernProvider + TavernToggle

**Files:**
- Create: `src/components/finly/Provider/TavernProvider.tsx`
- Create: `src/components/finly/TavernToggle.tsx`
- Create: `src/hooks/useTavern.ts`
- Create: `src/components/finly/__tests__/TavernProvider.test.tsx`
- Modify: `src/app/layout.tsx`

Структура и паттерн идентичны T6, но для `tavernMode: boolean` и cookie `finly_tavern`. Класс `tavern` ставится на `<html>`.

- [ ] **Step 1: Failing-test TavernProvider**

Create `src/components/finly/__tests__/TavernProvider.test.tsx` (по образцу T6 step 1, но проверяем класс `tavern` и cookie `finly_tavern`):

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { TavernProvider, useTavern } from "@/hooks/useTavern";
import "@testing-library/jest-dom/vitest";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue(undefined),
  useQuery: () => undefined,
}));

function Probe() {
  const { tavern, setTavern } = useTavern();
  return (
    <>
      <span data-testid="tavern">{tavern ? "on" : "off"}</span>
      <button onClick={() => setTavern(!tavern)}>toggle</button>
    </>
  );
}

describe("TavernProvider", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.cookie = "finly_tavern=; max-age=0";
  });

  it("defaults to off", () => {
    render(<TavernProvider initialTavern={false}><Probe /></TavernProvider>);
    expect(screen.getByTestId("tavern")).toHaveTextContent("off");
    expect(document.documentElement.classList.contains("tavern")).toBe(false);
  });

  it("toggle on adds tavern class", () => {
    render(<TavernProvider initialTavern={false}><Probe /></TavernProvider>);
    act(() => screen.getByText("toggle").click());
    expect(document.documentElement.classList.contains("tavern")).toBe(true);
    expect(document.cookie).toContain("finly_tavern=true");
  });
});
```

- [ ] **Step 2: Run — FAIL.**

Run: `npx vitest run src/components/finly/__tests__/TavernProvider.test.tsx`

- [ ] **Step 3: Создать `src/components/finly/Provider/TavernProvider.tsx`**

```tsx
"use client";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { usersUpdateTavernModeRef, usersCurrentRef } from "@/lib/convex-refs";

export interface TavernContextValue {
  tavern: boolean;
  setTavern: (v: boolean) => void;
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
  children: React.ReactNode;
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
    if (typeof me.tavernMode === "boolean" && me.tavernMode !== tavern) {
      setTavernState(me.tavernMode);
      setCookie(me.tavernMode);
    }
  }, [me, tavern]);

  const setTavern = useCallback(
    (v: boolean) => {
      setTavernState(v);
      setCookie(v);
      if (me) updateOnServer({ tavernMode: v }).catch(() => { /* offline */ });
    },
    [me, updateOnServer]
  );

  const value = useMemo(() => ({ tavern, setTavern }), [tavern, setTavern]);
  return <TavernContext.Provider value={value}>{children}</TavernContext.Provider>;
}
```

- [ ] **Step 4: Создать `src/hooks/useTavern.ts`**

```ts
"use client";
import { useContext } from "react";
import { TavernContext, TavernProvider } from "@/components/finly/Provider/TavernProvider";

export { TavernProvider };

export function useTavern() {
  const ctx = useContext(TavernContext);
  if (!ctx) throw new Error("useTavern must be used inside <TavernProvider>");
  return ctx;
}
```

- [ ] **Step 5: Создать `src/components/finly/TavernToggle.tsx`**

```tsx
"use client";
import { useTavern } from "@/hooks/useTavern";

export function TavernToggle() {
  const { tavern, setTavern } = useTavern();
  return (
    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-frame border border-border bg-card">
      <input
        type="checkbox"
        checked={tavern}
        onChange={(e) => setTavern(e.target.checked)}
        className="mt-1 accent-primary"
        aria-label="Включить режим таверны"
      />
      <div>
        <div className="font-display text-base text-foreground">🍺 Включить режим таверны</div>
        <p className="text-sm text-muted-foreground mt-1">
          Фоновое мерцание карточек, звуки клика, повышенная анимация при наведении.
          На ваши данные не влияет — только визуал. По умолчанию выключен.
        </p>
      </div>
    </label>
  );
}
```

- [ ] **Step 6: Wire в `layout.tsx`**

```tsx
const initialTavern = cookieStore.get("finly_tavern")?.value === "true";

// inside JSX:
<ThemeProvider initialTheme={initialTheme}>
  <TavernProvider initialTavern={initialTavern}>
    <TopNav />
    <main className="...">{children}</main>
  </TavernProvider>
</ThemeProvider>
```

И добавь `${initialTavern ? "tavern" : ""}` в `<html className>`.

- [ ] **Step 7: Tests + build**

```bash
npm run test && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/components/finly src/hooks/useTavern.ts src/app/layout.tsx
git commit -m "feat(theme): TavernProvider + TavernToggle (A.4 T7)"
git push origin mfa-a2-auth-ui
```

---

## Task 8: Mascot SVG placeholders (6 files)

**Files:**
- Create: `public/mascot/{nav-icon,hero,empty-shops,empty-data,achievement,not-found}.svg`

Я хэндкрафчу простых стилизованных мурлок-исследователей. Цель — placeholder, который не стыдно показать. После получения PNG от GPT — ты подменяешь.

- [ ] **Step 1: Создать `public/mascot/nav-icon.svg`**

```svg
<?xml version="1.0" encoding="UTF-8"?>
<!-- TODO: replace with GPT-generated PNG (see docs/superpowers/specs/2026-04-28-finly-a4-redesign-design.md §6.3) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <!-- helmet glow -->
  <circle cx="16" cy="9" r="5" fill="#d4a93a"/>
  <circle cx="16" cy="9" r="3" fill="#fff8d6"/>
  <!-- head -->
  <ellipse cx="16" cy="18" rx="9" ry="8" fill="#2c8a92"/>
  <ellipse cx="16" cy="20" rx="6" ry="3" fill="#a4d8d6"/>
  <!-- top fin -->
  <path d="M16 6 L13 2 L16 4 L19 2 Z" fill="#1f6a72"/>
  <!-- eyes -->
  <circle cx="13" cy="17" r="1.4" fill="#1a1208"/>
  <circle cx="19" cy="17" r="1.4" fill="#1a1208"/>
  <circle cx="13.4" cy="16.7" r="0.4" fill="#fff"/>
  <circle cx="19.4" cy="16.7" r="0.4" fill="#fff"/>
  <!-- mouth -->
  <path d="M12 21 Q16 24 20 21" stroke="#1a1208" stroke-width="1" fill="none" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Создать `public/mascot/hero.svg`** (320×320, в полный рост, исследователь со свитком)

```svg
<?xml version="1.0" encoding="UTF-8"?>
<!-- TODO: replace with GPT-generated PNG (see spec §6.3) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" fill="none" aria-hidden="true">
  <!-- ground shadow -->
  <ellipse cx="160" cy="290" rx="80" ry="10" fill="#1a1208" opacity="0.15"/>
  <!-- body -->
  <ellipse cx="160" cy="220" rx="60" ry="55" fill="#2c8a92"/>
  <!-- belly -->
  <ellipse cx="160" cy="230" rx="40" ry="35" fill="#a4d8d6"/>
  <!-- vest -->
  <path d="M120 195 Q160 215 200 195 L200 250 Q160 270 120 250 Z" fill="#6b4e1c" opacity="0.85"/>
  <!-- buckle -->
  <rect x="155" y="225" width="10" height="14" fill="#d4a93a" rx="1"/>
  <!-- head -->
  <ellipse cx="160" cy="120" rx="55" ry="50" fill="#2c8a92"/>
  <ellipse cx="160" cy="135" rx="35" ry="20" fill="#a4d8d6"/>
  <!-- top fin -->
  <path d="M160 70 L140 30 L160 50 L180 30 Z" fill="#1f6a72"/>
  <!-- side fins -->
  <path d="M105 120 L80 140 L105 145 Z" fill="#1f6a72"/>
  <path d="M215 120 L240 140 L215 145 Z" fill="#1f6a72"/>
  <!-- helmet lamp -->
  <circle cx="160" cy="80" r="14" fill="#d4a93a"/>
  <circle cx="160" cy="80" r="9"  fill="#fff8d6"/>
  <rect x="155" y="65" width="10" height="20" fill="#6b4e1c"/>
  <!-- eyes -->
  <circle cx="140" cy="115" r="6" fill="#1a1208"/>
  <circle cx="180" cy="115" r="6" fill="#1a1208"/>
  <circle cx="142" cy="113" r="2" fill="#fff"/>
  <circle cx="182" cy="113" r="2" fill="#fff"/>
  <!-- mouth -->
  <path d="M140 145 Q160 158 180 145" stroke="#1a1208" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- scroll in hands -->
  <rect x="100" y="180" width="120" height="40" fill="#faf6ec" stroke="#b8881e" stroke-width="2" rx="3"/>
  <line x1="115" y1="190" x2="205" y2="190" stroke="#1a1208" stroke-width="1" opacity="0.6"/>
  <line x1="115" y1="200" x2="195" y2="200" stroke="#1a1208" stroke-width="1" opacity="0.6"/>
  <line x1="115" y1="210" x2="200" y2="210" stroke="#1a1208" stroke-width="1" opacity="0.6"/>
  <!-- arms holding scroll -->
  <ellipse cx="105" cy="200" rx="12" ry="22" fill="#2c8a92" transform="rotate(20 105 200)"/>
  <ellipse cx="215" cy="200" rx="12" ry="22" fill="#2c8a92" transform="rotate(-20 215 200)"/>
  <!-- accent gold sparkle -->
  <circle cx="50" cy="60" r="3" fill="#f97316"/>
  <circle cx="270" cy="100" r="2" fill="#d4a93a"/>
  <circle cx="280" cy="200" r="2.5" fill="#f97316"/>
</svg>
```

- [ ] **Step 3: Создать `public/mascot/empty-shops.svg`** (200×200, чешет затылок над пустым сундуком)

```svg
<?xml version="1.0" encoding="UTF-8"?>
<!-- TODO: replace with GPT-generated PNG (see spec §6.3) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">
  <ellipse cx="100" cy="180" rx="55" ry="6" fill="#1a1208" opacity="0.15"/>
  <!-- empty chest -->
  <rect x="55" y="130" width="90" height="40" fill="#6b4e1c" stroke="#3a2810" stroke-width="2" rx="3"/>
  <rect x="55" y="120" width="90" height="14" fill="#8a6630" stroke="#3a2810" stroke-width="2" rx="3"/>
  <rect x="95" y="142" width="10" height="6" fill="#d4a93a" rx="1"/>
  <!-- inside dark -->
  <rect x="60" y="135" width="80" height="32" fill="#0a1822"/>
  <!-- mascot small -->
  <ellipse cx="100" cy="80" rx="38" ry="35" fill="#2c8a92"/>
  <ellipse cx="100" cy="92" rx="22" ry="14" fill="#a4d8d6"/>
  <path d="M100 45 L90 25 L100 35 L110 25 Z" fill="#1f6a72"/>
  <circle cx="88" cy="78" r="4" fill="#1a1208"/>
  <circle cx="112" cy="78" r="4" fill="#1a1208"/>
  <path d="M88 100 Q100 108 112 100" stroke="#1a1208" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- arm scratching -->
  <ellipse cx="135" cy="55" rx="8" ry="18" fill="#2c8a92" transform="rotate(40 135 55)"/>
  <!-- question marks -->
  <text x="150" y="40" font-family="Georgia,serif" font-size="22" fill="#f97316">?</text>
  <text x="40"  y="50" font-family="Georgia,serif" font-size="16" fill="#d4a93a">?</text>
</svg>
```

- [ ] **Step 4: Создать `public/mascot/empty-data.svg`** (200×200, изучает свиток через монокль)

```svg
<?xml version="1.0" encoding="UTF-8"?>
<!-- TODO: replace with GPT-generated PNG (see spec §6.3) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">
  <ellipse cx="100" cy="180" rx="55" ry="6" fill="#1a1208" opacity="0.15"/>
  <!-- scroll -->
  <rect x="40" y="100" width="120" height="60" fill="#faf6ec" stroke="#b8881e" stroke-width="2" rx="3"/>
  <line x1="55" y1="115" x2="145" y2="115" stroke="#1a1208" stroke-width="1" opacity="0.5"/>
  <line x1="55" y1="125" x2="135" y2="125" stroke="#1a1208" stroke-width="1" opacity="0.5"/>
  <line x1="55" y1="135" x2="145" y2="135" stroke="#1a1208" stroke-width="1" opacity="0.5"/>
  <line x1="55" y1="145" x2="125" y2="145" stroke="#1a1208" stroke-width="1" opacity="0.5"/>
  <!-- mascot head -->
  <ellipse cx="100" cy="65" rx="38" ry="35" fill="#2c8a92"/>
  <ellipse cx="100" cy="76" rx="22" ry="14" fill="#a4d8d6"/>
  <path d="M100 30 L90 10 L100 20 L110 10 Z" fill="#1f6a72"/>
  <!-- monocle -->
  <circle cx="115" cy="63" r="11" stroke="#d4a93a" stroke-width="2.5" fill="none"/>
  <circle cx="115" cy="63" r="9" fill="#a4d8d6" opacity="0.4"/>
  <circle cx="115" cy="63" r="3" fill="#1a1208"/>
  <line x1="125" y1="70" x2="135" y2="80" stroke="#d4a93a" stroke-width="1.5"/>
  <!-- other eye -->
  <circle cx="85" cy="63" r="3" fill="#1a1208"/>
  <!-- mouth -->
  <path d="M88 84 Q100 88 110 84" stroke="#1a1208" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 5: Создать `public/mascot/achievement.svg`** (80×80, поднимает кубок)

```svg
<?xml version="1.0" encoding="UTF-8"?>
<!-- TODO: replace with GPT-generated PNG (see spec §6.3) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none" aria-hidden="true">
  <!-- gold burst -->
  <circle cx="40" cy="40" r="36" fill="#d4a93a" opacity="0.15"/>
  <!-- mascot small -->
  <ellipse cx="40" cy="50" rx="20" ry="18" fill="#2c8a92"/>
  <ellipse cx="40" cy="56" rx="11" ry="7" fill="#a4d8d6"/>
  <path d="M40 35 L35 24 L40 30 L45 24 Z" fill="#1f6a72"/>
  <circle cx="34" cy="49" r="2.2" fill="#1a1208"/>
  <circle cx="46" cy="49" r="2.2" fill="#1a1208"/>
  <path d="M34 60 Q40 64 46 60" stroke="#1a1208" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- arm raised -->
  <ellipse cx="56" cy="35" rx="5" ry="10" fill="#2c8a92" transform="rotate(30 56 35)"/>
  <!-- chalice -->
  <path d="M57 18 L67 18 L65 28 Q62 32 59 28 Z" fill="#d4a93a" stroke="#8a6818" stroke-width="1.5"/>
  <rect x="60" y="29" width="4" height="6" fill="#8a6818"/>
  <ellipse cx="62" cy="36" rx="6" ry="2" fill="#d4a93a"/>
  <!-- sparkles -->
  <circle cx="20" cy="20" r="2" fill="#f97316"/>
  <circle cx="62" cy="10" r="1.5" fill="#d4a93a"/>
  <circle cx="72" cy="28" r="1.5" fill="#d4a93a"/>
</svg>
```

- [ ] **Step 6: Создать `public/mascot/not-found.svg`** (240×240, перевёрнутая карта + компас)

```svg
<?xml version="1.0" encoding="UTF-8"?>
<!-- TODO: replace with GPT-generated PNG (see spec §6.3) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none" aria-hidden="true">
  <ellipse cx="120" cy="220" rx="65" ry="7" fill="#1a1208" opacity="0.15"/>
  <!-- map upside-down -->
  <g transform="rotate(180 120 160)">
    <rect x="60" y="135" width="120" height="50" fill="#faf6ec" stroke="#b8881e" stroke-width="2" rx="3"/>
    <path d="M75 165 Q95 150 115 160 Q135 168 165 155" stroke="#c0392b" stroke-width="1.5" stroke-dasharray="4 3" fill="none"/>
    <circle cx="75" cy="165" r="3" fill="#c0392b"/>
    <text x="160" y="178" font-family="Georgia,serif" font-size="9" fill="#1a1208">??</text>
  </g>
  <!-- mascot -->
  <ellipse cx="120" cy="95" rx="40" ry="38" fill="#2c8a92"/>
  <ellipse cx="120" cy="108" rx="24" ry="14" fill="#a4d8d6"/>
  <path d="M120 55 L108 30 L120 44 L132 30 Z" fill="#1f6a72"/>
  <circle cx="108" cy="92" r="4" fill="#1a1208"/>
  <circle cx="132" cy="92" r="4" fill="#1a1208"/>
  <path d="M108 115 Q120 117 132 115" stroke="#1a1208" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- compass in hand -->
  <circle cx="160" cy="135" r="13" fill="#d4a93a" stroke="#8a6818" stroke-width="2"/>
  <circle cx="160" cy="135" r="9" fill="#faf6ec"/>
  <path d="M160 128 L162 135 L160 142 L158 135 Z" fill="#c0392b"/>
  <!-- exclamation -->
  <text x="180" y="60" font-family="Georgia,serif" font-size="32" fill="#f97316">!?</text>
</svg>
```

- [ ] **Step 7: Verify все 6 файлов на месте**

Run: `ls public/mascot/`
Expected output:
```
achievement.svg  empty-data.svg  empty-shops.svg  hero.svg  nav-icon.svg  not-found.svg
```

- [ ] **Step 8: Commit**

```bash
git add public/mascot
git commit -m "feat(brand): mascot SVG placeholders × 6 (A.4 T8)

Hand-crafted murloc-explorer placeholders for nav-icon, hero, empty-shops,
empty-data, achievement, not-found poses. Each file has a TODO comment
referencing the GPT-prompt spec for replacement with final WebP assets.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin mfa-a2-auth-ui
```

---

## Task 9: MascotIllustration component

**Files:**
- Create: `src/components/finly/MascotIllustration.tsx`
- Create: `src/components/finly/__tests__/MascotIllustration.test.tsx`

- [ ] **Step 1: Failing-test**

Create `src/components/finly/__tests__/MascotIllustration.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MascotIllustration } from "@/components/finly/MascotIllustration";

describe("MascotIllustration", () => {
  it("renders <picture> with webp source and svg fallback", () => {
    const { container } = render(<MascotIllustration pose="hero" size={320} alt="Hero mascot" />);
    const picture = container.querySelector("picture");
    expect(picture).toBeTruthy();
    const source = picture?.querySelector("source");
    expect(source?.getAttribute("srcset")).toContain("/mascot/hero.webp");
    const img = picture?.querySelector("img");
    expect(img?.getAttribute("src")).toContain("/mascot/hero.svg");
    expect(img?.getAttribute("alt")).toBe("Hero mascot");
    expect(img?.getAttribute("width")).toBe("320");
  });

  it("defaults loading=lazy", () => {
    const { container } = render(<MascotIllustration pose="empty-shops" size={200} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("supports loading=eager", () => {
    const { container } = render(<MascotIllustration pose="hero" size={320} loading="eager" />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("eager");
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Создать `src/components/finly/MascotIllustration.tsx`**

```tsx
export type MascotPose =
  | "nav-icon"
  | "hero"
  | "empty-shops"
  | "empty-data"
  | "achievement"
  | "not-found";

const POSE_ALT: Record<MascotPose, string> = {
  "nav-icon":     "Finly mascot icon",
  "hero":         "Finly mascot — explorer with scroll",
  "empty-shops":  "Finly mascot — empty chest",
  "empty-data":   "Finly mascot — examining a scroll",
  "achievement":  "Finly mascot — raising a chalice",
  "not-found":    "Finly mascot — lost with a compass",
};

interface Props {
  pose: MascotPose;
  size: number;
  alt?: string;
  loading?: "lazy" | "eager";
  className?: string;
}

export function MascotIllustration({ pose, size, alt, loading = "lazy", className }: Props) {
  return (
    <picture className={className}>
      <source
        srcSet={`/mascot/${pose}.webp 1x, /mascot/${pose}@2x.webp 2x`}
        type="image/webp"
      />
      <img
        src={`/mascot/${pose}.svg`}
        alt={alt ?? POSE_ALT[pose]}
        width={size}
        height={size}
        loading={loading}
        decoding="async"
      />
    </picture>
  );
}
```

- [ ] **Step 4: Run test — PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/components/finly/MascotIllustration.tsx src/components/finly/__tests__/MascotIllustration.test.tsx
git commit -m "feat(brand): MascotIllustration component (A.4 T9)"
git push origin mfa-a2-auth-ui
```

---

## Task 10: FinlyCard + FinlyButton + FinlyBadge

**Files:**
- Create: `src/components/finly/FinlyCard.tsx`, `FinlyButton.tsx`, `FinlyBadge.tsx`
- Create: `src/components/finly/__tests__/FinlyCard.test.tsx`, `FinlyButton.test.tsx`
- Create: `src/components/finly/index.ts`

- [ ] **Step 1: Failing test FinlyCard**

```tsx
// src/components/finly/__tests__/FinlyCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinlyCard } from "@/components/finly/FinlyCard";

describe("FinlyCard", () => {
  it("renders children with default gold border", () => {
    render(<FinlyCard><span>content</span></FinlyCard>);
    const root = screen.getByText("content").parentElement!;
    expect(root.className).toContain("border-gold-frame");
  });

  it("interactive adds tilt+glow class hooks", () => {
    render(<FinlyCard interactive><span>x</span></FinlyCard>);
    const root = screen.getByText("x").parentElement!;
    expect(root.className).toContain("finly-card-interactive");
    expect(root.className).toContain("hover:shadow-tide");
  });

  it("glowing achievement state has gold-glow class", () => {
    render(<FinlyCard glowing><span>x</span></FinlyCard>);
    const root = screen.getByText("x").parentElement!;
    expect(root.className).toContain("shadow-treasure");
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: `src/components/finly/FinlyCard.tsx`**

```tsx
import { cn } from "@/lib/utils";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  accent?: "gold" | "teal" | "flame";
  interactive?: boolean;
  glowing?: boolean;
}

const ACCENT: Record<NonNullable<Props["accent"]>, string> = {
  gold:  "border-gold-frame/40",
  teal:  "border-murloc-teal/50",
  flame: "border-orange-flame/50",
};

export function FinlyCard({
  accent = "gold",
  interactive = false,
  glowing = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        "rounded-frame border bg-card p-4 transition-shadow",
        ACCENT[accent],
        interactive && "finly-card-interactive cursor-pointer hover:shadow-[0_0_0_1px_var(--murloc-teal),0_8px_32px_var(--tide-glow)] hover:shadow-tide",
        glowing && "shadow-[0_0_0_2px_var(--gold-frame),0_0_24px_rgba(212,169,58,0.4)] shadow-treasure",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
```

(`shadow-tide` / `shadow-treasure` — semantic names; реальные значения через инлайн arbitrary values, имена для тест-asserts.)

- [ ] **Step 4: Failing test FinlyButton**

```tsx
// src/components/finly/__tests__/FinlyButton.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinlyButton } from "@/components/finly/FinlyButton";

describe("FinlyButton", () => {
  it("renders primary by default with orange-flame bg", () => {
    render(<FinlyButton>go</FinlyButton>);
    const btn = screen.getByRole("button", { name: "go" });
    expect(btn.className).toContain("bg-primary");
    expect(btn.className).toContain("rounded-pill");
  });

  it("secondary variant uses teal", () => {
    render(<FinlyButton variant="secondary">x</FinlyButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("border-secondary");
  });

  it("treasure variant has gold gradient class", () => {
    render(<FinlyButton variant="treasure">x</FinlyButton>);
    expect(screen.getByRole("button").className).toContain("bg-gradient-to-r");
  });
});
```

- [ ] **Step 5: Run — FAIL.**

- [ ] **Step 6: `src/components/finly/FinlyButton.tsx`**

```tsx
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "treasure";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary:   "finly-button-primary bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border border-secondary text-secondary hover:bg-secondary/10",
  ghost:     "text-foreground hover:bg-muted",
  treasure:  "bg-gradient-to-r from-gold-frame to-orange-flame text-scroll-ink hover:opacity-95",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function FinlyButton({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        "rounded-pill font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 7: `src/components/finly/FinlyBadge.tsx`** (тривиальный, тест опускаем — покрытие будет через page-tests)

```tsx
import { cn } from "@/lib/utils";

type Tone = "success" | "danger" | "info" | "gold" | "muted";

const TONE: Record<Tone, string> = {
  success: "bg-rune-success/15 text-rune-success border-rune-success/30",
  danger:  "bg-rune-danger/15 text-rune-danger border-rune-danger/30",
  info:    "bg-murloc-teal/15 text-murloc-teal border-murloc-teal/30",
  gold:    "bg-gold-frame/15 text-gold-frame border-gold-frame/30",
  muted:   "bg-muted text-muted-foreground border-border",
};

export function FinlyBadge({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 8: `src/components/finly/index.ts`** — re-exports

```ts
export { FinlyCard }    from "./FinlyCard";
export { FinlyButton }  from "./FinlyButton";
export { FinlyBadge }   from "./FinlyBadge";
export { MascotIllustration, type MascotPose } from "./MascotIllustration";
export { ThemeToggle }  from "./ThemeToggle";
export { TavernToggle } from "./TavernToggle";
```

- [ ] **Step 9: Tests + build**

```bash
npm run test
npm run build
```

- [ ] **Step 10: Commit**

```bash
git add src/components/finly
git commit -m "feat(finly): FinlyCard + FinlyButton + FinlyBadge primitives (A.4 T10)"
git push origin mfa-a2-auth-ui
```

---

## Task 11: FinlySection + FinlyEmptyState

**Files:**
- Create: `src/components/finly/FinlySection.tsx`, `FinlyEmptyState.tsx`
- Modify: `src/components/finly/index.ts`

- [ ] **Step 1: `src/components/finly/FinlySection.tsx`**

```tsx
import { cn } from "@/lib/utils";

interface Props extends React.HTMLAttributes<HTMLElement> {
  title: string;
  action?: React.ReactNode;
}

export function FinlySection({ title, action, className, children, ...rest }: Props) {
  return (
    <section className={cn("space-y-4", className)} {...rest}>
      <header className="flex items-end justify-between gap-4">
        <div className="flex-1">
          <h2 className="font-display text-2xl font-semibold text-foreground">{title}</h2>
          <div className="mt-2 h-px bg-gradient-to-r from-gold-frame to-transparent" />
        </div>
        {action && <div>{action}</div>}
      </header>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: `src/components/finly/FinlyEmptyState.tsx`**

```tsx
import { MascotIllustration, type MascotPose } from "./MascotIllustration";
import { FinlyButton } from "./FinlyButton";
import Link from "next/link";

interface Props {
  pose: MascotPose;
  title: string;
  body?: string;
  cta?: { label: string; href?: string; onClick?: () => void };
}

export function FinlyEmptyState({ pose, title, body, cta }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6 max-w-md mx-auto">
      <MascotIllustration pose={pose} size={pose === "not-found" ? 240 : 200} loading="eager" />
      <h2 className="font-display text-2xl font-semibold mt-6 text-foreground">{title}</h2>
      {body && <p className="mt-3 text-muted-foreground">{body}</p>}
      {cta && (
        <div className="mt-6">
          {cta.href ? (
            <Link href={cta.href}>
              <FinlyButton>{cta.label}</FinlyButton>
            </Link>
          ) : (
            <FinlyButton onClick={cta.onClick}>{cta.label}</FinlyButton>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `index.ts`**

```ts
export { FinlySection }    from "./FinlySection";
export { FinlyEmptyState } from "./FinlyEmptyState";
```

- [ ] **Step 4: Tests + commit**

```bash
npm run test
git add src/components/finly
git commit -m "feat(finly): FinlySection + FinlyEmptyState (A.4 T11)"
git push origin mfa-a2-auth-ui
```

---

## Task 12: FinlyMetricTile

**Files:**
- Create: `src/components/finly/FinlyMetricTile.tsx`
- Create: `src/components/finly/__tests__/FinlyMetricTile.test.tsx`
- Modify: `src/components/finly/index.ts`

- [ ] **Step 1: Failing-test**

```tsx
// src/components/finly/__tests__/FinlyMetricTile.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinlyMetricTile } from "@/components/finly/FinlyMetricTile";

describe("FinlyMetricTile", () => {
  it("renders label, value, delta and comparison", () => {
    render(
      <FinlyMetricTile
        label="Прибыль"
        value={847320}
        formatted="847 320 ₽"
        deltaPct={12.4}
        comparison="vs. март"
      />
    );
    expect(screen.getByText("Прибыль")).toBeInTheDocument();
    expect(screen.getByText("847 320 ₽")).toBeInTheDocument();
    expect(screen.getByText(/12\.4/)).toBeInTheDocument();
    expect(screen.getByText("vs. март")).toBeInTheDocument();
  });

  it("formats value with intl when no formatted prop", () => {
    render(<FinlyMetricTile label="X" value={1000} />);
    expect(screen.getByText(/1\s?000/)).toBeInTheDocument();
  });

  it("shows ⟡ marker and treasure shadow on achievement", () => {
    render(
      <FinlyMetricTile
        label="X"
        value={1}
        achievement={{ kind: "monthlyPlanHit", sinceDate: "2026-04-01" }}
      />
    );
    const tile = screen.getByText("X").closest(".finly-metric-tile")!;
    expect(tile.className).toContain("shadow-treasure");
    expect(screen.getByLabelText(/достижение/i)).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    render(<FinlyMetricTile label="X" value={0} loading />);
    expect(screen.getByLabelText(/загрузка/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: `src/components/finly/FinlyMetricTile.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  label: string;
  value: number | string;
  formatted?: string;
  deltaPct?: number;
  comparison?: string;
  accent?: "gold" | "teal" | "flame";
  achievement?: { kind: string; sinceDate: string };
  loading?: boolean;
  onClick?: () => void;
}

const ACCENT_BORDER: Record<NonNullable<Props["accent"]>, string> = {
  gold:  "border-gold-frame/40",
  teal:  "border-murloc-teal/50",
  flame: "border-orange-flame/50",
};

const numberFmt = new Intl.NumberFormat("ru-RU");

export function FinlyMetricTile({
  label,
  value,
  formatted,
  deltaPct,
  comparison,
  accent = "gold",
  achievement,
  loading = false,
  onClick,
}: Props) {
  const display = formatted ?? (typeof value === "number" ? numberFmt.format(value) : value);
  const delta = deltaPct ?? null;
  const positive = delta !== null && delta >= 0;
  const interactive = !!onClick;

  if (loading) {
    return (
      <div
        aria-label="Загрузка метрики"
        className={cn(
          "finly-metric-tile rounded-frame border bg-card p-5 min-h-[120px] animate-pulse",
          ACCENT_BORDER[accent]
        )}
      >
        <div className="h-3 w-24 bg-muted rounded mb-3" />
        <div className="h-8 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={cn(
        "finly-metric-tile relative rounded-frame border bg-card p-5 transition-all duration-[220ms] [transition-timing-function:var(--ease-tilt)]",
        ACCENT_BORDER[accent],
        interactive && "cursor-pointer hover:[transform:perspective(800px)_rotateX(2deg)_rotateY(-2deg)_translateZ(0)]",
        achievement && "shadow-treasure shadow-[0_0_0_2px_var(--gold-frame),0_0_24px_rgba(212,169,58,0.4)]"
      )}
    >
      {achievement && (
        <span
          aria-label="Достижение"
          className="absolute top-2 right-2 font-display text-gold-frame text-lg"
        >⟡</span>
      )}
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold text-foreground mt-2">{display}</div>
      {(delta !== null || comparison) && (
        <div className="flex items-center gap-2 mt-2 text-sm">
          {delta !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                positive ? "text-rune-success" : "text-rune-danger"
              )}
            >
              {positive ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
              {positive ? "+" : ""}{delta.toFixed(1)}%
            </span>
          )}
          {comparison && <span className="text-muted-foreground">{comparison}</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update `index.ts`** — добавить export FinlyMetricTile

- [ ] **Step 5: Run test — PASS.**

- [ ] **Step 6: Commit**

```bash
git add src/components/finly
git commit -m "feat(finly): FinlyMetricTile с achievement-state (A.4 T12)"
git push origin mfa-a2-auth-ui
```

---

## Task 13: FinlyChartCard + FinlyDataTable

**Files:**
- Create: `src/components/finly/FinlyChartCard.tsx`, `FinlyDataTable.tsx`
- Modify: `src/components/finly/index.ts`

- [ ] **Step 1: `src/components/finly/FinlyChartCard.tsx`**

```tsx
import { FinlyCard } from "./FinlyCard";

interface Props {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function FinlyChartCard({ title, subtitle, action, children }: Props) {
  return (
    <FinlyCard className="p-0">
      <header className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="px-5 pb-5 pt-4">{children}</div>
    </FinlyCard>
  );
}
```

- [ ] **Step 2: `src/components/finly/FinlyDataTable.tsx`**

```tsx
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  dense?: boolean;
}

export function FinlyDataTable<T>({ columns, rows, rowKey, empty, dense }: Props<T>) {
  if (rows.length === 0 && empty) {
    return <div className="rounded-frame border border-border p-6">{empty}</div>;
  }
  return (
    <div className="rounded-frame border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b-2 border-murloc-teal/30">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  "text-left font-medium text-muted-foreground uppercase text-xs tracking-wider",
                  dense ? "px-3 py-2" : "px-4 py-3",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                i % 2 === 1 && "bg-tavern-bg/30"
              )}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={cn(
                    "text-foreground",
                    dense ? "px-3 py-2" : "px-4 py-3",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key as string] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Update `index.ts`**

```ts
export { FinlyChartCard } from "./FinlyChartCard";
export { FinlyDataTable } from "./FinlyDataTable";
```

- [ ] **Step 4: Tests + commit**

```bash
npm run test && npm run build
git add src/components/finly
git commit -m "feat(finly): FinlyChartCard + FinlyDataTable (A.4 T13)"
git push origin mfa-a2-auth-ui
```

---

## Task 14: FinlyAuthLayout

**Files:**
- Create: `src/components/finly/FinlyAuthLayout.tsx`
- Modify: `src/components/finly/index.ts`

- [ ] **Step 1: `src/components/finly/FinlyAuthLayout.tsx`**

```tsx
import { MascotIllustration, type MascotPose } from "./MascotIllustration";

interface Props {
  children: React.ReactNode;
  mascotPose?: MascotPose;
  title?: string;
  subtitle?: string;
}

export function FinlyAuthLayout({
  children,
  mascotPose = "hero",
  title,
  subtitle,
}: Props) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-5xl w-full">
        <div className="hidden md:flex flex-col items-center text-center">
          <MascotIllustration pose={mascotPose} size={320} loading="eager" />
          {title && (
            <h1 className="font-display text-3xl font-bold mt-6 text-foreground">{title}</h1>
          )}
          {subtitle && (
            <p className="text-muted-foreground mt-3 max-w-sm">{subtitle}</p>
          )}
        </div>
        <div className="bg-popover border border-border rounded-frame p-6 md:p-8 shadow-rune">
          <div className="md:hidden mb-6 text-center">
            <MascotIllustration pose={mascotPose} size={160} loading="eager" />
            {title && <h1 className="font-display text-2xl font-bold mt-4 text-foreground">{title}</h1>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `index.ts`** + commit

```bash
git add src/components/finly
git commit -m "feat(finly): FinlyAuthLayout (A.4 T14)"
git push origin mfa-a2-auth-ui
```

---

## Task 15: TopNav redesign + AvatarMenu

**Files:**
- Modify: `src/components/nav/TopNav.tsx`
- Create: `src/components/nav/AvatarMenu.tsx`
- Modify: `src/components/nav/TopNav.test.tsx` (если падает — обновить)

- [ ] **Step 1: Read existing TopNav для понимания структуры**

Run: `cat src/components/nav/TopNav.tsx`
Зафиксировать текущие пункты меню и логику OrgSwitcher.

- [ ] **Step 2: Создать `src/components/nav/AvatarMenu.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { usersCurrentRef } from "@/lib/convex-refs";
import { ChevronDown, User, Users, Settings, ShieldCheck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function AvatarMenu() {
  const me = useQuery(usersCurrentRef);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!me) return null;
  const initials = (me.name || me.email || "?").trim().slice(0, 1).toUpperCase();

  const items = [
    { label: "Профиль",     href: "/settings",             icon: User },
    { label: "Команда",     href: "/org/team",             icon: Users },
    { label: "Настройки",   href: "/org/settings",         icon: Settings },
    ...(me.isSystemAdmin ? [{ label: "Админ-панель", href: "/admin/users", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted transition"
        aria-label="Меню профиля"
        aria-expanded={open}
      >
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
          {initials}
        </span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-frame shadow-rune py-1 z-50">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-medium text-foreground truncate">{me.name || "—"}</div>
              <div className="text-xs text-muted-foreground truncate">{me.email}</div>
            </div>
            {items.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition"
                )}
              >
                <Icon size={16} className="text-muted-foreground" />
                {label}
              </Link>
            ))}
            <button
              onClick={async () => { await signOut(); router.push("/login"); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rune-danger hover:bg-muted transition border-t border-border"
            >
              <LogOut size={16} /> Выйти
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Переписать `src/components/nav/TopNav.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Menu } from "lucide-react";
import { usersCurrentRef } from "@/lib/convex-refs";
import { OrgSwitcher } from "./OrgSwitcher";
import { AvatarMenu } from "./AvatarMenu";
import { ThemeToggle } from "@/components/finly/ThemeToggle";
import { MascotIllustration } from "@/components/finly/MascotIllustration";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Дашборд",   href: "/" },
  { label: "Аналитика", href: "/analytics" },
  { label: "Пульс",     href: "/pulse" },
  { label: "Товары",    href: "/products" },
  { label: "Финансы",   href: "/financials" },
  { label: "Цены",      href: "/prices" },
  { label: "Возвраты",  href: "/returns" },
  { label: "Отзывы",    href: "/feedbacks" },
];

export function TopNav() {
  const me = useQuery(usersCurrentRef);
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Гость или pending: только лого + theme (не показываем меню)
  const showNav = me && me.status === "approved";

  return (
    <header className="border-b border-gold-frame/30 bg-card">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <MascotIllustration pose="nav-icon" size={32} loading="eager" />
          <span className="font-display text-xl font-semibold text-foreground">Finly</span>
        </Link>

        {showNav && (
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ label, href }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-3 py-2 text-sm rounded-md transition relative",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {label}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-orange-flame rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {showNav && <OrgSwitcher />}
          {me && <AvatarMenu />}
          {!me && (
            <Link href="/login" className="text-sm text-foreground hover:underline">
              Войти
            </Link>
          )}
          {showNav && (
            <button
              className="md:hidden p-2 rounded-md hover:bg-muted"
              onClick={() => setDrawerOpen(o => !o)}
              aria-label="Открыть меню"
            >
              <Menu size={20} />
            </button>
          )}
        </div>
      </div>

      {showNav && drawerOpen && (
        <div className="md:hidden border-t border-border bg-popover">
          <nav className="px-4 py-3 grid grid-cols-2 gap-1">
            {NAV_ITEMS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawerOpen(false)}
                className="px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 4: Обновить TopNav.test.tsx**

Существующие тесты могут проверять конкретные классы/структуру — обновить snapshots/queries чтобы отражали новый markup. Если тест проверяет `org/me:listMine` — его не трогаем (orgswitcher не меняется здесь).

Run: `npx vitest run src/components/nav/TopNav.test.tsx`
Если FAIL — обновить тест-asserts под новый JSX.

- [ ] **Step 5: Tests + commit**

```bash
npm run test
git add src/components/nav
git commit -m "feat(nav): TopNav с маскотом + AvatarMenu + ThemeToggle (A.4 T15)"
git push origin mfa-a2-auth-ui
```

---

## Task 16: Footer + privacy/terms placeholder pages

**Files:**
- Create: `src/components/nav/Footer.tsx`
- Create: `src/app/legal/privacy/page.tsx`, `src/app/legal/terms/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Создать `src/components/nav/Footer.tsx`**

```tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gold-frame/30 bg-card mt-auto">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 text-center text-muted-foreground text-sm space-y-2">
        <p>
          <span className="font-display text-foreground">Finly</span> · финансы селлера на маркетплейсах
        </p>
        <p>
          © 2026 · Связь с автором:{" "}
          <a
            className="text-orange-flame hover:underline"
            href="https://t.me/Virtuozick"
            target="_blank"
            rel="noopener noreferrer"
          >
            @Virtuozick
          </a>{" "}
          (Telegram)
        </p>
        <p>
          <Link className="hover:text-foreground" href="/legal/privacy">Политика конфиденциальности</Link>
          {" · "}
          <Link className="hover:text-foreground" href="/legal/terms">Условия использования</Link>
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Создать заглушки `/legal/privacy` и `/legal/terms`**

`src/app/legal/privacy/page.tsx`:

```tsx
export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="font-display text-3xl font-bold mb-4">Политика конфиденциальности</h1>
      <p className="text-muted-foreground">
        Полный текст политики будет опубликован позднее. По всем вопросам обращайтесь к{" "}
        <a className="text-orange-flame hover:underline" href="https://t.me/Virtuozick">@Virtuozick</a>.
      </p>
    </div>
  );
}
```

`src/app/legal/terms/page.tsx`: то же самое, заголовок «Условия использования».

- [ ] **Step 3: Wire Footer в `layout.tsx`**

```tsx
import { Footer } from "@/components/nav/Footer";

// внутри JSX, после </main>:
<TopNav />
<main className="...">{children}</main>
<Footer />
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add src/components/nav/Footer.tsx src/app/legal src/app/layout.tsx
git commit -m "feat(nav): Footer + legal placeholders (A.4 T16)"
git push origin mfa-a2-auth-ui
```

---

## Task 17: Auth-flows redesign (login / register / forgot / reset / verify / pending / rejected / invite)

**Files:** все страницы в `src/app/login/`, `register/`, `forgot-password/`, `reset-password/`, `verify-email/`, `pending-approval/`, `rejected/`, `invite/[token]/`.

Базовый pattern: оборачиваем форму в `<FinlyAuthLayout>`, заменяем кнопки на `<FinlyButton>`, заголовки на Cinzel. Логика flow остаётся.

- [ ] **Step 1: Login (`src/app/login/page.tsx`)**

Прочитать существующий файл, выявить форму (email/password fields + submit). Обернуть:

```tsx
import { FinlyAuthLayout } from "@/components/finly/FinlyAuthLayout";
import { FinlyButton } from "@/components/finly/FinlyButton";
// ... остальные импорты сохраняются

export default function LoginPage() {
  // ... existing state
  return (
    <FinlyAuthLayout
      mascotPose="hero"
      title="Вход в Лигу"
      subtitle="Присоединяйтесь к исследователям маркетплейсов"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="font-display text-2xl font-semibold mb-2 hidden md:block">Войти</h2>
        {/* существующие поля Email/Password в обновлённых классах */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>
        {error && <p className="text-rune-danger text-sm">{error}</p>}
        <FinlyButton type="submit" className="w-full" disabled={loading}>
          {loading ? "Входим…" : "Войти"}
        </FinlyButton>
        <p className="text-sm text-muted-foreground text-center">
          <Link href="/forgot-password" className="text-orange-flame hover:underline">Забыли пароль?</Link>
          {" · "}
          <Link href="/register" className="text-orange-flame hover:underline">Зарегистрироваться</Link>
        </p>
      </form>
    </FinlyAuthLayout>
  );
}
```

(Сохрани существующие `handleSubmit` / Convex Auth wiring — меняй только разметку и стили.)

- [ ] **Step 2: Register** — те же действия, заголовок «Стать Исследователем», подзаголовок «Создайте аккаунт и подключите магазины».

- [ ] **Step 3: Forgot-password / Reset-password / Verify-email** — `<FinlyAuthLayout mascotPose="empty-data">` (мурлок изучает свиток), заголовки соответствующие.

- [ ] **Step 4: Pending-approval**

```tsx
"use client";
import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";

export default function PendingApprovalPage() {
  return (
    <FinlyEmptyState
      pose="empty-shops"
      title="Лига рассматривает заявку"
      body="Сэр-исследователь ждёт у дверей Лиги. Как только админ подтвердит вашу заявку, вы получите письмо."
    />
  );
}
```

- [ ] **Step 5: Rejected**

```tsx
"use client";
import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";

export default function RejectedPage() {
  return (
    <FinlyEmptyState
      pose="not-found"
      title="Заявка отклонена"
      body="Не вышло. Свяжитесь с админом, если считаете это ошибкой."
      cta={{ label: "Связаться с админом", href: "https://t.me/Virtuozick" }}
    />
  );
}
```

- [ ] **Step 6: Invite/[token]**

Существует 4 ветки внутри: ok / used / expired / wrong-email. Обернуть каждую в `<FinlyEmptyState>` с разными mascot-pose:
- ok (форма принятия): `<FinlyAuthLayout mascotPose="hero" title="Приглашение в Лигу">…форма…</FinlyAuthLayout>`
- used: `<FinlyEmptyState pose="empty-data" title="Это приглашение уже использовано" body="..." cta={{label:"На главную",href:"/"}}/>`
- expired: `<FinlyEmptyState pose="empty-shops" title="Приглашение истекло" .../>`
- wrong-email: `<FinlyEmptyState pose="not-found" title="Не тот email" body="Это приглашение для другого адреса" .../>`

- [ ] **Step 7: Run all auth tests + build**

```bash
npm run test
npm run build
```

Existing auth tests могут asserт-ить на конкретные тексты — если падают, обновить asserts.

- [ ] **Step 8: Commit**

```bash
git add src/app
git commit -m "feat(auth): redesign all auth flows in Finly style (A.4 T17)

login, register, forgot/reset password, verify-email, pending-approval,
rejected, and 4 invite branches now use FinlyAuthLayout / FinlyEmptyState
with mascot poses appropriate to each flow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin mfa-a2-auth-ui
```

---

## Task 18: Dashboard `/` redesign

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard/DashboardContent.tsx` (полный рефакторинг)
- Modify (или delete): `src/components/dashboard/MetricCard.tsx`, `Welcome.tsx`, `PeriodSelector.tsx`, `DashboardSection.tsx`

- [ ] **Step 1: Read существующий DashboardContent.tsx** для понимания query и shape данных.

- [ ] **Step 2: Переписать `src/components/dashboard/DashboardContent.tsx`**

Заменить `<MetricCard>` на `<FinlyMetricTile>`, `<DashboardSection>` на `<FinlySection>`, обернуть chart в `<FinlyChartCard>`. Сохранить все Convex queries как есть.

```tsx
"use client";
import { FinlyMetricTile } from "@/components/finly/FinlyMetricTile";
import { FinlySection } from "@/components/finly/FinlySection";
import { FinlyChartCard } from "@/components/finly/FinlyChartCard";
import { FinlyCard } from "@/components/finly/FinlyCard";
import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";
import { PeriodSelector } from "./PeriodSelector";
import { useDashboardData } from "@/hooks/useDashboardData";
// ... recharts imports как в существующем

export function DashboardContent() {
  const data = useDashboardData(/* args */);
  // если нет shops — empty state
  if (data && data.shops.length === 0) {
    return (
      <FinlyEmptyState
        pose="empty-shops"
        title="Магазинов пока нет"
        body="Подключите свой первый магазин Wildberries, чтобы увидеть метрики."
        cta={{ label: "Добавить магазин", href: "/settings" }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Сокровищница</h1>
        <PeriodSelector />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinlyMetricTile
          label="Прибыль"
          value={data?.metrics.profit ?? 0}
          formatted={data && fmtRub(data.metrics.profit)}
          deltaPct={data?.metrics.profitDeltaPct}
          comparison="vs. прошлый период"
          accent="gold"
          achievement={data?.achievements?.profit}
          loading={!data}
        />
        <FinlyMetricTile
          label="Выручка"
          value={data?.metrics.revenue ?? 0}
          formatted={data && fmtRub(data.metrics.revenue)}
          deltaPct={data?.metrics.revenueDeltaPct}
          comparison="vs. прошлый период"
          accent="teal"
          loading={!data}
        />
        <FinlyMetricTile
          label="Маржа"
          value={data?.metrics.marginPct ?? 0}
          formatted={data && `${data.metrics.marginPct.toFixed(1)}%`}
          deltaPct={data?.metrics.marginDeltaPct}
          accent="flame"
          loading={!data}
        />
        <FinlyMetricTile
          label="Возвраты"
          value={data?.metrics.returns ?? 0}
          formatted={data && fmtRub(data.metrics.returns)}
          deltaPct={data?.metrics.returnsDeltaPct}
          accent="gold"
          loading={!data}
        />
      </div>

      <FinlyChartCard title="Выручка по дням" subtitle="За выбранный период">
        {/* recharts с цветами через --color-chart-1, и т.д. — как было */}
      </FinlyChartCard>

      <FinlySection title="Магазины">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.shops.map(shop => (
            <FinlyCard key={shop._id} interactive accent="teal">
              <h3 className="font-display text-lg font-semibold">{shop.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{shop.platform}</p>
              {/* мини-метрики магазина */}
            </FinlyCard>
          ))}
        </div>
      </FinlySection>
    </div>
  );
}

function fmtRub(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n) + " ₽";
}
```

(`achievements?.profit` — если в T22 backend будет добавлен; пока `undefined` — без плашки.)

- [ ] **Step 3: PeriodSelector редизайн**

`src/components/dashboard/PeriodSelector.tsx` — уже существует. Обернуть в Finly-стилистику: golden underline, font-display для активного периода.

- [ ] **Step 4: Welcome (для нового юзера) — заменить на FinlyEmptyState**

Удалить `Welcome.tsx` если стал не нужен (логика «нет магазинов» теперь в DashboardContent через FinlyEmptyState). Если используется на других страницах — оставить.

- [ ] **Step 5: Tests + build**

```bash
npm run test
npm run build
```

Если `Welcome.test.tsx` падает на удалённом компоненте — удалить тест.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard src/app/page.tsx
git commit -m "feat(dashboard): redesign / with FinlyMetricTile + Sections (A.4 T18)"
git push origin mfa-a2-auth-ui
```

---

## Task 19: Internal pages batch 1 — analytics, pulse, products

Pattern для каждой: обернуть в Финли-компоненты (FinlySection / FinlyDataTable / FinlyCard / FinlyChartCard), заменить empty-states на FinlyEmptyState, не трогать data layer.

- [ ] **Step 1: `src/app/analytics/page.tsx`**

Существующий `useDashboardData`/analytics-query сохраняем. Меняем разметку:
- Заголовок страницы → `<FinlySection title="Аналитика">` (или `<h1 className="font-display ...">`)
- Фильтры (если есть) → `<FinlyCard accent="teal" className="p-4">…filters…</FinlyCard>`
- Графики → `<FinlyChartCard>`
- Таблицы → `<FinlyDataTable>`
- Empty → `<FinlyEmptyState pose="empty-data" .../>`

- [ ] **Step 2: `src/app/pulse/page.tsx`**

События в виде ленты `<FinlyCard accent="teal">` каждое.

- [ ] **Step 3: `src/app/products/page.tsx`**

Сетка SKU-карточек → `<FinlyCard interactive>`. Empty → `<FinlyEmptyState pose="empty-data">`.

- [ ] **Step 4: Tests + build + commit**

```bash
npm run test && npm run build
git add src/app
git commit -m "feat(redesign): analytics/pulse/products redesigned (A.4 T19)"
git push origin mfa-a2-auth-ui
```

---

## Task 20: Internal pages batch 2 — financials, prices, returns, feedbacks

Pattern идентичен T19: верхняя строка `<FinlyMetricTile>` totals (если применимо), потом `<FinlyDataTable>`, статусы через `<FinlyBadge tone="success|danger|info|gold">`, empty-states.

- [ ] **Step 1: `src/app/financials/page.tsx`** — вверху row из FinlyMetricTile (приход/расход/прибыль), ниже FinlyDataTable.

- [ ] **Step 2: `src/app/prices/page.tsx`** — FinlyDataTable редактор, primary CTA «Применить» через FinlyButton.

- [ ] **Step 3: `src/app/returns/page.tsx`** — FinlyDataTable, status в колонке через FinlyBadge.

- [ ] **Step 4: `src/app/feedbacks/page.tsx`** — лента FinlyCard отзывов, рейтинг через FinlyBadge tone=gold.

- [ ] **Step 5: Tests + build + commit**

```bash
npm run test && npm run build
git add src/app
git commit -m "feat(redesign): financials/prices/returns/feedbacks redesigned (A.4 T20)"
git push origin mfa-a2-auth-ui
```

---

## Task 21: Internal pages batch 3 — settings, org/team, org/settings, admin/users

- [ ] **Step 1: `src/app/settings/page.tsx`** — табы (shadcn Tabs):
  - Профиль (имя, email, businessName)
  - Магазины (список, добавление через диалог)
  - Уведомления (заглушка)
  - **Тема** (`<ThemeToggle/>` + `<TavernToggle/>`)
  - **Цель прибыли** (input number → mutation `usersUpdateMonthlyProfitGoalRef`)
  Empty-state если магазинов нет — `<FinlyEmptyState pose="empty-shops">` с CTA «Добавить магазин».

- [ ] **Step 2: `src/app/org/team/page.tsx`** — FinlyDataTable участников, MemberRow рендерится через row.render. Invite-modal стилизуется в Финли-стиле (использует FinlyButton).

- [ ] **Step 3: `src/app/org/settings/page.tsx`** — форма переименования через FinlyButton, danger-zone с `<FinlyButton variant="ghost" className="text-rune-danger">`.

- [ ] **Step 4: `src/app/admin/users/page.tsx`** — StatusTabs обновить под Финли-токены, UserCard через FinlyCard, RejectModal в Финли-стиле. Сохранить существующий AdminGate.

- [ ] **Step 5: Tests + build + commit**

```bash
npm run test && npm run build
git add src/app
git commit -m "feat(redesign): settings/org/admin pages redesigned (A.4 T21)"
git push origin mfa-a2-auth-ui
```

---

## Task 22: Achievements backend

**Files:**
- Create: `convex/achievements.ts`
- Create: `convex/achievements.test.ts`
- Modify: `src/lib/convex-refs.ts`
- Modify: `convex/shops.ts` (добавить trigger в shop creation)
- Modify: `convex/dashboard.ts` (добавить detection logic для KPI-thresholds)
- Modify: `convex/sync.ts` или `analytics.ts` (для detection после синка)
- Modify: `convex/crons.ts` (для storeAnniversary daily check)

- [ ] **Step 1: `convex/achievements.ts`**

```ts
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const ACHIEVEMENT_KINDS = [
  "firstShop",
  "firstThousandSales",
  "monthlyPlanHit",
  "firstMillionProfit",
  "tenKSold",
  "zeroReturnsWeek",
  "firstReviewFiveStar",
  "storeAnniversary",
] as const;
type Kind = typeof ACHIEVEMENT_KINDS[number];

const kindValidator = v.union(...ACHIEVEMENT_KINDS.map((k) => v.literal(k)));

export const recordIfNew = internalMutation({
  args: {
    userId: v.id("users"),
    kind: kindValidator,
    payload: v.optional(v.any()),
  },
  handler: async (ctx, { userId, kind, payload }) => {
    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_kind", (q) => q.eq("userId", userId).eq("kind", kind))
      .first();
    if (existing) return null;
    return await ctx.db.insert("userAchievements", {
      userId,
      kind,
      achievedAt: Date.now(),
      payload,
      seenAt: undefined,
    });
  },
});

export const newSinceLastSeen = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("userAchievements")
      .withIndex("by_user_unseen", (q) =>
        q.eq("userId", userId).eq("seenAt", undefined)
      )
      .collect();
  },
});

export const markSeen = mutation({
  args: { achievementId: v.id("userAchievements") },
  handler: async (ctx, { achievementId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const a = await ctx.db.get(achievementId);
    if (!a || a.userId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(achievementId, { seenAt: Date.now() });
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
```

- [ ] **Step 2: `convex/achievements.test.ts`** — basic test recordIfNew idempotency

```ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";

describe("achievements", () => {
  it("recordIfNew is idempotent per (userId, kind)", async () => {
    const t = convexTest(schema);
    // create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { email: "test@x.com", status: "approved" });
    });
    const id1 = await t.mutation(internal.achievements.recordIfNew, {
      userId, kind: "firstShop"
    });
    const id2 = await t.mutation(internal.achievements.recordIfNew, {
      userId, kind: "firstShop"
    });
    expect(id1).toBeTruthy();
    expect(id2).toBeNull();
    const all = await t.run(async (ctx) =>
      await ctx.db.query("userAchievements").collect()
    );
    expect(all).toHaveLength(1);
  });
});
```

(Если `convex-test` не подключён, отметим как TODO для интеграционного запуска.)

- [ ] **Step 3: Trigger в `convex/shops.ts` создании магазина**

В функции `shops:create` (или mutation создающей shop) добавить после `ctx.db.insert("shops", ...)`:

```ts
import { internal } from "./_generated/api";

// после создания shop
const userId = await getAuthUserId(ctx);
if (userId) {
  await ctx.runMutation(internal.achievements.recordIfNew, {
    userId, kind: "firstShop", payload: { shopId },
  });
}
```

- [ ] **Step 4: KPI-thresholds в `convex/dashboard.ts`**

Существующий dashboard query, который возвращает `metrics`. Добавить detection:

```ts
// после расчёта metrics
const userId = await getAuthUserId(ctx);
if (userId) {
  const me = await ctx.db.get(userId);
  // monthlyPlanHit
  if (me?.monthlyProfitGoal && metrics.profit >= me.monthlyProfitGoal) {
    await ctx.runMutation(internal.achievements.recordIfNew, {
      userId,
      kind: "monthlyPlanHit",
      payload: { monthLabel: /* месяц периода */, target: me.monthlyProfitGoal, actual: metrics.profit },
    });
  }
  // firstMillionProfit (cumulative)
  if (metrics.cumulativeProfit >= 1_000_000) {
    await ctx.runMutation(internal.achievements.recordIfNew, { userId, kind: "firstMillionProfit" });
  }
  // ... остальные
}
```

(Точная вставка зависит от текущего layout dashboard.ts; основная идея — после расчётов и до `return`.)

- [ ] **Step 5: Cron для storeAnniversary**

В `convex/crons.ts` добавить daily cron, который проходит по shops, у каждого проверяет если сегодня — годовщина (createdAt + 365d), вызывает `recordIfNew` для owner.

- [ ] **Step 6: convex-refs**

```ts
export const achievementsNewSinceLastSeenRef = "achievements:newSinceLastSeen" as unknown as Q<
  Record<string, never>,
  Doc<"userAchievements">[]
>;
export const achievementsMarkSeenRef = "achievements:markSeen" as unknown as Mut<
  { achievementId: Id<"userAchievements"> }
>;
export const achievementsListAllRef = "achievements:listAll" as unknown as Q<
  Record<string, never>,
  Doc<"userAchievements">[]
>;
```

- [ ] **Step 7: Deploy + test + commit**

```bash
npx convex deploy --yes
npm run test
git add convex src/lib/convex-refs.ts
git commit -m "feat(achievements): backend + KPI-thresholds + milestones (A.4 T22)"
git push origin mfa-a2-auth-ui
```

---

## Task 23: AchievementProvider + FinlyAchievementToast + /achievements page

**Files:**
- Create: `src/components/finly/Provider/AchievementProvider.tsx`
- Create: `src/components/finly/FinlyAchievementToast.tsx`
- Create: `src/hooks/useAchievement.ts`
- Create: `src/app/achievements/page.tsx`
- Create: `src/components/finly/__tests__/AchievementProvider.test.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: `src/components/finly/FinlyAchievementToast.tsx`**

```tsx
import { MascotIllustration } from "./MascotIllustration";
import { X } from "lucide-react";

interface Props {
  title: string;
  body?: string;
  onClose: () => void;
}

export function FinlyAchievementToast({ title, body, onClose }: Props) {
  return (
    <div
      role="alert"
      style={{ animation: "achievement-enter 380ms cubic-bezier(.2,.9,.3,1)" }}
      className="fixed top-20 right-6 z-50 w-80 bg-popover border-2 border-gold-frame rounded-frame p-4 shadow-treasure shadow-[0_0_0_2px_var(--gold-frame),0_0_24px_rgba(212,169,58,0.4)] flex gap-3"
    >
      <MascotIllustration pose="achievement" size={64} loading="eager" />
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-foreground">{title}</div>
        {body && <p className="text-sm text-muted-foreground mt-1">{body}</p>}
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Закрыть"
      >
        <X size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/finly/Provider/AchievementProvider.tsx`**

```tsx
"use client";
import { createContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { achievementsNewSinceLastSeenRef, achievementsMarkSeenRef } from "@/lib/convex-refs";
import { FinlyAchievementToast } from "../FinlyAchievementToast";
import type { Id } from "../../../../convex/_generated/dataModel";

const TITLES: Record<string, string> = {
  firstShop:            "Первый магазин!",
  firstThousandSales:   "1 000 продаж — поздравляем!",
  monthlyPlanHit:       "План по прибыли выполнен!",
  firstMillionProfit:   "Первый миллион прибыли!",
  tenKSold:             "10 000 единиц продано!",
  zeroReturnsWeek:      "Неделя без возвратов!",
  firstReviewFiveStar:  "Первый 5★ отзыв!",
  storeAnniversary:     "Годовщина магазина!",
};

interface Toast {
  id: Id<"userAchievements">;
  title: string;
  body?: string;
}

export const AchievementContext = createContext<null>(null);

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const newOnes = useQuery(achievementsNewSinceLastSeenRef);
  const markSeen = useMutation(achievementsMarkSeenRef);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!newOnes || newOnes.length === 0) return;
    const next = newOnes.slice(0, 3).map((a) => ({
      id: a._id,
      title: TITLES[a.kind] ?? "Достижение!",
      body: undefined,
    }));
    setToasts(next);
    // auto-dismiss каждый через 4s
    next.forEach((t, i) => {
      setTimeout(() => {
        markSeen({ achievementId: t.id }).catch(() => {});
        setToasts(curr => curr.filter(x => x.id !== t.id));
      }, 4000 + i * 200);
    });
  }, [newOnes, markSeen]);

  return (
    <AchievementContext.Provider value={null}>
      {children}
      {toasts.map(t => (
        <FinlyAchievementToast
          key={t.id}
          title={t.title}
          body={t.body}
          onClose={() => {
            markSeen({ achievementId: t.id }).catch(() => {});
            setToasts(curr => curr.filter(x => x.id !== t.id));
          }}
        />
      ))}
    </AchievementContext.Provider>
  );
}
```

- [ ] **Step 3: `src/hooks/useAchievement.ts`** (re-export ради единообразия)

```ts
export { AchievementProvider } from "@/components/finly/Provider/AchievementProvider";
```

- [ ] **Step 4: `src/app/achievements/page.tsx`** — архив

```tsx
"use client";
import { AuthGate } from "@/components/auth/AuthGate";
import { useQuery } from "convex/react";
import { achievementsListAllRef } from "@/lib/convex-refs";
import { FinlyCard } from "@/components/finly/FinlyCard";
import { FinlySection } from "@/components/finly/FinlySection";
import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";
import { MascotIllustration } from "@/components/finly/MascotIllustration";

const TITLES: Record<string, string> = {
  firstShop:            "Первый магазин",
  firstThousandSales:   "1 000 продаж",
  monthlyPlanHit:       "План по прибыли выполнен",
  firstMillionProfit:   "Первый миллион прибыли",
  tenKSold:             "10 000 единиц продано",
  zeroReturnsWeek:      "Неделя без возвратов",
  firstReviewFiveStar:  "Первый 5★ отзыв",
  storeAnniversary:     "Годовщина магазина",
};

export default function AchievementsPage() {
  return (<AuthGate><Content/></AuthGate>);
}

function Content() {
  const items = useQuery(achievementsListAllRef);
  if (items === undefined) return <div className="text-muted-foreground">Загрузка…</div>;
  if (items.length === 0) {
    return (
      <FinlyEmptyState
        pose="empty-data"
        title="Достижений пока нет"
        body="Первая 1000 продаж, первый миллион прибыли, годовщина магазина — все вехи появятся здесь."
      />
    );
  }
  return (
    <div className="space-y-6">
      <FinlySection title="Достижения">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(a => (
            <FinlyCard key={a._id} glowing accent="gold">
              <div className="flex items-start gap-3">
                <MascotIllustration pose="achievement" size={56}/>
                <div>
                  <div className="font-display font-semibold">{TITLES[a.kind] ?? a.kind}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(a.achievedAt).toLocaleDateString("ru-RU")}
                  </div>
                </div>
              </div>
            </FinlyCard>
          ))}
        </div>
      </FinlySection>
    </div>
  );
}
```

- [ ] **Step 5: Wire `<AchievementProvider>` в `layout.tsx`**

Внутри `<TavernProvider>`:

```tsx
<AchievementProvider>
  <TopNav />
  <main>{children}</main>
  <Footer />
</AchievementProvider>
```

- [ ] **Step 6: Tests + build + commit**

```bash
npm run test && npm run build
git add src/components/finly src/hooks/useAchievement.ts src/app/achievements src/app/layout.tsx
git commit -m "feat(achievements): provider + toast + /achievements page (A.4 T23)"
git push origin mfa-a2-auth-ui
```

---

## Task 24: SoundProvider + sprite placeholder

**Files:**
- Create: `src/components/finly/Provider/SoundProvider.tsx`
- Create: `src/hooks/useSound.ts`
- Create: `public/sounds/finly.ogg` (placeholder — 0.1s of silence)
- Create: `public/sounds/README.md`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Создать silent placeholder sprite**

Run:
```bash
mkdir -p public/sounds
# Создать silent ogg через ffmpeg (если есть) или скачать тривиальный silence
# Альтернатива: пустой файл с правильным заголовком — но проще просто
# дождаться, пока пользователь положит. Здесь — placeholder README.
```

`public/sounds/README.md`:

```md
# Finly sound sprite

Placeholder. Replace `finly.ogg` with a real sprite containing:

| Slot offset (s) | Duration | Sound        |
|-----------------|----------|--------------|
| 0.0             | 0.15     | click        |
| 0.5             | 0.5      | achievement  |
| 1.5             | 0.3      | flip         |

Use freesound.org (CC0) clips:
- click: a soft "card flick" or "wood-tap"
- achievement: short "gold coin chime" or fanfare
- flip: a paper or card flip swoosh

Combine via Audacity / ffmpeg into a single OGG file at offsets above.
The SoundProvider expects exactly these names and offsets.
```

`public/sounds/finly.ogg`: пустой файл — 0 байт. Браузер просто не сможет load и SoundProvider gracefully fail. После того как Юрий положит реальный sprite — заработает.

- [ ] **Step 2: `src/components/finly/Provider/SoundProvider.tsx`**

```tsx
"use client";
import { createContext, useContext, useEffect, useRef } from "react";
import { useTavern } from "@/hooks/useTavern";

interface Slot { offset: number; duration: number; }
const SLOTS: Record<string, Slot> = {
  click:       { offset: 0.0, duration: 0.15 },
  achievement: { offset: 0.5, duration: 0.5  },
  flip:        { offset: 1.5, duration: 0.3  },
};

export type SoundName = keyof typeof SLOTS;

interface Ctx {
  play: (name: SoundName) => void;
}
const SoundContext = createContext<Ctx>({ play: () => {} });

export function useSoundContext() { return useContext(SoundContext); }

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const { tavern } = useTavern();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reduce = typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!tavern || reduce) return;
    if (audioRef.current) return;
    const a = new Audio("/sounds/finly.ogg");
    a.preload = "auto";
    audioRef.current = a;
    return () => { audioRef.current = null; };
  }, [tavern, reduce]);

  const play = (name: SoundName) => {
    if (!tavern || reduce) return;
    const a = audioRef.current;
    if (!a) return;
    const slot = SLOTS[name];
    a.currentTime = slot.offset;
    a.play().catch(() => { /* autoplay blocked, ignore */ });
    setTimeout(() => { a.pause(); }, slot.duration * 1000);
  };

  return <SoundContext.Provider value={{ play }}>{children}</SoundContext.Provider>;
}
```

- [ ] **Step 3: `src/hooks/useSound.ts`**

```ts
"use client";
import { useSoundContext, SoundProvider, type SoundName } from "@/components/finly/Provider/SoundProvider";

export { SoundProvider };

export function useSound(name: SoundName) {
  const { play } = useSoundContext();
  return () => play(name);
}
```

- [ ] **Step 4: Wire в layout.tsx внутри TavernProvider, до AchievementProvider**

```tsx
<TavernProvider initialTavern={initialTavern}>
  <SoundProvider>
    <AchievementProvider>
      ...
    </AchievementProvider>
  </SoundProvider>
</TavernProvider>
```

- [ ] **Step 5: Tests + build + commit**

```bash
npm run test && npm run build
git add public/sounds src/components/finly src/hooks/useSound.ts src/app/layout.tsx
git commit -m "feat(theme): SoundProvider + Tavern-aware muting (A.4 T24)"
git push origin mfa-a2-auth-ui
```

---

## Task 25: /404 + final wiring

**Files:**
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: `src/app/not-found.tsx`**

```tsx
import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";

export default function NotFound() {
  return (
    <FinlyEmptyState
      pose="not-found"
      title="Карта потеряна"
      body="Этой страницы здесь нет. Сэр-исследователь развернул карту вверх ногами."
      cta={{ label: "Вернуться на дашборд", href: "/" }}
    />
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/app/not-found.tsx
git commit -m "feat(redesign): /404 with mascot (A.4 T25)"
git push origin mfa-a2-auth-ui
```

---

## Task 26: Dashboard numbers regression test

**Files:**
- Create: `convex/dashboard.regression.test.ts`

- [ ] **Step 1: Snapshot-тест на seed-данных**

Используй `convex-test` (если подключён) или mock через `useQuery`. Цель: на фиксированном наборе seed-данных вызвать `dashboard.metrics` и сравнить с зафиксированным набором числовых значений.

```ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("dashboard numbers regression (T26)", () => {
  it("metrics для seed-shop совпадают с зафиксированным snapshot", async () => {
    const t = convexTest(schema);
    // Вставить минимальный seed: 1 user, 1 shop, 5 SKU, ~10 sales, 2 returns
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "u@x.com", status: "approved" });
      const orgId = await ctx.db.insert("organizations", { name: "T", ownerId: userId, createdAt: 1 });
      const shopId = await ctx.db.insert("shops", {
        name: "Test",
        platform: "WB",
        orgId,
        ownerId: userId,
        isActive: true,
        // ... минимальные обязательные поля
      });
      // 10 sales × 1000 ₽
      for (let i = 0; i < 10; i++) {
        await ctx.db.insert("sales", { /* поля по schema, sumRub: 1000 */ } as any);
      }
    });
    const metrics = await t.query(api.dashboard.metrics, { /* args, период покрывающий seed */ });
    expect(metrics.revenue).toBe(10000);
    expect(metrics.returns).toBe(/* expected */);
    expect(metrics.profit).toBeCloseTo(/* expected, 0.01 */, 2);
  });
});
```

(Если `convex-test` не подключён, отметить в плане как `// TODO: convert when convex-test is available` и сделать unit-уровневый тест на чисто функциональной части расчёта в `src/lib/metrics.ts` или подобном.)

- [ ] **Step 2: Run test**

Run: `npx vitest run convex/dashboard.regression.test.ts`
Expected: PASS на корректных значениях.

- [ ] **Step 3: Commit**

```bash
git add convex/dashboard.regression.test.ts
git commit -m "test(dashboard): regression snapshot для metrics (A.4 T26)"
git push origin mfa-a2-auth-ui
```

---

## Task 27: Manual smoke + Юрий-acceptance

**Files:** нет — финальное ручное тестирование.

- [ ] **Step 1: Запустить dev-сервер**

```bash
cd /home/iurii/MFA-repo && npm run dev -- --hostname 0.0.0.0 --port 3001
```

Открыть https://dev.finly-app.ru (Vercel preview / dev domain).

- [ ] **Step 2: Smoke-чеклист (Юрий проходит)**

- [ ] Логин — Hero-mascot слева, форма справа, primary-orange CTA, заголовок Cinzel.
- [ ] Регистрация — то же.
- [ ] Pending-approval после signup — empty-shops mascot.
- [ ] После approve через `/admin/users` — переход на дашборд, видны 4 FinlyMetricTile с цифрами.
- [ ] Цифры дашборда **совпадают с тем, что было до A.4** (сверь со скриншотом или логами).
- [ ] Hover на FinlyMetricTile — tilt-эффект, золотой glow.
- [ ] ThemeToggle: переключение light → dark → system, FOUC отсутствует, цифры читаются на обоих темах.
- [ ] TavernToggle в `/settings`: включил → tavern класс на html, фоновое мерцание включается.
- [ ] Звуки в Tavern Mode — если sprite реальный, проверить click и achievement.
- [ ] PeriodSelector работает, цифры обновляются.
- [ ] Внутренние страницы (analytics, pulse, products, financials, prices, returns, feedbacks, settings) — все рендерятся, токены применены, AuthGate корректно работает (pending-юзер не падает).
- [ ] /achievements — список плашек если есть, иначе empty-state.
- [ ] Footer виден на каждой странице, ссылка @Virtuozick кликается, /legal/privacy и /legal/terms открываются.
- [ ] /404 показывает not-found mascot.
- [ ] OrgSwitcher работает (если у юзера >1 org).
- [ ] Mobile (≤md): TopNav schiltает на бургер, drawer открывается; FinlyAuthLayout — mascot скрыт, форма центрирована.
- [ ] AuthGate-смоук: на pending-юзере все страницы редиректят на /pending-approval без краша.
- [ ] Achievement-toast: создать новый магазин (если нет других) → должен появиться toast «Первый магазин!» с mascot.

- [ ] **Step 3: Если smoke прошёл — финальный merge**

```bash
# Marker для перехода
echo "A.4 smoke passed $(date -Iseconds)" >> docs/superpowers/plans/2026-04-28-finly-a4-redesign.md
git add docs/superpowers/plans/2026-04-28-finly-a4-redesign.md
git commit -m "chore(A.4): smoke passed, ready for review"
git push origin mfa-a2-auth-ui
```

PR #3 в этот момент — A.1 + A.2 + A.3 + A.4 — помечается **ready for review** на GitHub.

---

## Self-review против spec

| Спек-секция | Покрыто в Task | Notes |
|---|---|---|
| §1 Цель/scope | T1–T27 целиком |  |
| §2 IP-ограничения | T8 (комменты в SVG) + T22 (промпты в спеке, ссылка) | Спек §6.3 — единственное место для IP-чеклиста |
| §3.1 Палитра токенов | T2 |  |
| §3.2 Cinzel | T3 |  |
| §3.3 Радиусы | T2 (radius-frame, radius-pill) |  |
| §3.4 Тени | T2 (через arbitrary в `shadow-treasure`/`shadow-tide`) | Имена-классы для тестов; реальные значения в FinlyMetricTile/Card |
| §3.5 Motion | T2 (ease-tilt) + T12 (tile hover) |  |
| §4.1 ThemeProvider | T6 |  |
| §4.2 Tavern Mode | T7 + T2 (.tavern CSS) |  |
| §4.3 Schema delta | T4 |  |
| §4.4 Mutations | T5 |  |
| §5.1 finly/ структура | T6–T14 покрывают все компоненты + 4 провайдера в T6/T7/T23/T24 |  |
| §5.2 Props | T10 (Card/Button/Badge), T12 (MetricTile), T13 (Chart/Table), T14 (AuthLayout), T9 (Mascot) |  |
| §5.3 Provider'ы | Theme T6, Tavern T7, Sound T24, Achievement T23 |  |
| §5.4 Wiring | T6 (Theme) + T7 (Tavern) + T16 (Footer) + T23 (Achievement) + T24 (Sound) |  |
| §6.1 Места поз | T15 (nav-icon), T17 (hero/empty-shops/empty-data), T11 (FinlyEmptyState ↔ pose), T23 (achievement), T25 (not-found) |  |
| §6.2 File structure | T8 (SVG плейсхолдеры) + T9 (picture+source) |  |
| §6.3 GPT-промпты | Юрий генерит после T9 — T8 содержит TODO-комменты ссылающиеся на спек §6.3 |  |
| §7 Покрытие страниц | T17 (auth) + T18 (dashboard) + T19/T20/T21 (internal) + T25 (404) |  |
| §8.1 TopNav | T15 |  |
| §8.2 Footer | T16 |  |
| §9.1 Schema userAchievements | T4 |  |
| §9.2 Backend functions | T22 |  |
| §9.3 Triggering points | T22 (shops trigger + dashboard detection + cron) |  |
| §9.4 UI achievement | T23 |  |
| §10 AuthGate refactor | T1 |  |
| §11 Тестирование | T1 (auth-gate-coverage) + T2 (tokens) + T6/T7 (provider tests) + T9/T10/T12 (component tests) + T22 (achievements idempotent) + T26 (regression) |  |
| §12 Sequencing | Соответствует T1–T27 |  |
| §13 Риски | Cinzel/iOS/autoplay — упомянуты в коде/комментах T2/T7/T24 |  |
| §14 Out of scope | Не в плане (Юрий генерит позже / отдельные планы) |  |
| §15 Open/TBD | Решено в шапке плана: branch = `mfa-a2-auth-ui`; T15 — internal pages в 3 батча (T19/T20/T21) |  |

**Placeholder scan:** ✅ нет TBD/TODO внутри Task-кода (TODO-комменты в SVG-плейсхолдерах и `public/sounds/README.md` — это intentional placeholders для замены ассетами, не плановые пробелы).

**Type consistency:**
- `MascotPose` определён в T9, используется в T11/T17/T18/T23/T25 — единое имя ✓
- `Theme = "light" | "dark" | "system"` — T5/T6 ✓
- `userAchievements` schema — T4, query/mutation — T22, refs — T22, UI — T23 ✓
- `usersUpdate*` mutations — T5 имена, T6/T7 потребление ✓

Type-имена согласованы.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-finly-a4-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, я ревьюю между тасками, быстрая итерация.

**2. Inline Execution** — выполняем таски в текущей сессии через executing-plans, batch с чекпойнтами.

**Какой подход берём?**
