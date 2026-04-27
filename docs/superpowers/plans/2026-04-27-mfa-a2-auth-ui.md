# MFA-A.2 — Auth UI + middleware + ensureShopAccess

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) или `superpowers:executing-plans` для исполнения task-by-task. Шаги используют чекбокс-синтаксис `- [ ]` для трекинга. Каждая задача — самодостаточный коммит.

**Goal:** Завершить multi-tenant цепочку: посадить Convex Auth provider на frontend, защитить все backend handlers `ensureShopAccess`/`ensureOrgMember`, добавить Next.js middleware с pending/rejected gate, и реализовать 7 страниц auth UI (`/login`, `/register`, `/verify-email`, `/pending-approval`, `/rejected`, `/forgot-password`, `/reset-password`). Юрий после plan'а сможет залогиниться через `forgot-password` и увидеть дашборд с реальными WB-shops.

**Architecture:** A.1 уже создал backend (auth-таблицы, `convex/auth.ts`, helpers, mutations, email actions, миграция). A.2 — это frontend + закрытие backend handlers. Базовый паттерн: `ConvexAuthProvider` оборачивает приложение, новые `*Mine`-queries (`shops:listMine`, `shops:getMine`) фильтруют по orgId юзера и существуют параллельно со старыми (старые помечаются `@deprecated`, удаляются в A.3). Все старые публичные handlers получают `await ensureShopAccess(ctx, shopId)` или `await ensureOrgMember(ctx, orgId)` первой строкой. Middleware смотрит на сессию + `users.status`, редиректит pending/rejected. Auth UI использует `signIn`/`signOut` из `@convex-dev/auth/react`.

**Tech Stack:** Next.js 16 App Router, React 19, Convex 1.32+, `@convex-dev/auth` ^0.0.91 + `@auth/core` ^0.37.4, `convex/react`, Tailwind CSS 4, `vitest` 4 + `@testing-library/react` (добавляем).

**Spec:** `docs/superpowers/specs/2026-04-24-mfa-auth-multitenancy-design.md`
**Roadmap:** `docs/superpowers/plans/2026-04-27-mfa-a-roadmap.md`
**Предыдущая фаза:** `docs/superpowers/plans/2026-04-27-mfa-a1-schema-backend.md`

**Branch:** Создать от текущего `mfa-a1-schema-backend`:
```bash
git checkout mfa-a1-schema-backend
git checkout -b mfa-a2-auth-ui
```

**Deployment:** Все изменения деплоить на dev `energized-wolverine-691` (через `npx convex dev` или `npx convex deploy`). Prod `pastel-roadrunner-718` НЕ трогать до завершения A.2 + ручного smoke-теста.

**Pre-conditions (на 2026-04-27 уже выполнены):**
- ✅ A.1 закоммичен в `mfa-a1-schema-backend` (6 коммитов)
- ✅ Convex env vars выставлены: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `ADMIN_EMAIL`
- ✅ Бэкап prod в `~/mfa-backups/mfa-prod-2026-04-27.zip`
- ✅ Юрий-юзер существует на dev (`status: approved`, `isSystemAdmin: true`, без пароля)

---

## Phase 1 — Frontend Auth Provider

### Task 1: Заменить ConvexProvider на ConvexAuthNextjsProvider

**Files:**
- Modify: `src/components/ConvexClientProvider.tsx`
- Test: `src/components/ConvexClientProvider.test.tsx` (создать)

- [ ] **Step 1: Установить middleware-helper пакет**

`@convex-dev/auth` уже стоит. Дополнительно нужен Next.js helper для middleware (на Phase 3).

```bash
cd /home/iurii/MFA-repo
npm install @convex-dev/auth@^0.0.91
```

(уже стоит — команда no-op; запускаем для гарантии lockfile-актуальности).

- [ ] **Step 2: Написать тест на отсутствие convex URL**

Создать `src/components/ConvexClientProvider.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ConvexClientProvider } from "./ConvexClientProvider";

describe("ConvexClientProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders fallback when NEXT_PUBLIC_CONVEX_URL not set", () => {
    const original = process.env.NEXT_PUBLIC_CONVEX_URL;
    process.env.NEXT_PUBLIC_CONVEX_URL = "";
    const { getByText } = render(
      <ConvexClientProvider><span>child</span></ConvexClientProvider>
    );
    expect(getByText(/Convex не настроен/)).toBeTruthy();
    process.env.NEXT_PUBLIC_CONVEX_URL = original;
  });
});
```

- [ ] **Step 3: Установить @testing-library/react если ещё нет**

```bash
npm install -D @testing-library/react@^16 @testing-library/jest-dom@^6 jsdom@^25
```

Обновить `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Создать `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Run test — должен FAIL (provider всё ещё ConvexProvider, тест проходит — но env=node не читает jsdom; пере-прогон должен уже работать)**

```bash
npm test -- src/components/ConvexClientProvider.test.tsx
```

Expected: PASS (старый ConvexProvider тоже рендерит fallback).

- [ ] **Step 5: Заменить на ConvexAuthNextjsProvider**

Перезаписать `src/components/ConvexClientProvider.tsx`:

```tsx
"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
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
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
```

- [ ] **Step 6: Re-run test, typecheck, build**

```bash
npm test -- src/components/ConvexClientProvider.test.tsx
npm run typecheck
```

Expected: оба PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ConvexClientProvider.tsx src/components/ConvexClientProvider.test.tsx vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "feat(auth): wire ConvexAuthNextjsProvider on frontend (A.2 phase 1)"
```

---

### Task 2: Convex query `users:current` + типизированный ref

**Files:**
- Create: `convex/users.ts`
- Modify: `src/lib/convex-refs.ts:1`
- Test: `convex/users.test.ts` (создать)

- [ ] **Step 1: Написать failing-тест на форму ответа**

Создать `convex/users.test.ts`:

```ts
import { describe, it, expect } from "vitest";
// Smoke-тест: проверяем что модуль грузится и экспорт current — query.
import * as users from "./users";

describe("convex/users", () => {
  it("exports `current` as a Convex query", () => {
    expect(users.current).toBeDefined();
    expect(typeof users.current).toBe("function");
  });
});
```

- [ ] **Step 2: Run — должен FAIL (нет файла convex/users.ts)**

```bash
npm test -- convex/users.test.ts
```

Expected: FAIL `Cannot find module './users'`.

- [ ] **Step 3: Создать convex/users.ts**

```ts
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    // Не возвращаем internal/Convex Auth поля наружу
    return {
      _id: user._id,
      email: user.email ?? "",
      name: user.name ?? "",
      phone: user.phone ?? "",
      businessName: user.businessName ?? "",
      shopsCountWB: user.shopsCountWB ?? 0,
      shopsCountOzon: user.shopsCountOzon ?? 0,
      skuCount: user.skuCount ?? 0,
      status: user.status ?? "pending",
      isSystemAdmin: user.isSystemAdmin ?? false,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      createdAt: user.createdAt ?? 0,
    };
  },
});
```

- [ ] **Step 4: Добавить ref в src/lib/convex-refs.ts**

Вставить **после блока `// ───────────────── shops`** (строка ~31):

```ts
// ───────────────── users
export type CurrentUser = {
  _id: Id<"users">;
  email: string;
  name: string;
  phone: string;
  businessName: string;
  shopsCountWB: number;
  shopsCountOzon: number;
  skuCount: number;
  status: "pending" | "approved" | "rejected";
  isSystemAdmin: boolean;
  emailVerifiedAt: number | null;
  createdAt: number;
};

export const usersCurrentRef = "users:current" as unknown as Q<
  Record<string, never>,
  CurrentUser | null
>;
```

- [ ] **Step 5: Запустить convex deploy чтобы зарегистрировать функцию**

```bash
npx convex dev --once
```

Expected: успешный деплой, в выводе `users.current` появится в списке функций.

- [ ] **Step 6: Re-run test + typecheck**

```bash
npm test -- convex/users.test.ts
npm run typecheck
```

Expected: оба PASS.

- [ ] **Step 7: Commit**

```bash
git add convex/users.ts convex/users.test.ts src/lib/convex-refs.ts
git commit -m "feat(auth): users.current query + CurrentUser ref"
```

---

### Task 3: Хук `useCurrentUser` + UI-компоненты `<AuthLoading>` / `<Authenticated>`

**Files:**
- Create: `src/hooks/useCurrentUser.ts`
- Create: `src/components/auth/AuthGate.tsx`
- Test: `src/hooks/useCurrentUser.test.tsx`

- [ ] **Step 1: Failing-тест на selector логику (без Convex моков, чисто проверка типа return)**

Создать `src/hooks/useCurrentUser.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { useCurrentUser } from "./useCurrentUser";

describe("useCurrentUser", () => {
  it("is exported as a function", () => {
    expect(typeof useCurrentUser).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL (нет файла)**

```bash
npm test -- src/hooks/useCurrentUser.test.tsx
```

- [ ] **Step 3: Создать `src/hooks/useCurrentUser.ts`**

```ts
"use client";
import { useQuery } from "convex/react";
import { usersCurrentRef, type CurrentUser } from "@/lib/convex-refs";

/**
 * Возвращает текущего юзера или null/undefined.
 * - undefined — query loading
 * - null — нет сессии или юзер удалён
 * - CurrentUser — залогинен
 */
export function useCurrentUser(): CurrentUser | null | undefined {
  return useQuery(usersCurrentRef);
}
```

- [ ] **Step 4: Создать `src/components/auth/AuthGate.tsx`**

```tsx
"use client";
import { ReactNode } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Обёртка для приватных страниц: показывает loader пока юзер undefined,
 * редирект на /login при null, content при наличии user.
 * Реальная блокировка по статусу — в src/middleware.ts (см. Task 14).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const user = useCurrentUser();

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Загрузка…
      </div>
    );
  }

  if (user === null) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Run test + typecheck**

```bash
npm test -- src/hooks/useCurrentUser.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCurrentUser.ts src/hooks/useCurrentUser.test.tsx src/components/auth/AuthGate.tsx
git commit -m "feat(auth): useCurrentUser hook + AuthGate component"
```

---

## Phase 2 — Backend ensureShopAccess / ensureOrgMember

> **Принцип:** каждый публичный handler первой строкой делает `await ensureShopAccess(ctx, shopId)` (когда работает с конкретным shopId) или итерируется по `await listUserShopIds(ctx)` (когда `shopId` не передан, бывший «все магазины»). Internal-handlers (`internalQuery`/`internalMutation`/`internalAction`) — без проверки, т.к. вызываются только из cron-ов или actions.

### Task 4: `shops:listMine` + `shops:getMine` + `org:listMine` (новые ref-ы)

**Files:**
- Modify: `convex/shops.ts`
- Create: `convex/org/me.ts`
- Modify: `src/lib/convex-refs.ts:31` (добавить refs после shopsListRef)
- Test: `convex/shops.listMine.test.ts` (создать — smoke export check)

- [ ] **Step 1: Failing test**

`convex/shops.listMine.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import * as shops from "./shops";

describe("convex/shops listMine", () => {
  it("exports listMine as a function", () => {
    expect(typeof shops.listMine).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Добавить `listMine` в `convex/shops.ts`**

В конец файла:

```ts
import { ensureApproved, listUserShopIds } from "./lib/helpers";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    await ensureApproved(ctx);
    const shopIds = await listUserShopIds(ctx);
    const shops = await Promise.all(shopIds.map((id) => ctx.db.get(id)));
    return shops.filter((s): s is NonNullable<typeof s> => s !== null);
  },
});
```

`list` оставляем как есть на эту фазу (с пометкой deprecated в комментарии, удалится в A.3 — экосистема компонентов мигрируется в Phase 5):

В начало `list`:

```ts
/** @deprecated Use shops.listMine. Удалится в A.3 после миграции UI. */
export const list = query({...});
```

- [ ] **Step 4: Создать `convex/org/me.ts`**

```ts
import { query } from "../_generated/server";
import { ensureApproved } from "../lib/helpers";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await ensureApproved(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        if (!org) return null;
        return {
          orgId: org._id,
          name: org.name,
          role: m.role,
          ownerId: org.ownerId,
        };
      })
    );
    return orgs.filter((o): o is NonNullable<typeof o> => o !== null);
  },
});
```

- [ ] **Step 5: Добавить refs в `src/lib/convex-refs.ts`**

Перед `shopsAddRef` блоком:

```ts
export const shopsListMineRef = "shops:listMine" as unknown as Q<
  Record<string, never>,
  Doc<"shops">[]
>;
```

В конец файла:

```ts
// ───────────────── orgs
export const orgListMineRef = "org/me:listMine" as unknown as Q<
  Record<string, never>,
  Array<{
    orgId: Id<"organizations">;
    name: string;
    role: "owner" | "member";
    ownerId: Id<"users">;
  }>
>;
```

- [ ] **Step 6: Deploy + run tests**

```bash
npx convex dev --once
npm test -- convex/shops.listMine.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add convex/shops.ts convex/org/me.ts src/lib/convex-refs.ts convex/shops.listMine.test.ts
git commit -m "feat(auth): shops.listMine + org/me.listMine queries (A.2 phase 2)"
```

---

### Task 5: `shops.ts` — все публичные handlers закрыть auth

**Files:**
- Modify: `convex/shops.ts`

- [ ] **Step 1: Failing test (структурная проверка)**

`convex/shops.auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/shops auth coverage", () => {
  const src = readFileSync("convex/shops.ts", "utf8");

  it.each(["add", "remove", "setActive", "updateCategories", "getSyncLog"])(
    "%s handler calls ensureShopAccess or ensureOrgOwner",
    (fn) => {
      const fnRegex = new RegExp(`export const ${fn} = mutation|export const ${fn} = query`);
      expect(src).toMatch(fnRegex);
      // Грубая проверка: после объявления функции до закрывающей `});`
      // должна встречаться помощь helpers.
      const idx = src.search(fnRegex);
      const slice = src.slice(idx, idx + 1500);
      expect(slice).toMatch(/ensure(ShopAccess|OrgOwner|OrgMember|Approved)/);
    }
  );
});
```

- [ ] **Step 2: Run — FAIL (`add` не зовёт ensure)**

- [ ] **Step 3: Перепишем `convex/shops.ts`**

Полная новая версия:

```ts
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  ensureApproved,
  ensureOrgOwner,
  ensureShopAccess,
  listUserShopIds,
} from "./lib/helpers";

/** @deprecated Use shops.listMine. Удалится в A.3 после миграции UI. */
export const list = query({
  handler: async (ctx) => {
    await ensureApproved(ctx);
    const shopIds = await listUserShopIds(ctx);
    const shops = await Promise.all(shopIds.map((id) => ctx.db.get(id)));
    return shops.filter((s): s is NonNullable<typeof s> => s !== null);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    await ensureApproved(ctx);
    const shopIds = await listUserShopIds(ctx);
    const shops = await Promise.all(shopIds.map((id) => ctx.db.get(id)));
    return shops.filter((s): s is NonNullable<typeof s> => s !== null);
  },
});

export const listInternal = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("shops").collect();
  },
});

export const add = mutation({
  args: {
    orgId: v.id("organizations"),
    marketplace: v.union(v.literal("wb"), v.literal("ozon")),
    name: v.string(),
    apiKey: v.string(),
    ozonClientId: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, marketplace, name, apiKey, ozonClientId }) => {
    await ensureOrgOwner(ctx, orgId);
    return await ctx.db.insert("shops", {
      orgId,
      marketplace,
      name,
      apiKey,
      ozonClientId,
      isActive: true,
      lastSyncAt: undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("shops") },
  handler: async (ctx, { id }) => {
    const { shop, membership } = await ensureShopAccess(ctx, id);
    if (membership.role !== "owner") throw new Error("forbidden: only owner can delete shops");
    void shop;
    await ctx.db.delete(id);
  },
});

export const setActive = mutation({
  args: { id: v.id("shops"), isActive: v.boolean() },
  handler: async (ctx, { id, isActive }) => {
    await ensureShopAccess(ctx, id);
    await ctx.db.patch(id, { isActive });
  },
});

export const updateLastSync = internalMutation({
  args: { id: v.id("shops") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { lastSyncAt: Date.now() });
  },
});

export const updateCategories = mutation({
  args: {
    id: v.id("shops"),
    enabledCategories: v.array(v.string()),
  },
  handler: async (ctx, { id, enabledCategories }) => {
    await ensureShopAccess(ctx, id);
    await ctx.db.patch(id, { enabledCategories });
  },
});

export const enableAllCategoriesForAll = internalMutation({
  handler: async (ctx) => {
    const all = [
      "statistics", "promotion", "analytics",
      "content", "feedbacks", "prices", "returns", "tariffs",
    ];
    const shops = await ctx.db.query("shops").collect();
    for (const s of shops) {
      await ctx.db.patch(s._id, { enabledCategories: all });
    }
  },
});

export const getSyncLog = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await ensureShopAccess(ctx, shopId);
    const logs = await ctx.db
      .query("syncLog")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .order("desc")
      .take(100);
    return logs;
  },
});
```

- [ ] **Step 4: Run test + typecheck + deploy**

```bash
npx convex dev --once
npm test -- convex/shops.auth.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/shops.ts convex/shops.auth.test.ts
git commit -m "feat(auth): close shops.* handlers with ensureShopAccess (A.2 phase 2)"
```

---

### Task 6: `dashboard.ts` — закрыть 11 queries

**Files:**
- Modify: `convex/dashboard.ts`

- [ ] **Step 1: Failing test**

`convex/dashboard.auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/dashboard auth coverage", () => {
  const src = readFileSync("convex/dashboard.ts", "utf8");
  const handlers = [
    "getOrders", "getSales", "getStocks", "getFinancials", "getCampaigns",
    "getNmReports", "getProductCards", "getFeedbacks", "getQuestions",
    "getPrices", "getReturns", "getCosts",
  ];

  it.each(handlers)("%s calls ensureShopAccess or listUserShopIds", (fn) => {
    const idx = src.indexOf(`export const ${fn} = query`);
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 2500);
    expect(slice).toMatch(/ensure(ShopAccess|Approved)|listUserShopIds/);
  });
});
```

- [ ] **Step 2: Run — FAIL для всех**

- [ ] **Step 3: Перепишем `convex/dashboard.ts`**

В начало файла:

```ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { ensureShopAccess, listUserShopIds } from "./lib/helpers";
```

Паттерн рефакторинга для каждой query (применить ко всем 11 + 1):

**До** (пример `getOrders`):
```ts
handler: async (ctx, { shopId, dateFrom, dateTo }) => {
  if (shopId) {
    return await ctx.db.query("orders").withIndex(...);
  }
  const shops = await ctx.db.query("shops").collect();
  ...
}
```

**После:**
```ts
handler: async (ctx, { shopId, dateFrom, dateTo }) => {
  if (shopId) {
    await ensureShopAccess(ctx, shopId);
    return await ctx.db
      .query("orders")
      .withIndex("by_shop_date", (q) =>
        q.eq("shopId", shopId).gte("date", dateFrom).lte("date", dateTo)
      )
      .collect();
  }
  const shopIds = await listUserShopIds(ctx);
  const results = await Promise.all(
    shopIds.map((sid) =>
      ctx.db
        .query("orders")
        .withIndex("by_shop_date", (q) =>
          q.eq("shopId", sid).gte("date", dateFrom).lte("date", dateTo)
        )
        .collect()
    )
  );
  return results.flat();
},
```

Применить тот же паттерн к: `getSales`, `getFinancials`, `getCampaigns`, `getNmReports`, `getReturns`. Для `getStocks`, `getProductCards` — у них `shopId` обязательный, просто добавить `await ensureShopAccess(ctx, shopId)` первой строкой. Для `getCosts`, `getPrices`, `getFeedbacks`, `getQuestions` — `shopId` optional, паттерн как в `getOrders`.

- [ ] **Step 4: Run + typecheck + deploy**

```bash
npx convex dev --once
npm test -- convex/dashboard.auth.test.ts
npm run typecheck
```

Expected: PASS все 12 тестов.

- [ ] **Step 5: Commit**

```bash
git add convex/dashboard.ts convex/dashboard.auth.test.ts
git commit -m "feat(auth): close dashboard.* queries with ensureShopAccess (A.2 phase 2)"
```

---

### Task 7: `analytics.ts` — закрыть `getSalesAnalytics`

**Files:**
- Modify: `convex/analytics.ts`

- [ ] **Step 1: Failing test**

`convex/analytics.auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/analytics auth coverage", () => {
  it("getSalesAnalytics calls ensureShopAccess or listUserShopIds", () => {
    const src = readFileSync("convex/analytics.ts", "utf8");
    const idx = src.indexOf("export const getSalesAnalytics = query");
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx);
    expect(slice).toMatch(/ensure(ShopAccess|Approved)|listUserShopIds/);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Apply paste**

В импортах сверху:

```ts
import { ensureShopAccess, listUserShopIds } from "./lib/helpers";
```

В начало handler-а `getSalesAnalytics`:

```ts
handler: async (ctx, { shopId, dateFrom, dateTo, groupBy }) => {
  if (shopId) {
    await ensureShopAccess(ctx, shopId);
  } else {
    // Принудительно ограничить запрос магазинами текущего юзера
    const userShopIds = await listUserShopIds(ctx);
    if (userShopIds.length === 0) return [];
    // (далее существующий код, но `shops = await ctx.db.query("shops").collect()`
    // заменить на:)
  }
  // ... остальной существующий код
}
```

И в существующем коде где `const shops = await ctx.db.query("shops").collect();` — заменить на:

```ts
const userShopIds = shopId ? [shopId] : await listUserShopIds(ctx);
const shops = await Promise.all(userShopIds.map((id) => ctx.db.get(id)));
const shopsFiltered = shops.filter((s): s is NonNullable<typeof s> => s !== null);
```

И ниже `shops` → `shopsFiltered`.

- [ ] **Step 4: Run + typecheck + deploy**

```bash
npx convex dev --once
npm test -- convex/analytics.auth.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/analytics.ts convex/analytics.auth.test.ts
git commit -m "feat(auth): close analytics.getSalesAnalytics (A.2 phase 2)"
```

---

### Task 8: `financials.ts` — закрыть `getReports` и `clearByShop`

**Files:**
- Modify: `convex/financials.ts`

- [ ] **Step 1: Failing test**

`convex/financials.auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/financials auth coverage", () => {
  const src = readFileSync("convex/financials.ts", "utf8");
  it.each(["getReports", "clearByShop"])("%s calls ensure helper", (fn) => {
    const idx = src.indexOf(`export const ${fn} =`);
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 1200);
    expect(slice).toMatch(/ensure(ShopAccess|Approved)|listUserShopIds/);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Применить рефактор**

В импортах:

```ts
import { ensureShopAccess, listUserShopIds } from "./lib/helpers";
```

`getReports` — паттерн как в Task 6 (`shopId` optional → `ensureShopAccess` или `listUserShopIds`).

`clearByShop` — `await ensureShopAccess(ctx, shopId)` первой строкой.

Если в файле есть другие публичные handlers (проверить через grep), применить тот же паттерн.

- [ ] **Step 4: Run + typecheck + deploy**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/financials.ts convex/financials.auth.test.ts
git commit -m "feat(auth): close financials.* handlers (A.2 phase 2)"
```

---

### Task 9: `costs.ts` — закрыть mutations + queries

**Files:**
- Modify: `convex/costs.ts`

- [ ] **Step 1: Failing test**

`convex/costs.auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/costs auth coverage", () => {
  const src = readFileSync("convex/costs.ts", "utf8");
  it.each(["upsertCost", "upsertBulk", "listByShop"])("%s calls ensureShopAccess", (fn) => {
    const idx = src.indexOf(`export const ${fn} =`);
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 1500);
    expect(slice).toMatch(/ensureShopAccess/);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Add `await ensureShopAccess(ctx, shopId)` в каждый handler первой строкой**

Импорт:

```ts
import { ensureShopAccess } from "./lib/helpers";
```

Каждая публичная функция (`upsertCost`, `upsertBulk`, `listByShop` — проверить весь файл):

```ts
handler: async (ctx, { shopId, ... }) => {
  await ensureShopAccess(ctx, shopId);
  // ... rest
}
```

- [ ] **Step 4: Run + typecheck + deploy**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/costs.ts convex/costs.auth.test.ts
git commit -m "feat(auth): close costs.* handlers (A.2 phase 2)"
```

---

### Task 10: `actions.ts` — `triggerSync`, `fetchAnalytics` через `ensureShopAccess`

**Files:**
- Modify: `convex/actions.ts`

> **Контекст:** В A.1 файл помечен `@ts-nocheck` из-за TS2589. Здесь не снимаем (Task 26 это сделает после полного рефакторинга), а просто добавляем `ensureShopAccess` в auth-проверке.

- [ ] **Step 1: Failing test**

`convex/actions.auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("convex/actions auth coverage", () => {
  const src = readFileSync("convex/actions.ts", "utf8");
  it.each(["triggerSync", "fetchAnalytics"])("%s calls ensureShopAccess", (fn) => {
    const idx = src.indexOf(`export const ${fn} = action`);
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 1500);
    expect(slice).toMatch(/ensureShopAccess/);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Patch `convex/actions.ts`**

Из-за `@ts-nocheck` импорт типизированного helper не сработает напрямую — actions не имеют доступа к `ctx.db`. Решение: создать internal-mutation, которая делает auth check, и вызывать её первой строкой каждого action.

Создать `convex/lib/authActions.ts`:

```ts
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureShopAccess } from "./helpers";

export const verifyShopAccess = internalMutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await ensureShopAccess(ctx, shopId);
    return { ok: true };
  },
});
```

В `convex/lib/syncRefs.ts` добавить ref:

```ts
export const verifyShopAccessRef = "lib/authActions:verifyShopAccess" as unknown as FunctionReference<
  "mutation",
  "internal",
  { shopId: Id<"shops"> },
  { ok: true }
>;
```

В `convex/actions.ts` патчим оба handler-а. Вверху файла (после `import { internal }`) добавить:

```ts
import { verifyShopAccessRef } from "./lib/syncRefs";
```

В начало handler-а `triggerSync`:

```ts
handler: async (ctx, { shopId }) => {
  await ctx.runMutation(verifyShopAccessRef, { shopId });
  // ... остальной существующий код
}
```

То же для `fetchAnalytics` и любого другого публичного `action` в файле.

- [ ] **Step 4: Run + typecheck + deploy**

Expected: PASS. Если TypeScript ругается из-за `@ts-nocheck` — норма (файл всё ещё не строгий, рефакторинг — Task 26).

- [ ] **Step 5: Commit**

```bash
git add convex/actions.ts convex/lib/authActions.ts convex/lib/syncRefs.ts convex/actions.auth.test.ts
git commit -m "feat(auth): close actions.* via verifyShopAccess mutation (A.2 phase 2)"
```

---

### Task 11: `sync.ts` + `syncAll.ts` — публичные handlers удалить

**Files:**
- Modify: `convex/sync.ts`
- Modify: `convex/syncAll.ts`

> **Решение:** Все sync/syncAll функции должны быть `internalAction`/`internalMutation`. Если есть публичные `action`/`mutation`/`query` — заменяем на internal. Это automatically закрывает их от внешних вызовов.

- [ ] **Step 1: Failing test**

`convex/sync.no-public.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("sync.ts and syncAll.ts have no public handlers", () => {
  it.each(["convex/sync.ts", "convex/syncAll.ts"])("%s exports only internal*", (file) => {
    const src = readFileSync(file, "utf8");
    // Не должно быть `= action(`, `= mutation(`, `= query(` без internal-префикса
    const publicMatches = src.match(/=\s*(action|mutation|query)\s*\(/g) ?? [];
    // Допустимы только internal-варианты
    expect(publicMatches.filter((m) => !m.includes("internal"))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run**

Если уже все internal — PASS, переход к Step 5. Если нет — FAIL, переход к Step 3.

- [ ] **Step 3: Заменить любые `action(`/`mutation(`/`query(` на `internalAction(`/`internalMutation(`/`internalQuery(` в `convex/sync.ts` и `convex/syncAll.ts`**

После замены проверить, что соответствующие refs в `convex/lib/syncRefs.ts` помечены как `"internal"` (а не `"public"`).

- [ ] **Step 4: Run + typecheck + deploy**

Expected: PASS.

- [ ] **Step 5: Commit (если изменения были)**

```bash
git add convex/sync.ts convex/syncAll.ts convex/sync.no-public.test.ts
git commit -m "test(auth): assert sync handlers are internal-only (A.2 phase 2)"
```

Если коммитить нечего (всё уже internal) — закоммитить только тест-файл.

---

### Task 12: Снять `@ts-nocheck` со всех файлов в `convex/`

**Files:**
- Modify: `convex/actions.ts`
- Modify: `convex/syncAll.ts`
- Modify: `convex/sync/*.ts` (все)

- [ ] **Step 1: Найти все `@ts-nocheck`**

```bash
grep -rl "@ts-nocheck" convex/
```

Expected list: `convex/actions.ts`, `convex/syncAll.ts`, `convex/sync/syncStatistics.ts`, `convex/sync/syncAnalytics.ts`, `convex/sync/syncContent.ts`, `convex/sync/syncFeedbacks.ts`, `convex/sync/syncPrices.ts`, `convex/sync/syncPromotion.ts`, `convex/sync/syncReturns.ts`, `convex/sync/syncTariffs.ts`.

- [ ] **Step 2: Удалить первую строку `// @ts-nocheck — ...` из каждого файла**

Для каждого файла из списка:

```bash
# Пример для одного файла, повторить для всех
sed -i '1{/@ts-nocheck/d}' convex/actions.ts
```

- [ ] **Step 3: Run typecheck — может FAIL с TS2589**

```bash
npm run typecheck
```

- [ ] **Step 4: Если FAIL — заменить `internal.<module>.<func>` импорты на string-refs**

Паттерн (для каждого `internal.X.Y` который ругается):

В соответствующем `convex/lib/syncRefs.ts` (или новом файле `convex/lib/<module>Refs.ts`) добавить:

```ts
export const xyRef = "X:Y" as unknown as FunctionReference<
  "action" | "mutation" | "query",  // выбрать тип
  "internal",
  { ...args }
>;
```

И в файле заменить `internal.X.Y` на `xyRef`. Иногда вместо `internal` нужно создать pre-resolved ref в `lib/syncRefs.ts` для подмодульных функций (для `internal.sync.syncStatistics.syncOrders` — ref `"sync/syncStatistics:syncOrders"`).

- [ ] **Step 5: Re-run typecheck до зелёного**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Run все тесты**

```bash
npm test
```

Expected: все PASS.

- [ ] **Step 7: Commit**

```bash
git add convex/
git commit -m "refactor(types): remove @ts-nocheck from convex/ — string refs everywhere (A.2 phase 2)"
```

---

### Task 13: `shops.add` UI-payload — orgId резолвится через `useCurrentOrg`

> **Замечание:** сам handler уже правильный (Task 5 закрыл). Теперь — frontend hook чтобы UI знал какую org передать.

**Files:**
- Create: `src/hooks/useCurrentOrg.ts`
- Test: `src/hooks/useCurrentOrg.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import { useCurrentOrg } from "./useCurrentOrg";

describe("useCurrentOrg", () => {
  it("is exported as a function", () => {
    expect(typeof useCurrentOrg).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Создать `src/hooks/useCurrentOrg.ts`**

```ts
"use client";
import { useQuery } from "convex/react";
import { orgListMineRef } from "@/lib/convex-refs";

export type CurrentOrg = {
  orgId: import("../../convex/_generated/dataModel").Id<"organizations">;
  name: string;
  role: "owner" | "member";
  ownerId: import("../../convex/_generated/dataModel").Id<"users">;
};

/**
 * Возвращает первую orgId юзера (для MVP при единственной org на юзера).
 * undefined — loading; null — нет org-ы (новый юзер до approval).
 */
export function useCurrentOrg(): CurrentOrg | null | undefined {
  const orgs = useQuery(orgListMineRef);
  if (orgs === undefined) return undefined;
  if (orgs.length === 0) return null;
  return orgs[0];
}
```

- [ ] **Step 4: Run + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCurrentOrg.ts src/hooks/useCurrentOrg.test.tsx
git commit -m "feat(auth): useCurrentOrg hook (A.2 phase 2)"
```

---

## Phase 3 — Next.js Middleware

### Task 14: `src/middleware.ts` с pending/rejected gate

**Files:**
- Create: `src/middleware.ts`
- Test: `src/middleware.test.ts`

- [ ] **Step 1: Failing test**

`src/middleware.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware, config } from "./middleware";

describe("middleware config matcher", () => {
  it("includes private routes", () => {
    expect(config.matcher).toBeDefined();
  });
});

describe("middleware behavior", () => {
  it("redirects unauthenticated user from / to /login", async () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: {},
    });
    // По умолчанию `convexAuthNextjsToken()` нет в request → unauthenticated
    const res = await middleware(req);
    if (res) {
      expect(res.status).toBeGreaterThanOrEqual(300);
      expect(res.status).toBeLessThan(400);
      expect(res.headers.get("location")).toMatch(/\/login/);
    } else {
      // допускается NextResponse.next() — тогда тест проверяет factory.
      // Но наша реализация должна редиректить — fail иначе.
      throw new Error("expected redirect to /login");
    }
  });
});
```

- [ ] **Step 2: Run — FAIL (нет файла)**

- [ ] **Step 3: Создать `src/middleware.ts`**

```ts
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/invite/(.*)",
  "/rejected",
  "/api/(.*)",
]);

const isPendingRoute = createRouteMatcher(["/pending-approval"]);

export const middleware = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuth = await convexAuth.isAuthenticated();

  if (!isPublicRoute(request) && !isAuth) {
    return nextjsMiddlewareRedirect(request, "/login");
  }

  if (isAuth) {
    // Авторизованный юзер на /login или /register → на дашборд
    if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") {
      return nextjsMiddlewareRedirect(request, "/");
    }
    // Pending/rejected gate — реальная проверка статуса делегирована client-side
    // компоненту AuthGate (он читает useCurrentUser и редиректит).
    // Middleware только защищает от unauthenticated.
  }
});

export const config = {
  matcher: [
    /*
     * Все роуты кроме _next, статики, favicon, sitemap.
     */
    "/((?!_next|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
```

- [ ] **Step 4: Run test**

```bash
npm test -- src/middleware.test.ts
```

Expected: PASS.

- [ ] **Step 5: Создать клиентский guard для status check**

Modify `src/components/auth/AuthGate.tsx` (расширить версию из Task 3):

```tsx
"use client";
import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function AuthGate({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user === null && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    if (!user) return;
    if (user.status === "pending" && pathname !== "/pending-approval") {
      router.replace("/pending-approval");
      return;
    }
    if (user.status === "rejected" && pathname !== "/rejected") {
      router.replace("/rejected");
      return;
    }
  }, [user, pathname, router]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Загрузка…
      </div>
    );
  }

  if (user === null) return null;
  if (user.status !== "approved") return null;
  return <>{children}</>;
}
```

И в `src/app/layout.tsx` обернуть `{children}` в `<AuthGate>` для приватных роутов через mini-component (см. Task 24, layout трогаем там).

- [ ] **Step 6: typecheck + test**

```bash
npm run typecheck
npm test
```

Expected: всё зелёное.

- [ ] **Step 7: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts src/components/auth/AuthGate.tsx
git commit -m "feat(auth): Next.js middleware + AuthGate status guard (A.2 phase 3)"
```

---

## Phase 4 — Auth UI (7 страниц)

### Task 15: `/login` page

**Files:**
- Create: `src/app/login/page.tsx`
- Test: `src/app/login/page.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import LoginPage from "./page";

describe("LoginPage", () => {
  it("is a valid React component", () => {
    expect(typeof LoginPage).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Создать страницу**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/");
    } catch (err) {
      setError((err as Error).message || "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Вход в MFA</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-1">
            <Label>Пароль</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Вход…" : "Войти"}
          </Button>
        </form>
        <div className="flex justify-between text-sm text-gray-600">
          <Link href="/forgot-password" className="hover:underline">Забыли пароль?</Link>
          <Link href="/register" className="hover:underline">Регистрация</Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run + typecheck**

```bash
npm test -- src/app/login/page.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx src/app/login/page.test.tsx
git commit -m "feat(auth): /login page (A.2 phase 4)"
```

---

### Task 16: `/register` page (8 полей)

**Files:**
- Create: `src/app/register/page.tsx`
- Test: `src/app/register/page.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import RegisterPage from "./page";

describe("RegisterPage", () => {
  it("is a valid component", () => {
    expect(typeof RegisterPage).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Создать страницу**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    businessName: "",
    shopsCountWB: "0",
    shopsCountOzon: "0",
    skuCount: "0",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn("password", {
        flow: "signUp",
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        businessName: form.businessName,
        shopsCountWB: Number(form.shopsCountWB),
        shopsCountOzon: Number(form.shopsCountOzon),
        skuCount: Number(form.skuCount),
      });
      router.push("/pending-approval");
    } catch (err) {
      setError((err as Error).message || "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Регистрация в MFA</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Email *">
            <Input type="email" value={form.email} onChange={update("email")} required autoComplete="email" />
          </Field>
          <Field label="Пароль * (мин. 8 символов, цифра + буква)">
            <Input type="password" value={form.password} onChange={update("password")} required autoComplete="new-password" minLength={8} />
          </Field>
          <Field label="Имя *">
            <Input value={form.name} onChange={update("name")} required minLength={2} />
          </Field>
          <Field label="Телефон *">
            <Input type="tel" value={form.phone} onChange={update("phone")} required autoComplete="tel" />
          </Field>
          <Field label="Название бизнеса *">
            <Input value={form.businessName} onChange={update("businessName")} required />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Магазинов WB">
              <Input type="number" min={0} value={form.shopsCountWB} onChange={update("shopsCountWB")} />
            </Field>
            <Field label="Магазинов Ozon">
              <Input type="number" min={0} value={form.shopsCountOzon} onChange={update("shopsCountOzon")} />
            </Field>
            <Field label="Количество SKU">
              <Input type="number" min={0} value={form.skuCount} onChange={update("skuCount")} />
            </Field>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Создаём аккаунт…" : "Создать аккаунт"}
          </Button>
        </form>
        <div className="text-sm text-center text-gray-600">
          Уже есть аккаунт? <Link href="/login" className="hover:underline text-violet-600">Войти</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/register/page.tsx src/app/register/page.test.tsx
git commit -m "feat(auth): /register page with 8 fields (A.2 phase 4)"
```

---

### Task 17: `/verify-email` page

**Files:**
- Create: `src/app/verify-email/page.tsx`
- Test: `src/app/verify-email/page.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import VerifyEmailPage from "./page";
describe("VerifyEmailPage", () => {
  it("is a valid component", () => {
    expect(typeof VerifyEmailPage).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Создать страницу**

> verifyEmail mutation **публичная** (см. `convex/auth/verifyEmail.ts`), но мы не хотим её через `convex-refs` хешировать дважды. Добавим ref в convex-refs.ts.

В `src/lib/convex-refs.ts` добавить (после блока `users`):

```ts
export const verifyEmailRef = "auth/verifyEmail:verifyEmail" as unknown as Mut<
  { token: string },
  { ok: true; alreadyVerified: boolean }
>;
```

`src/app/verify-email/page.tsx`:

```tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { verifyEmailRef } from "@/lib/convex-refs";
import { Button } from "@/components/ui/button";

function VerifyEmailInner() {
  const search = useSearchParams();
  const router = useRouter();
  const verify = useMutation(verifyEmailRef);
  const token = search.get("token");
  const [state, setState] = useState<"loading" | "ok" | "already" | "err">("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("err");
      setErrMsg("Токен отсутствует в ссылке");
      return;
    }
    verify({ token })
      .then((r) => setState(r.alreadyVerified ? "already" : "ok"))
      .catch((e) => {
        setState("err");
        setErrMsg((e as Error).message);
      });
  }, [token, verify]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        {state === "loading" && <p className="text-gray-500">Подтверждаем email…</p>}
        {state === "ok" && (
          <>
            <h1 className="text-2xl font-bold text-green-600">Email подтверждён</h1>
            <p className="text-gray-600">Заявка отправлена на approval. Проверьте позже.</p>
            <Button onClick={() => router.push("/pending-approval")}>OK</Button>
          </>
        )}
        {state === "already" && (
          <>
            <h1 className="text-2xl font-bold">Email уже подтверждён ранее</h1>
            <Button onClick={() => router.push("/pending-approval")}>Продолжить</Button>
          </>
        )}
        {state === "err" && (
          <>
            <h1 className="text-2xl font-bold text-red-600">Ошибка подтверждения</h1>
            <p className="text-gray-600">{errMsg}</p>
            <Button onClick={() => router.push("/login")}>На страницу входа</Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
```

- [ ] **Step 4: Run + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/verify-email/page.tsx src/app/verify-email/page.test.tsx src/lib/convex-refs.ts
git commit -m "feat(auth): /verify-email page (A.2 phase 4)"
```

---

### Task 18: `/pending-approval` page

**Files:**
- Create: `src/app/pending-approval/page.tsx`

- [ ] **Step 1: Failing test**

`src/app/pending-approval/page.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import PendingPage from "./page";
describe("PendingPage", () => {
  it("renders", () => {
    expect(typeof PendingPage).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Создать страницу**

```tsx
"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  const user = useCurrentUser();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (user === undefined) {
    return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Загрузка…</div>;
  }
  if (user === null) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-5">
        <h1 className="text-2xl font-bold">Заявка на рассмотрении</h1>

        {!user.emailVerifiedAt && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 text-left">
            <strong>Подтвердите email.</strong> Письмо отправлено на <code>{user.email}</code>.
            Проверьте почту и перейдите по ссылке из письма.
          </div>
        )}

        <p className="text-gray-600">
          Здравствуйте, {user.name}! Мы получили вашу заявку и проверим её в ближайшее время.
          После одобрения админом вы получите письмо и сможете зайти в дашборд.
        </p>

        <Button variant="outline" onClick={handleLogout}>Выйти</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/pending-approval/
git commit -m "feat(auth): /pending-approval page (A.2 phase 4)"
```

---

### Task 19: `/rejected` page

**Files:**
- Create: `src/app/rejected/page.tsx`
- Test: `src/app/rejected/page.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import RejectedPage from "./page";
describe("RejectedPage", () => {
  it("renders", () => {
    expect(typeof RejectedPage).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Создать страницу**

```tsx
"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";

export default function RejectedPage() {
  const user = useCurrentUser();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (user === undefined) return null;
  if (user === null) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-5">
        <h1 className="text-2xl font-bold text-red-600">Заявка отклонена</h1>
        <p className="text-gray-600">
          К сожалению, ваша заявка не была одобрена.
        </p>
        {user.status === "rejected" && (user as unknown as { rejectionReason?: string }).rejectionReason && (
          <p className="text-sm text-gray-500 italic">
            Причина: {(user as unknown as { rejectionReason?: string }).rejectionReason}
          </p>
        )}
        <p className="text-sm text-gray-500">
          Связь с поддержкой: <a href="https://t.me/Virtuozick" className="underline">@Virtuozick</a>
        </p>
        <Button variant="outline" onClick={handleLogout}>Выйти</Button>
      </div>
    </div>
  );
}
```

> **Заметка:** `useCurrentUser` сейчас не возвращает `rejectionReason` — добавить поле в `convex/users.ts` `current` query и в тип `CurrentUser` в `convex-refs.ts`.

В `convex/users.ts` добавить в return: `rejectionReason: user.rejectionReason ?? null,`. В `convex-refs.ts` добавить `rejectionReason: string | null;`.

- [ ] **Step 4: Run + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/rejected/ convex/users.ts src/lib/convex-refs.ts
git commit -m "feat(auth): /rejected page + rejectionReason in current user (A.2 phase 4)"
```

---

### Task 20: `/forgot-password` page

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Test: `src/app/forgot-password/page.test.tsx`
- Modify: `src/lib/convex-refs.ts` (добавить `forgotPasswordRef`)

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import ForgotPasswordPage from "./page";
describe("ForgotPasswordPage", () => {
  it("renders", () => {
    expect(typeof ForgotPasswordPage).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Добавить ref в `src/lib/convex-refs.ts`**

После блока `users`:

```ts
export const forgotPasswordRef = "auth/forgotPassword:forgotPassword" as unknown as Act<
  { email: string },
  { ok: true }
>;
```

- [ ] **Step 4: Создать страницу**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { forgotPasswordRef } from "@/lib/convex-refs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const forgotPassword = useAction(forgotPasswordRef);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Сброс пароля</h1>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-gray-700">
              Если такой email существует — письмо со ссылкой отправлено.
              Проверьте почту в течение часа.
            </p>
            <Link href="/login" className="text-violet-600 hover:underline text-sm">
              Назад ко входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Отправляем…" : "Отправить ссылку"}
            </Button>
            <Link href="/login" className="block text-center text-sm text-gray-600 hover:underline">
              Вспомнили? Войти
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run + typecheck**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/forgot-password/ src/lib/convex-refs.ts
git commit -m "feat(auth): /forgot-password page (A.2 phase 4)"
```

---

### Task 21: `/reset-password` page

**Files:**
- Create: `src/app/reset-password/page.tsx`
- Test: `src/app/reset-password/page.test.tsx`

> **Замечание:** action `auth/resetPassword:resetPassword` валидирует токен и пароль, но **смену пароля** делает Convex Auth provider через `signIn("password", { flow: "reset-verification", code: token, email, newPassword })`. Поэтому страница использует `useAuthActions().signIn`, а не наш ref.

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import ResetPasswordPage from "./page";
describe("ResetPasswordPage", () => {
  it("renders", () => {
    expect(typeof ResetPasswordPage).toBe("function");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Создать страницу**

> Поток через native Convex Auth: `signIn("password", { flow: "reset", email })` отправляет код, потом `flow: "reset-verification"` со введённым кодом + новым паролем. Наша `forgotPassword` action запускает первую часть. Для UI — простая форма "введите новый пароль".

```tsx
"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAction } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordInner() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Naked Convex API call — `auth/resetPassword:resetPassword` action
  // валидирует токен + потребляет его. После успеха редиректим на /login,
  // юзер вводит новый пароль уже на /login обычным flow.
  const resetPassword = useAction(
    "auth/resetPassword:resetPassword" as unknown as import("convex/server").FunctionReference<
      "action",
      "public",
      { token: string; newPassword: string },
      { ok: true; userId: import("../../../convex/_generated/dataModel").Id<"users"> }
    >
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Минимум 8 символов");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword: password });
      // TODO: вызвать signIn("password", flow: "reset-verification") для применения нового пароля.
      // На текущей версии @convex-dev/auth ^0.0.91 — see Task 27 manual smoke.
      router.push("/login?reset=ok");
    } catch (err) {
      setError((err as Error).message || "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Ссылка некорректна</h1>
          <p className="text-gray-600">Запросите новую ссылку для сброса пароля.</p>
          <Link href="/forgot-password" className="text-violet-600 hover:underline">К сбросу</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Новый пароль</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Новый пароль</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          <div className="space-y-1">
            <Label>Повторите пароль</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Сохраняем…" : "Сменить пароль"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
```

> **Открытый вопрос для Task 27 (smoke):** реальный handover через `flow: "reset-verification"` Convex Auth-а — нужно подтвердить точную сигнатуру в smoke-тесте. Если не сработает — вместо `useAction(resetPassword)` вызвать `signIn("password", { flow: "reset-verification", email, code: token, newPassword: password })`.

- [ ] **Step 4: Run + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/reset-password/
git commit -m "feat(auth): /reset-password page (A.2 phase 4)"
```

---

## Phase 5 — Dashboard / Welcome / Settings / TopNav

### Task 22: Welcome-блок на `/` для юзеров без shops

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/dashboard/Welcome.tsx`

- [ ] **Step 1: Failing test**

`src/components/dashboard/Welcome.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Welcome } from "./Welcome";

describe("Welcome", () => {
  it("renders user name and CTA buttons", () => {
    const { getByText } = render(<Welcome userName="Юрий" />);
    expect(getByText(/Юрий/)).toBeTruthy();
    expect(getByText(/Wildberries/)).toBeTruthy();
    expect(getByText(/Ozon/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — FAIL (нет Welcome.tsx)**

- [ ] **Step 3: Создать `src/components/dashboard/Welcome.tsx`**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Welcome({ userName }: { userName: string }) {
  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
      <h1 className="text-3xl font-bold">👋 Добро пожаловать, {userName}!</h1>
      <p className="text-gray-600">
        Чтобы начать работу, добавьте магазин — Wildberries или Ozon.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/settings?marketplace=wb">
          <Button>🟣 Добавить магазин Wildberries</Button>
        </Link>
        <Link href="/settings?marketplace=ozon">
          <Button variant="outline">🔵 Добавить магазин Ozon</Button>
        </Link>
      </div>
      <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 text-left">
        <strong>Что вам понадобится:</strong>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>API-ключ WB (создаётся в ЛК WB → Настройки → Доступ к API)</li>
          <li>Client ID + API-ключ Ozon (создаётся в ЛК Ozon Seller → Настройки → API)</li>
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Modify `src/app/page.tsx`**

В верх файла добавить:

```tsx
import { Welcome } from "@/components/dashboard/Welcome";
import { useCurrentUser } from "@/hooks/useCurrentUser";
```

Заменить строку с `useQuery(shopsListRef)`:

```tsx
import { shopsListMineRef } from "@/lib/convex-refs";
// ...
const shops = (useQuery(shopsListMineRef) ?? []) as Doc<"shops">[];
const user = useCurrentUser();
```

Перед основным `return` добавить:

```tsx
if (user && shops.length === 0) {
  return <Welcome userName={user.name || "пользователь"} />;
}
```

- [ ] **Step 5: Run + typecheck**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/Welcome.tsx src/components/dashboard/Welcome.test.tsx src/app/page.tsx
git commit -m "feat(dashboard): Welcome screen for users without shops (A.2 phase 5)"
```

---

### Task 23: `settings/page.tsx` — marketplace dropdown + orgId через `useCurrentOrg`

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Failing test (smoke)**

`src/app/settings/page.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import SettingsPage from "./page";
describe("SettingsPage", () => {
  it("renders", () => {
    expect(typeof SettingsPage).toBe("function");
  });
});
```

- [ ] **Step 2: Run — может PASS (файл уже есть). Но нам нужен интеграционный smoke по форме — потом, через ручной тест в Task 27.**

- [ ] **Step 3: Modify `src/app/settings/page.tsx`**

Заменить блок `handleAdd`:

```tsx
import { useSearchParams } from "next/navigation";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { shopsListMineRef } from "@/lib/convex-refs";
// ...

export default function SettingsPage() {
  const search = useSearchParams();
  const initialMarketplace = (search.get("marketplace") ?? "wb") as "wb" | "ozon";
  const [marketplace, setMarketplace] = useState<"wb" | "ozon">(initialMarketplace);
  const [ozonClientId, setOzonClientId] = useState("");
  const currentOrg = useCurrentOrg();
  const shops = useQuery(shopsListMineRef) ?? [];
  // ... остальное

  const handleAdd = async () => {
    if (!name || !apiKey || !currentOrg) return;
    if (marketplace === "ozon" && !ozonClientId) return;
    await addShop({
      orgId: currentOrg.orgId,
      marketplace,
      name,
      apiKey,
      ozonClientId: marketplace === "ozon" ? ozonClientId : undefined,
    });
    setName("");
    setApiKey("");
    setOzonClientId("");
  };
  // ...
```

В JSX-форме (внутри Card "Добавить магазин") добавить выбор marketplace перед полем Name:

```tsx
<div className="space-y-1">
  <Label>Маркетплейс</Label>
  <select
    value={marketplace}
    onChange={(e) => setMarketplace(e.target.value as "wb" | "ozon")}
    className="border rounded-md px-3 py-2 text-sm w-full"
  >
    <option value="wb">Wildberries</option>
    <option value="ozon">Ozon</option>
  </select>
</div>
```

И условный блок Client ID (показывать только для ozon):

```tsx
{marketplace === "ozon" && (
  <div className="space-y-1">
    <Label>Ozon Client ID</Label>
    <Input value={ozonClientId} onChange={(e) => setOzonClientId(e.target.value)} placeholder="123456" />
  </div>
)}
```

Условие на `disabled` у кнопки добавления:

```tsx
<Button onClick={handleAdd} disabled={!currentOrg || !name || !apiKey} className="bg-violet-600 hover:bg-violet-700">
  Добавить
</Button>
```

И `<Suspense>` обёртка вокруг компонента (т.к. `useSearchParams` требует это в App Router 15+):

```tsx
import { Suspense } from "react";
function SettingsPageInner() { /* существующий компонент */ }
export default function SettingsPage() {
  return <Suspense fallback={null}><SettingsPageInner /></Suspense>;
}
```

- [ ] **Step 4: Run + typecheck**

```bash
npm test -- src/app/settings/page.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/page.tsx src/app/settings/page.test.tsx
git commit -m "feat(settings): marketplace dropdown + orgId from current user (A.2 phase 5)"
```

---

### Task 24: `TopNav` — user dropdown с logout

**Files:**
- Modify: `src/components/nav/TopNav.tsx`

- [ ] **Step 1: Failing test**

`src/components/nav/TopNav.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { TopNav } from "./TopNav";
describe("TopNav", () => {
  it("renders", () => {
    expect(typeof TopNav).toBe("function");
  });
});
```

- [ ] **Step 2: Run — может PASS, но смотрим что нет user-меню**

- [ ] **Step 3: Modify TopNav.tsx**

Добавить хук:

```tsx
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
```

В компоненте перед `return` добавить:

```tsx
const user = useCurrentUser();
const { signOut } = useAuthActions();
const router = useRouter();
const handleLogout = async () => {
  await signOut();
  router.push("/login");
};
```

В `<div className="ml-auto">` блоке заменить просто Link на:

```tsx
<div className="ml-auto flex items-center gap-3">
  <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">
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
```

- [ ] **Step 4: Run + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/nav/TopNav.tsx src/components/nav/TopNav.test.tsx
git commit -m "feat(nav): user dropdown with logout in TopNav (A.2 phase 5)"
```

---

### Task 25: Migrate consumers `shopsListRef` → `shopsListMineRef`

**Files:**
- Modify: `src/app/page.tsx` (если ещё `shopsListRef`)
- Modify: `src/app/analytics/page.tsx`
- Modify: `src/app/financials/page.tsx`
- Modify: `src/app/feedbacks/page.tsx`
- Modify: `src/app/products/page.tsx`
- Modify: `src/app/prices/page.tsx`
- Modify: `src/app/pulse/page.tsx`
- Modify: `src/app/returns/page.tsx`
- Modify: `src/hooks/useDashboardData.ts` (если есть)

- [ ] **Step 1: Failing test (структурный)**

`src/app/no-deprecated-shops-list.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";

describe("frontend pages do not use deprecated shopsListRef", () => {
  it("only shopsListMineRef is used in src/app/**/*.tsx", () => {
    const out = execSync(
      'grep -rln "shopsListRef" src/app src/hooks src/components || true',
      { encoding: "utf8" }
    );
    expect(out.trim()).toBe("");
  });
});
```

- [ ] **Step 2: Run — FAIL (есть consumers)**

- [ ] **Step 3: Заменить во всех файлах**

```bash
grep -rln "shopsListRef" src/app src/hooks src/components | while read -r f; do
  sed -i 's/shopsListRef/shopsListMineRef/g' "$f"
done
```

- [ ] **Step 4: Run + typecheck**

```bash
npm test -- src/app/no-deprecated-shops-list.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "refactor(auth): migrate frontend to shopsListMineRef (A.2 phase 5)"
```

---

## Phase 6 — Smoke + Cleanup + Deploy

### Task 26: Юрий ставит пароль через `/forgot-password`

**Files:** none (manual test on dev deployment)

> **Это ручной шаг.** Юрий выполняет — не subagent.

- [ ] **Step 1: Запустить Next.js локально**

```bash
cd /home/iurii/MFA-repo
npm run dev
```

- [ ] **Step 2: Открыть http://localhost:3000/forgot-password**

- [ ] **Step 3: Ввести `pihenella@gmail.com` → submit**

- [ ] **Step 4: Проверить почту, кликнуть по ссылке**

Ожидаемое: ссылка на `/reset-password?token=...`

- [ ] **Step 5: Ввести новый пароль два раза → submit**

- [ ] **Step 6: Перейти на `/login`, войти**

Ожидаемое: попадание на `/` (дашборд) с реальными shops AID Tools/AID Official видимыми (т.к. dev пустой — список будет пустой, но welcome не покажется т.к. orgId есть).

> **Важно:** на dev deployment нет данных кроме user/org Юрия (миграция в A.1 при пустом dev отметила `shopsUpdated: 0`). Поэтому в дашборде будет пусто. Это **нормально для dev**, реальные данные — на prod, который накатим в Task 28.

- [ ] **Step 7: Зафиксировать факт что пароль установлен**

Добавить заметку в `project_mfa_subproject_a.md` через memory (вне scope этого плана — после plan'а).

---

### Task 27: Smoke-test full registration flow

**Files:** none (manual test)

> **Ручной шаг.**

- [ ] **Step 1: Logout из Юрия**

- [ ] **Step 2: Открыть `/register`**

- [ ] **Step 3: Заполнить тестовый аккаунт**

```
email: test-a2@example.com
password: testpass123
name: Тестовый Юзер
phone: +7 999 000 00 00
businessName: Test Biz
shopsCountWB: 1
shopsCountOzon: 0
skuCount: 10
```

- [ ] **Step 4: После submit — должен быть редирект на `/pending-approval`**

В блоке должно быть «Подтвердите email» (т.к. `emailVerifiedAt === null`).

- [ ] **Step 5: Проверить inbox `pihenella@gmail.com`** (Resend dev-mode шлёт только на верифицированный)

> **Замечание:** в dev-режиме Resend шлёт **только на email с которого зарегистрирован Resend-аккаунт**. На `test-a2@example.com` письмо не дойдёт — Resend отвергнет. Для полного smoke нужно: либо ввести `pihenella@gmail.com` как email юзера, либо verify-email подтвердить руками через Convex dashboard:
> - Convex Dashboard → energized-wolverine-691 → Functions → `auth/verifyEmail:verifyEmail` → Run → передать токен из таблицы `verifyTokens`.

- [ ] **Step 6: Approve через Convex Dashboard**

- Открыть Convex Dashboard → energized-wolverine-691 → Data → `users`
- Найти test-a2@example.com → скопировать `_id`
- Functions → `admin/users:approveUser` → передать `userId` → Run

> Юрий = single admin, можно нажать «Run as authenticated user» с его user-id.

- [ ] **Step 7: Logout / Login как test-a2**

- [ ] **Step 8: Видим welcome-экран** (нет shops в его org-е)

- [ ] **Step 9: Кликнуть «Добавить WB» → попадаем на /settings?marketplace=wb**

- [ ] **Step 10: Зафиксировать чек-лист в `~/mfa-backups/a2-smoke-2026-04-XX.md`**

```
□ register submit → pending-approval ✓/✗
□ verify-email через dashboard ✓/✗
□ approve → email пришло ✓/✗
□ login → welcome ✓/✗
□ welcome CTA → /settings?marketplace=wb ✓/✗
```

---

### Task 28: typecheck + tests + deploy + push branch

**Files:** none (final verification)

- [ ] **Step 1: Полный прогон тестов**

```bash
cd /home/iurii/MFA-repo
npm test
```

Expected: 0 failures.

- [ ] **Step 2: Полный typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds, 0 errors. Проверить что нет warning'ов про missing module / missing useSearchParams Suspense.

- [ ] **Step 4: Deploy на dev**

```bash
npx convex dev --once
```

Expected: `Success`.

- [ ] **Step 5: Push ветку**

```bash
git push -u origin mfa-a2-auth-ui
```

- [ ] **Step 6: Открыть PR-черновик в GitHub**

```bash
gh pr create --draft --title "MFA-A.2: Auth UI + middleware + ensureShopAccess" --body "$(cat <<'EOF'
## Summary
- ConvexAuthNextjsProvider + useCurrentUser/useCurrentOrg hooks
- ensureShopAccess applied to all public Convex handlers (shops, dashboard, analytics, financials, costs, actions)
- @ts-nocheck removed everywhere; string-refs used for deep internal calls
- Next.js middleware + AuthGate for pending/rejected gate
- 7 auth pages: /login, /register, /verify-email, /pending-approval, /rejected, /forgot-password, /reset-password
- Welcome screen for users without shops; settings/page now uses currentOrg
- Юрий-юзер: пароль установлен через /forgot-password (smoke pass)

## Не в этом PR (отложено в A.3)
- /admin/users
- /org/team, /org/settings
- /invite/:token
- Передача ownership

## Test plan
- [x] npm test green
- [x] npm run typecheck green
- [x] npm run build green
- [x] Manual: forgot-password flow
- [x] Manual: register → verify → approve → login → welcome
- [ ] **Не делать merge** до завершения A.3 (Vercel auto-deploys master, prod ещё на старой схеме)
EOF
)"
```

- [ ] **Step 7: Commit финальный**

Если есть локальные изменения от рефакторинга:

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: final cleanup before A.2 PR"
git push
```

---

## Self-review checklist

Перед финальным merge:

- [ ] Все 7 auth-страниц рендерятся без console errors в браузере
- [ ] middleware блокирует `/` для unauth юзера → редирект на `/login`
- [ ] middleware пропускает `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`
- [ ] AuthGate редиректит pending → `/pending-approval` и rejected → `/rejected`
- [ ] `useCurrentUser` возвращает null для unauth, объект для auth, undefined для loading
- [ ] `useCurrentOrg` возвращает первую org юзера
- [ ] `npm test` 0 failures
- [ ] `npm run typecheck` 0 errors
- [ ] `npm run build` 0 errors / warnings
- [ ] Все Convex handlers, работающие с shopId, начинаются с `await ensureShopAccess(...)` или итерируются по `await listUserShopIds(...)`
- [ ] `@ts-nocheck` отсутствует во всех файлах `convex/`
- [ ] Юрий вошёл в дашборд под своим паролем
- [ ] Smoke-test нового юзера прошёл (через ручной approve в Convex Dashboard)
- [ ] PR draft создан, не merged

---

## Что после A.2

- A.3: `/admin/users` UI, `/org/team` UI, `/org/settings` UI, `/invite/:token` flow (4 ветки), передача ownership UI
- A.4: редизайн orange-black + dark/light theme + footer @Virtuozick
- Затем — раскатка A.1+A.2+A.3+A.4 на prod `pastel-roadrunner-718` одним заходом
- После prod-деплоя: merge `mfa-a2-auth-ui` → `master`, Vercel auto-deploy подхватит совместимый фронт + новую схему

---

## Дополнительные refs которые могут понадобиться при исполнении

При написании кода держать под рукой:

- A.1 plan: `docs/superpowers/plans/2026-04-27-mfa-a1-schema-backend.md`
- Spec: `docs/superpowers/specs/2026-04-24-mfa-auth-multitenancy-design.md`
- Convex Auth docs: https://labs.convex.dev/auth
- Existing helpers: `convex/lib/helpers.ts`
- Pre-resolved string-refs pattern: `src/lib/convex-refs.ts` (extend, не переделывать)
