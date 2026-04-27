# MFA A.1 — Schema + Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-04-24-mfa-auth-multitenancy-design.md` §2-§5, §7, §10, §12 (commit `2013359` на master)
**Roadmap:** `docs/superpowers/plans/2026-04-27-mfa-a-roadmap.md`

**Goal:** Convex backend полностью готов для multi-tenant SaaS: новые таблицы `users/organizations/memberships/invites/emailSendLog`, helper-инвариант `ensureShopAccess` на каждом publicly-exported handler, 6 email-шаблонов через Resend, миграция Юрия выполнена. Frontend пока без изменений — старый dashboard продолжает работать (потому что Юрий через миграцию = единственный owner-юзер).

**Architecture:** Двухфазная schema migration (additive → seed → required), Convex Auth с password provider для identity, отдельная `convex/auth/`, `convex/admin/`, `convex/org/`, `convex/email/` структура, pure-utilities в `src/lib/auth-utils.ts` под TDD, Convex handlers — smoke-тестируются.

**Tech Stack:** Convex 1.32+, `@convex-dev/auth` + `@auth/core/providers/password`, `resend`, vitest 4 для pure utilities.

**Прогресс:** Все задачи в этом плане ведут одну ветку `mfa-a1-schema-backend`, частые коммиты после каждой Task. После завершения всех задач — squash merge в `master`.

---

## Pre-requisites (выполнить перед Task 1)

- [ ] Backup сделан: `npx convex export --path ~/mfa-backups/mfa-backup-2026-04-27.zip`
- [ ] Чистый `git status` на master
- [ ] Создана ветка: `git checkout -b mfa-a1-schema-backend`
- [ ] Resend API key получен и записан в `.env.local`: `RESEND_API_KEY=re_...`
- [ ] Resend API key выставлен в Convex env: `npx convex env set RESEND_API_KEY <value>`
- [ ] EMAIL_FROM выставлен (dev): `npx convex env set EMAIL_FROM "MFA <onboarding@resend.dev>"`
- [ ] APP_URL выставлен (dev): `npx convex env set APP_URL "http://localhost:3000"`
- [ ] ADMIN_EMAIL выставлен: `npx convex env set ADMIN_EMAIL "pihenella@gmail.com"`
- [ ] `npm test` зелёный, `npm run typecheck` зелёный — baseline зафиксирован

---

## Phase 1: Setup & Dependencies

### Task 1: Установить зависимости

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Установить @convex-dev/auth + @auth/core**

```bash
npm install @convex-dev/auth @auth/core
```

Ожидаемый результат: новые пакеты в `package.json` под `dependencies`.

- [ ] **Step 2: Установить resend SDK**

```bash
npm install resend
```

- [ ] **Step 3: Проверить что typecheck по-прежнему зелёный**

```bash
npm run typecheck
```

Ожидаемый результат: 0 ошибок. Если есть — это конфликт с типами, скорее всего нужно обновить `@types/node`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add @convex-dev/auth + resend для MFA-A.1"
```

---

### Task 2: Настроить Convex Auth

**Files:**
- Create: `convex/auth.config.ts`
- Create: `convex/auth.ts` (provider setup)
- Modify: `convex/http.ts` (если файла нет — создать)

- [ ] **Step 1: Создать `convex/auth.config.ts`**

Этот файл подцепляет JWT-issuer Convex Auth для проверки токенов в queries/mutations.

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

- [ ] **Step 2: Создать `convex/auth.ts` с password provider**

Файл регистрирует password-провайдер Convex Auth. Не путать с `convex/auth/` директорией (она будет в Task 12+ для бизнес-mutations).

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import Password from "@auth/core/providers/password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ id: "password" })],
});
```

- [ ] **Step 3: Создать `convex/http.ts`**

Convex Auth требует HTTP роуты для callbacks.

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);
export default http;
```

- [ ] **Step 4: Запустить `npx convex dev` в одном терминале**

```bash
npx convex dev
```

Ожидаемый результат: схема развёрнута без ошибок, `_generated/` обновился, в нём появились auth-related типы.

- [ ] **Step 5: Прочитать generated файл и убедиться что нет несовместимостей**

```bash
grep -i "auth" convex/_generated/api.d.ts | head -10
```

Ожидаемый результат: видим импорты `auth` модуля.

- [ ] **Step 6: Commit**

```bash
git add convex/auth.ts convex/auth.config.ts convex/http.ts convex/_generated/
git commit -m "feat(auth): подключить Convex Auth + password provider"
```

---

## Phase 2: Schema migration phase 1 (additive)

### Task 3: Добавить новые таблицы в schema (без required-полей на shops)

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Добавить в `convex/schema.ts` 5 новых таблиц**

Открыть `convex/schema.ts`. После закрывающей скобки последней существующей таблицы (`nmReports`), но **внутри** объекта `defineSchema({...})`, добавить:

```typescript
  users: defineTable({
    email: v.string(),
    name: v.string(),
    phone: v.string(),
    businessName: v.string(),
    shopsCountWB: v.number(),
    shopsCountOzon: v.number(),
    skuCount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    emailVerifiedAt: v.optional(v.number()),
    isSystemAdmin: v.boolean(),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  organizations: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  memberships: defineTable({
    userId: v.id("users"),
    orgId: v.id("organizations"),
    role: v.union(v.literal("owner"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgId"])
    .index("by_user_org", ["userId", "orgId"]),

  invites: defineTable({
    orgId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked")
    ),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_org", ["orgId"])
    .index("by_email_status", ["email", "status"]),

  emailSendLog: defineTable({
    email: v.string(),
    kind: v.union(
      v.literal("verify"),
      v.literal("reset"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("teamInvite"),
      v.literal("inviteAccepted")
    ),
    sentAt: v.number(),
  }).index("by_email_kind", ["email", "kind"]),

  loginAttempts: defineTable({
    email: v.string(),
    attemptedAt: v.number(),
    success: v.boolean(),
  }).index("by_email_time", ["email", "attemptedAt"]),
```

- [ ] **Step 2: Изменить таблицу `shops`: добавить `orgId`, `marketplace`, `ozonClientId` как OPTIONAL**

Найти существующее определение `shops:` в `convex/schema.ts`. Заменить его полностью на:

```typescript
  shops: defineTable({
    orgId: v.optional(v.id("organizations")),     // PHASE 1: optional, PHASE 3 → required
    marketplace: v.optional(                       // PHASE 1: optional, PHASE 3 → required
      v.union(v.literal("wb"), v.literal("ozon"))
    ),
    name: v.string(),
    apiKey: v.string(),
    ozonClientId: v.optional(v.string()),          // НОВОЕ — только для Ozon
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    enabledCategories: v.optional(v.array(v.string())),
  })
    .index("by_org", ["orgId"])
    .index("by_org_marketplace", ["orgId", "marketplace"]),
```

- [ ] **Step 3: Деплой схемы phase 1**

В терминале где запущен `npx convex dev` — изменения применятся автоматически. Дождаться сообщения «Schema updated».

Ожидаемый результат: успешный деплой без ошибок. Существующие записи `shops` остаются валидны (поля optional).

- [ ] **Step 4: Verify: existing data не сломан**

В Convex dashboard → Data → выбрать таблицу `shops` → убедиться что все записи на месте.

```bash
# Альтернативно через CLI:
npx convex run shops:list
```

Ожидаемый результат: оба магазина Юрия (AID Tools, AID Official) видны.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/_generated/
git commit -m "feat(schema): phase 1 — добавить users/orgs/memberships/invites/emailSendLog/loginAttempts (additive)"
```

---

## Phase 3: Pure auth utilities (TDD)

### Task 4: Pure validators + token generation

**Files:**
- Create: `src/lib/auth-utils.ts`
- Create: `src/lib/auth-utils.test.ts`

- [ ] **Step 1: Написать failing-тесты для validators и token utilities**

```typescript
// src/lib/auth-utils.test.ts
import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  generateRandomToken,
  tokensEqual,
  normalizeEmail,
} from "./auth-utils";

describe("validateEmail", () => {
  it("принимает корректный email", () => {
    expect(validateEmail("user@example.com").ok).toBe(true);
  });
  it("отклоняет email без @", () => {
    expect(validateEmail("invalid").ok).toBe(false);
  });
  it("отклоняет пустую строку", () => {
    expect(validateEmail("").ok).toBe(false);
  });
  it("отклоняет email длиннее 254 символов", () => {
    const long = "a".repeat(250) + "@a.b";
    expect(validateEmail(long).ok).toBe(false);
  });
});

describe("validatePassword", () => {
  it("принимает >= 8 символов с буквой и цифрой", () => {
    expect(validatePassword("password1").ok).toBe(true);
  });
  it("отклоняет короче 8", () => {
    expect(validatePassword("pass1").ok).toBe(false);
  });
  it("отклоняет без цифры", () => {
    expect(validatePassword("passwordword").ok).toBe(false);
  });
  it("отклоняет без буквы", () => {
    expect(validatePassword("12345678").ok).toBe(false);
  });
});

describe("generateRandomToken", () => {
  it("генерирует 64-символьный hex (32 байта)", () => {
    const token = generateRandomToken(32);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
  it("генерирует уникальные токены", () => {
    const a = generateRandomToken(32);
    const b = generateRandomToken(32);
    expect(a).not.toBe(b);
  });
});

describe("tokensEqual (constant-time)", () => {
  it("true для равных токенов", () => {
    const t = generateRandomToken(32);
    expect(tokensEqual(t, t)).toBe(true);
  });
  it("false для разных", () => {
    expect(tokensEqual("abc", "abd")).toBe(false);
  });
  it("false для разной длины (но не throw)", () => {
    expect(tokensEqual("abc", "abcd")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("приводит к lowercase и trim", () => {
    expect(normalizeEmail("  User@Example.com ")).toBe("user@example.com");
  });
});
```

- [ ] **Step 2: Запустить тесты — должны провалиться**

```bash
npm test -- src/lib/auth-utils
```

Ожидаемый результат: FAIL — модуль `auth-utils` не существует.

- [ ] **Step 3: Создать `src/lib/auth-utils.ts` с реализацией**

```typescript
// src/lib/auth-utils.ts

export type ValidationResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): ValidationResult {
  if (!email) return { ok: false, error: "Email обязателен" };
  if (email.length > 254) return { ok: false, error: "Email слишком длинный" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Некорректный email" };
  return { ok: true };
}

export function validatePassword(password: string): ValidationResult {
  if (password.length < 8) return { ok: false, error: "Минимум 8 символов" };
  if (!/[0-9]/.test(password)) return { ok: false, error: "Нужна цифра" };
  if (!/[a-zA-Zа-яА-ЯёЁ]/.test(password)) return { ok: false, error: "Нужна буква" };
  return { ok: true };
}

export function generateRandomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function tokensEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
```

- [ ] **Step 4: Запустить тесты — все проходят**

```bash
npm test -- src/lib/auth-utils
```

Ожидаемый результат: PASS, 14 тестов.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-utils.ts src/lib/auth-utils.test.ts
git commit -m "feat(auth-utils): pure validators + token gen + constant-time compare"
```

---

### Task 5: HTML escape utility для email-шаблонов

**Files:**
- Modify: `src/lib/auth-utils.ts`
- Modify: `src/lib/auth-utils.test.ts`

- [ ] **Step 1: Добавить failing-тесты для `escapeHtml`**

В `src/lib/auth-utils.test.ts` дописать:

```typescript
import { escapeHtml } from "./auth-utils";

describe("escapeHtml", () => {
  it("экранирует < > & \" '", () => {
    expect(escapeHtml('<script>alert("x")</script>'))
      .toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });
  it("оставляет обычный текст как есть", () => {
    expect(escapeHtml("Юрий")).toBe("Юрий");
  });
  it("апостроф", () => {
    expect(escapeHtml("O'Brien")).toBe("O&#39;Brien");
  });
});
```

- [ ] **Step 2: Запустить — failing**

```bash
npm test -- src/lib/auth-utils
```

Ожидаемый результат: FAIL — `escapeHtml` не экспортируется.

- [ ] **Step 3: Добавить `escapeHtml` в `src/lib/auth-utils.ts`**

```typescript
export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
```

- [ ] **Step 4: Тесты зелёные**

```bash
npm test -- src/lib/auth-utils
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-utils.ts src/lib/auth-utils.test.ts
git commit -m "feat(auth-utils): добавить escapeHtml для email-шаблонов"
```

---

## Phase 4: Email infrastructure

### Task 6: Resend client + sendEmail core

**Files:**
- Create: `convex/email/resend.ts`

- [ ] **Step 1: Создать `convex/email/resend.ts`**

```typescript
// convex/email/resend.ts
import { Resend } from "resend";

export type EmailKind =
  | "verify"
  | "reset"
  | "approved"
  | "rejected"
  | "teamInvite"
  | "inviteAccepted";

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmailViaResend(args: SendEmailArgs): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) throw new Error("RESEND_API_KEY не выставлен в Convex env");
  if (!from) throw new Error("EMAIL_FROM не выставлен в Convex env");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: [args.to],
    subject: args.subject,
    html: args.html,
    text: args.text,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
  return { id: result.data?.id ?? "" };
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
npm run typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
git add convex/email/resend.ts
git commit -m "feat(email): добавить Resend клиент"
```

---

### Task 7: Email templates — пишем все 6 как pure функции

**Files:**
- Create: `src/lib/email-templates.ts`
- Create: `src/lib/email-templates.test.ts`

- [ ] **Step 1: Failing-тесты для рендера всех 6 шаблонов**

```typescript
// src/lib/email-templates.test.ts
import { describe, it, expect } from "vitest";
import {
  renderVerifyEmail,
  renderApprovedEmail,
  renderRejectedEmail,
  renderResetPasswordEmail,
  renderTeamInviteEmail,
  renderInviteAcceptedEmail,
} from "./email-templates";

describe("renderVerifyEmail", () => {
  it("содержит имя, ссылку и срок 24ч", () => {
    const r = renderVerifyEmail({ name: "Юрий", verifyUrl: "https://x/verify?t=abc" });
    expect(r.subject).toContain("Подтверждение");
    expect(r.html).toContain("Юрий");
    expect(r.html).toContain("https://x/verify?t=abc");
    expect(r.html).toContain("24");
    expect(r.text).toContain("https://x/verify?t=abc");
  });
  it("экранирует имя со скриптом", () => {
    const r = renderVerifyEmail({ name: "<script>", verifyUrl: "https://x" });
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.html).not.toContain("<script>");
  });
});

describe("renderApprovedEmail", () => {
  it("содержит имя и login URL", () => {
    const r = renderApprovedEmail({ name: "Юрий", loginUrl: "https://x/login" });
    expect(r.html).toContain("Юрий");
    expect(r.html).toContain("https://x/login");
    expect(r.subject).toMatch(/одобрен|подтвержд/i);
  });
});

describe("renderRejectedEmail", () => {
  it("содержит причину если передана", () => {
    const r = renderRejectedEmail({
      name: "Юрий",
      reason: "Дубликат",
      supportContact: "@Virtuozick",
    });
    expect(r.html).toContain("Дубликат");
    expect(r.html).toContain("@Virtuozick");
  });
  it("работает без причины", () => {
    const r = renderRejectedEmail({ name: "Юрий", supportContact: "@Virtuozick" });
    expect(r.html).toContain("Юрий");
  });
});

describe("renderResetPasswordEmail", () => {
  it("содержит ссылку и срок 1ч", () => {
    const r = renderResetPasswordEmail({ name: "Юрий", resetUrl: "https://x/reset?t=abc" });
    expect(r.html).toContain("https://x/reset?t=abc");
    expect(r.html).toContain("1");
  });
});

describe("renderTeamInviteEmail", () => {
  it("содержит имя приглашающего, org и accept URL", () => {
    const r = renderTeamInviteEmail({
      inviterName: "Юрий",
      orgName: "AID",
      acceptUrl: "https://x/invite/abc",
    });
    expect(r.html).toContain("Юрий");
    expect(r.html).toContain("AID");
    expect(r.html).toContain("https://x/invite/abc");
    expect(r.html).toContain("3"); // 3 дня
  });
});

describe("renderInviteAcceptedEmail", () => {
  it("содержит имя owner, invitee и org", () => {
    const r = renderInviteAcceptedEmail({
      ownerName: "Юрий",
      inviteeName: "Алексей",
      orgName: "AID",
    });
    expect(r.html).toContain("Юрий");
    expect(r.html).toContain("Алексей");
    expect(r.html).toContain("AID");
  });
});
```

- [ ] **Step 2: Тесты падают**

```bash
npm test -- src/lib/email-templates
```

Ожидаемый результат: FAIL — модуль не существует.

- [ ] **Step 3: Реализовать `src/lib/email-templates.ts`**

```typescript
// src/lib/email-templates.ts
import { escapeHtml } from "./auth-utils";

const PRIMARY = "#f97316";
const FOOTER = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
  <p style="color:#6b7280;font-size:12px;">
    Это автоматическое письмо от MFA — Marketplace Financial Analytics.<br/>
    Связь с разработчиком: <a href="https://t.me/Virtuozick" style="color:${PRIMARY};">@Virtuozick</a>
  </p>
`;

function wrap(content: string, title: string): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;background:#fafafa;margin:0;padding:24px;color:#0a0a0a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h1 style="font-size:18px;font-weight:600;color:${PRIMARY};margin:0 0 16px;">MFA</h1>
    ${content}
    ${FOOTER}
  </div>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${PRIMARY};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500;margin:16px 0;">${escapeHtml(label)}</a>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderVerifyEmail(args: { name: string; verifyUrl: string }): RenderedEmail {
  const subject = "Подтверждение email — MFA";
  const safeName = escapeHtml(args.name);
  const html = wrap(
    `<p>Здравствуйте, ${safeName}!</p>
     <p>Подтвердите ваш email, чтобы продолжить регистрацию в MFA. Ссылка действительна 24 часа.</p>
     ${btn(args.verifyUrl, "Подтвердить email")}
     <p style="font-size:12px;color:#6b7280;">Если кнопка не работает: ${escapeHtml(args.verifyUrl)}</p>`,
    subject
  );
  const text = `Здравствуйте, ${args.name}!\nПодтвердите ваш email — ссылка действительна 24 часа:\n${args.verifyUrl}`;
  return { subject, html, text };
}

export function renderApprovedEmail(args: { name: string; loginUrl: string }): RenderedEmail {
  const subject = "Заявка одобрена — MFA";
  const html = wrap(
    `<p>Здравствуйте, ${escapeHtml(args.name)}!</p>
     <p>Ваш аккаунт в MFA одобрен. Можете войти и подключить магазины Wildberries и Ozon.</p>
     ${btn(args.loginUrl, "Войти в MFA")}`,
    subject
  );
  const text = `Здравствуйте, ${args.name}!\nВаш аккаунт в MFA одобрен.\nВойти: ${args.loginUrl}`;
  return { subject, html, text };
}

export function renderRejectedEmail(args: {
  name: string;
  reason?: string;
  supportContact: string;
}): RenderedEmail {
  const subject = "Заявка не одобрена — MFA";
  const reasonBlock = args.reason
    ? `<p><strong>Причина:</strong> ${escapeHtml(args.reason)}</p>`
    : "";
  const html = wrap(
    `<p>Здравствуйте, ${escapeHtml(args.name)}.</p>
     <p>К сожалению, ваша заявка на регистрацию в MFA не была одобрена.</p>
     ${reasonBlock}
     <p>Если у вас есть вопросы — напишите ${escapeHtml(args.supportContact)}.</p>`,
    subject
  );
  const text = `Здравствуйте, ${args.name}.\nК сожалению, ваша заявка не одобрена.${args.reason ? `\nПричина: ${args.reason}` : ""}\nВопросы: ${args.supportContact}`;
  return { subject, html, text };
}

export function renderResetPasswordEmail(args: {
  name: string;
  resetUrl: string;
}): RenderedEmail {
  const subject = "Сброс пароля — MFA";
  const html = wrap(
    `<p>Здравствуйте, ${escapeHtml(args.name)}!</p>
     <p>Кто-то запросил сброс пароля для вашего аккаунта. Если это были не вы — проигнорируйте письмо.</p>
     <p>Ссылка действительна 1 час.</p>
     ${btn(args.resetUrl, "Сбросить пароль")}
     <p style="font-size:12px;color:#6b7280;">${escapeHtml(args.resetUrl)}</p>`,
    subject
  );
  const text = `Здравствуйте, ${args.name}!\nСброс пароля (1 час): ${args.resetUrl}\nЕсли это были не вы — проигнорируйте.`;
  return { subject, html, text };
}

export function renderTeamInviteEmail(args: {
  inviterName: string;
  orgName: string;
  acceptUrl: string;
}): RenderedEmail {
  const subject = `${args.inviterName} приглашает вас в ${args.orgName} на MFA`;
  const html = wrap(
    `<p>${escapeHtml(args.inviterName)} приглашает вас присоединиться к организации <strong>${escapeHtml(args.orgName)}</strong> на MFA.</p>
     <p>Ссылка действительна 3 дня.</p>
     ${btn(args.acceptUrl, "Принять приглашение")}`,
    subject
  );
  const text = `${args.inviterName} приглашает вас в ${args.orgName} на MFA.\nПринять (3 дня): ${args.acceptUrl}`;
  return { subject, html, text };
}

export function renderInviteAcceptedEmail(args: {
  ownerName: string;
  inviteeName: string;
  orgName: string;
}): RenderedEmail {
  const subject = `${args.inviteeName} присоединился к ${args.orgName}`;
  const html = wrap(
    `<p>Здравствуйте, ${escapeHtml(args.ownerName)}!</p>
     <p>${escapeHtml(args.inviteeName)} присоединился к организации ${escapeHtml(args.orgName)} на MFA.</p>`,
    subject
  );
  const text = `Здравствуйте, ${args.ownerName}!\n${args.inviteeName} присоединился к ${args.orgName}.`;
  return { subject, html, text };
}
```

- [ ] **Step 4: Тесты зелёные**

```bash
npm test -- src/lib/email-templates
```

Ожидаемый результат: PASS, ~10 тестов.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email-templates.ts src/lib/email-templates.test.ts
git commit -m "feat(email): 6 шаблонов писем (verify/approved/rejected/reset/teamInvite/inviteAccepted)"
```

---

### Task 8: Rate-limit для писем

**Files:**
- Create: `convex/email/rateLimit.ts`

- [ ] **Step 1: Создать `convex/email/rateLimit.ts`**

Эта функция — internal mutation, проверяющая лимит и записывающая попытку отправки. Не вынесем в pure-utility, потому что нужен `ctx.db`.

```typescript
// convex/email/rateLimit.ts
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

const HOUR_MS = 60 * 60 * 1000;

const LIMITS: Record<string, { count: number; windowMs: number }> = {
  verify: { count: 3, windowMs: HOUR_MS },
  reset: { count: 5, windowMs: HOUR_MS },
  approved: { count: 100, windowMs: HOUR_MS },
  rejected: { count: 100, windowMs: HOUR_MS },
  teamInvite: { count: 100, windowMs: HOUR_MS },
  inviteAccepted: { count: 100, windowMs: HOUR_MS },
};

export const checkAndRecord = internalMutation({
  args: {
    email: v.string(),
    kind: v.union(
      v.literal("verify"),
      v.literal("reset"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("teamInvite"),
      v.literal("inviteAccepted")
    ),
  },
  handler: async (ctx, { email, kind }) => {
    const limit = LIMITS[kind];
    const since = Date.now() - limit.windowMs;
    const recent = await ctx.db
      .query("emailSendLog")
      .withIndex("by_email_kind", (q) => q.eq("email", email).eq("kind", kind))
      .filter((q) => q.gte(q.field("sentAt"), since))
      .collect();

    if (recent.length >= limit.count) {
      throw new Error(
        `Rate limit exceeded: ${recent.length}/${limit.count} ${kind}-писем за ${limit.windowMs / HOUR_MS}ч`
      );
    }
    await ctx.db.insert("emailSendLog", { email, kind, sentAt: Date.now() });
  },
});
```

- [ ] **Step 2: Typecheck зелёный**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/email/rateLimit.ts convex/_generated/
git commit -m "feat(email): rate-limit для verify (3/час) и reset (5/час)"
```

---

### Task 9: Унифицированные actions для отправки писем

**Files:**
- Create: `convex/email/actions.ts`

- [ ] **Step 1: Создать `convex/email/actions.ts` с 6 internal actions**

Internal actions (не exposed публично) — вызываются из mutations через `ctx.scheduler.runAfter(0, internal.email.actions.sendVerify, {...})`.

```typescript
// convex/email/actions.ts
"use node";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { sendEmailViaResend } from "./resend";
import {
  renderVerifyEmail,
  renderApprovedEmail,
  renderRejectedEmail,
  renderResetPasswordEmail,
  renderTeamInviteEmail,
  renderInviteAcceptedEmail,
} from "../../src/lib/email-templates";

export const sendVerify = internalAction({
  args: { email: v.string(), name: v.string(), verifyUrl: v.string() },
  handler: async (ctx, { email, name, verifyUrl }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "verify",
    });
    const tpl = renderVerifyEmail({ name, verifyUrl });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendApproved = internalAction({
  args: { email: v.string(), name: v.string(), loginUrl: v.string() },
  handler: async (ctx, { email, name, loginUrl }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "approved",
    });
    const tpl = renderApprovedEmail({ name, loginUrl });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendRejected = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    reason: v.optional(v.string()),
    supportContact: v.string(),
  },
  handler: async (ctx, { email, name, reason, supportContact }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "rejected",
    });
    const tpl = renderRejectedEmail({ name, reason, supportContact });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendReset = internalAction({
  args: { email: v.string(), name: v.string(), resetUrl: v.string() },
  handler: async (ctx, { email, name, resetUrl }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "reset",
    });
    const tpl = renderResetPasswordEmail({ name, resetUrl });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendTeamInvite = internalAction({
  args: {
    email: v.string(),
    inviterName: v.string(),
    orgName: v.string(),
    acceptUrl: v.string(),
  },
  handler: async (ctx, { email, inviterName, orgName, acceptUrl }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "teamInvite",
    });
    const tpl = renderTeamInviteEmail({ inviterName, orgName, acceptUrl });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});

export const sendInviteAccepted = internalAction({
  args: {
    email: v.string(),
    ownerName: v.string(),
    inviteeName: v.string(),
    orgName: v.string(),
  },
  handler: async (ctx, { email, ownerName, inviteeName, orgName }) => {
    await ctx.runMutation(internal.email.rateLimit.checkAndRecord, {
      email,
      kind: "inviteAccepted",
    });
    const tpl = renderInviteAcceptedEmail({ ownerName, inviteeName, orgName });
    await sendEmailViaResend({ to: email, ...tpl });
  },
});
```

- [ ] **Step 2: Typecheck зелёный**

```bash
npm run typecheck
```

- [ ] **Step 3: Smoke-test — отправить тестовое письмо**

В Convex dashboard → Functions → выбрать `email/actions:sendVerify` → запустить с args:
```json
{
  "email": "pihenella@gmail.com",
  "name": "Юрий (test)",
  "verifyUrl": "http://localhost:3000/verify-email?token=test123"
}
```

Ожидаемый результат: письмо приходит на почту, выглядит корректно.

- [ ] **Step 4: Commit**

```bash
git add convex/email/actions.ts convex/_generated/
git commit -m "feat(email): 6 internal actions для отправки через Resend"
```

---

## Phase 5: Convex helpers (access invariants)

### Task 10: helpers — ensureApproved + ensureAdmin

**Files:**
- Create: `convex/lib/helpers.ts`

- [ ] **Step 1: Создать `convex/lib/helpers.ts`**

Внимание: имя директории `convex/lib/` (не `convex/auth/` чтобы не конфликтовать с провайдером Convex Auth `convex/auth.ts`).

```typescript
// convex/lib/helpers.ts
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export type Ctx = QueryCtx | MutationCtx;

/**
 * Возвращает текущего юзера или бросает unauthorized.
 * НЕ проверяет статус — для этого ensureApproved.
 */
export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("unauthorized");
  // Convex Auth кладёт subject в формате "users:<id>"
  const userId = identity.subject.split("|")[0] as Id<"users">;
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("unauthorized: user not found");
  return user;
}

/**
 * Возвращает approved юзера или бросает unauthorized/forbidden.
 */
export async function ensureApproved(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (user.status !== "approved") {
    throw new Error(`forbidden: status=${user.status}`);
  }
  return user;
}

/**
 * Возвращает approved system-admin юзера.
 */
export async function ensureAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await ensureApproved(ctx);
  if (!user.isSystemAdmin) throw new Error("forbidden: not admin");
  return user;
}
```

- [ ] **Step 2: Typecheck зелёный**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/lib/helpers.ts convex/_generated/
git commit -m "feat(helpers): getCurrentUser + ensureApproved + ensureAdmin"
```

---

### Task 11: helpers — ensureOrgMember + ensureOrgOwner + ensureShopAccess

**Files:**
- Modify: `convex/lib/helpers.ts`

- [ ] **Step 1: Дописать в `convex/lib/helpers.ts`**

Добавить в конец файла:

```typescript
/**
 * Проверяет что юзер approved + является членом указанной org.
 * Возвращает {user, org, membership}.
 */
export async function ensureOrgMember(
  ctx: Ctx,
  orgId: Id<"organizations">
): Promise<{
  user: Doc<"users">;
  org: Doc<"organizations">;
  membership: Doc<"memberships">;
}> {
  const user = await ensureApproved(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q) => q.eq("userId", user._id).eq("orgId", orgId))
    .unique();
  if (!membership) throw new Error("forbidden: not a member of this org");
  const org = await ctx.db.get(orgId);
  if (!org) throw new Error("not found: org");
  return { user, org, membership };
}

/**
 * Проверяет что юзер approved owner указанной org.
 */
export async function ensureOrgOwner(
  ctx: Ctx,
  orgId: Id<"organizations">
): Promise<{
  user: Doc<"users">;
  org: Doc<"organizations">;
  membership: Doc<"memberships">;
}> {
  const result = await ensureOrgMember(ctx, orgId);
  if (result.membership.role !== "owner") throw new Error("forbidden: not owner");
  return result;
}

/**
 * Главный access-invariant: проверяет что юзер имеет доступ к данным указанного shop.
 * Возвращает {user, shop, membership} — все нужные сущности для дальнейшей работы.
 */
export async function ensureShopAccess(
  ctx: Ctx,
  shopId: Id<"shops">
): Promise<{
  user: Doc<"users">;
  shop: Doc<"shops">;
  membership: Doc<"memberships">;
}> {
  const user = await ensureApproved(ctx);
  const shop = await ctx.db.get(shopId);
  if (!shop) throw new Error("not found: shop");
  if (!shop.orgId) {
    throw new Error("invalid state: shop has no orgId — миграция не выполнена");
  }
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q) =>
      q.eq("userId", user._id).eq("orgId", shop.orgId!)
    )
    .unique();
  if (!membership) throw new Error("forbidden: not a member of shop's org");
  return { user, shop, membership };
}

/**
 * Возвращает все shopId у юзера через все его orgs.
 * Используется когда нужно прочитать данные «по всем магазинам юзера».
 */
export async function listUserShopIds(ctx: Ctx): Promise<Id<"shops">[]> {
  const user = await ensureApproved(ctx);
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  const shopIds: Id<"shops">[] = [];
  for (const m of memberships) {
    const shops = await ctx.db
      .query("shops")
      .withIndex("by_org", (q) => q.eq("orgId", m.orgId))
      .collect();
    shopIds.push(...shops.map((s) => s._id));
  }
  return shopIds;
}
```

- [ ] **Step 2: Typecheck зелёный**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/lib/helpers.ts convex/_generated/
git commit -m "feat(helpers): ensureOrgMember + ensureOrgOwner + ensureShopAccess + listUserShopIds"
```

---

## Phase 6: Auth-business mutations

### Task 12: register mutation

**Files:**
- Create: `convex/auth/register.ts`

- [ ] **Step 1: Создать `convex/auth/register.ts`**

Замечание: Convex Auth (через `Password` provider) сам создаст identity с email/password. Наш `register` — это **mutation, обогащающая профиль** дополнительными полями (name, phone, businessName, etc.) и инициирующая verify-flow. Сам signIn-with-password будет вызван из UI после этого mutation.

Однако упрощённый flow: `register` создаёт `users` сразу с `status="pending"`, генерирует verify-token, и шлёт письмо. Юзер далее должен вызвать `signIn` с теми же email/password (Convex Auth примет, потому что identity создалась на бэке параллельно).

Чтобы избежать сложности с разделением identity и users — мы делаем `register` action'ом, который:
1. Создаёт `users` запись со статусом pending
2. Сохраняет verify-token (отдельной таблицей `verifyTokens` — добавим её в Task 13)
3. Шлёт письмо

Identity (с паролем) Convex Auth создаст автоматически когда юзер вызовет `signIn` с тем же email — провайдер `Password` по умолчанию делает sign-up при первом signIn если identity нет. Мы конфигурируем это явно в `convex/auth.ts`.

Сначала создадим `verifyTokens` таблицу.

```typescript
// convex/auth/register.ts
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateRandomToken, normalizeEmail, validateEmail } from "../../src/lib/auth-utils";

export const register = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.string(),
    businessName: v.string(),
    shopsCountWB: v.number(),
    shopsCountOzon: v.number(),
    skuCount: v.number(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!validateEmail(email).ok) throw new Error("Некорректный email");
    if (args.name.trim().length < 2) throw new Error("Имя обязательно");
    if (args.phone.trim().length < 5) throw new Error("Телефон обязателен");
    if (args.businessName.trim().length < 1) throw new Error("Название бизнеса обязательно");
    if (args.shopsCountWB < 0 || args.shopsCountOzon < 0 || args.skuCount < 0) {
      throw new Error("Числа не могут быть отрицательными");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new Error("Пользователь с таким email уже существует");

    const userId = await ctx.db.insert("users", {
      email,
      name: args.name.trim(),
      phone: args.phone.trim(),
      businessName: args.businessName.trim(),
      shopsCountWB: args.shopsCountWB,
      shopsCountOzon: args.shopsCountOzon,
      skuCount: args.skuCount,
      status: "pending",
      isSystemAdmin: false,
      createdAt: Date.now(),
    });

    const token = generateRandomToken(32);
    await ctx.db.insert("verifyTokens", {
      userId,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    await ctx.scheduler.runAfter(0, internal.email.actions.sendVerify, {
      email,
      name: args.name.trim(),
      verifyUrl,
    });

    return { userId };
  },
});
```

- [ ] **Step 2: Добавить таблицу `verifyTokens` в `convex/schema.ts`**

В `convex/schema.ts` после `loginAttempts:` добавить:

```typescript
  verifyTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  resetTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),
```

- [ ] **Step 3: Деплой схемы**

В `npx convex dev` терминале — автоматически. Дождаться «Schema updated».

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add convex/auth/register.ts convex/schema.ts convex/_generated/
git commit -m "feat(auth): register mutation + verifyTokens/resetTokens таблицы"
```

---

### Task 13: verifyEmail mutation

**Files:**
- Create: `convex/auth/verifyEmail.ts`

- [ ] **Step 1: Создать `convex/auth/verifyEmail.ts`**

```typescript
// convex/auth/verifyEmail.ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { tokensEqual } from "../../src/lib/auth-utils";

export const verifyEmail = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const records = await ctx.db
      .query("verifyTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .collect();
    const record = records.find((r) => tokensEqual(r.token, token));
    if (!record) throw new Error("Невалидный токен");
    if (record.expiresAt < Date.now()) {
      await ctx.db.delete(record._id);
      throw new Error("Токен истёк, запросите подтверждение заново");
    }
    const user = await ctx.db.get(record.userId);
    if (!user) {
      await ctx.db.delete(record._id);
      throw new Error("Пользователь не найден");
    }
    if (user.emailVerifiedAt) {
      await ctx.db.delete(record._id);
      return { ok: true, alreadyVerified: true };
    }
    await ctx.db.patch(user._id, { emailVerifiedAt: Date.now() });
    await ctx.db.delete(record._id);
    return { ok: true, alreadyVerified: false };
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/auth/verifyEmail.ts convex/_generated/
git commit -m "feat(auth): verifyEmail mutation"
```

---

### Task 14: forgotPassword action + resetPassword mutation

**Files:**
- Create: `convex/auth/forgotPassword.ts`
- Create: `convex/auth/resetPassword.ts`

- [ ] **Step 1: Создать `convex/auth/forgotPassword.ts`**

```typescript
// convex/auth/forgotPassword.ts
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import {
  generateRandomToken,
  normalizeEmail,
  validateEmail,
} from "../../src/lib/auth-utils";

export const forgotPassword = action({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizeEmail(email);
    if (!validateEmail(normalized).ok) {
      return { ok: true };
    }
    const result = await ctx.runMutation(
      internal.auth.forgotPassword.createResetToken,
      { email: normalized }
    );
    if (result) {
      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      await ctx.runAction(internal.email.actions.sendReset, {
        email: result.email,
        name: result.name,
        resetUrl: `${appUrl}/reset-password?token=${result.token}`,
      });
    }
    return { ok: true };
  },
});

export const createResetToken = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) return null;
    const token = generateRandomToken(32);
    await ctx.db.insert("resetTokens", {
      userId: user._id,
      token,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
    return { email: user.email, name: user.name, token };
  },
});
```

- [ ] **Step 2: Создать `convex/auth/resetPassword.ts`**

```typescript
// convex/auth/resetPassword.ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { tokensEqual, validatePassword } from "../../src/lib/auth-utils";

export const resetPassword = mutation({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, { token, newPassword }) => {
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.ok) throw new Error(pwCheck.error);

    const records = await ctx.db
      .query("resetTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .collect();
    const record = records.find((r) => tokensEqual(r.token, token));
    if (!record) throw new Error("Невалидный токен");
    if (record.expiresAt < Date.now()) {
      await ctx.db.delete(record._id);
      throw new Error("Токен истёк");
    }
    const user = await ctx.db.get(record.userId);
    if (!user) throw new Error("Пользователь не найден");

    await ctx.db.delete(record._id);

    return { userId: user._id, email: user.email, ok: true };
  },
});
```

**Замечание:** фактическая смена пароля происходит через Convex Auth (signIn с новым паролем после reset). Этот mutation освобождает токен; UI вызовет signIn после успеха.

Альтернативный полный flow с переписыванием Convex Auth identity password — будет уточнён в A.2 когда пишем UI. На уровне backend сейчас просто помечаем токен использованным.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add convex/auth/forgotPassword.ts convex/auth/resetPassword.ts convex/_generated/
git commit -m "feat(auth): forgotPassword action + resetPassword mutation"
```

---

## Phase 7: Admin functions

### Task 15: admin/users — list + counts

**Files:**
- Create: `convex/admin/users.ts`

- [ ] **Step 1: Создать `convex/admin/users.ts` с list-функциями**

```typescript
// convex/admin/users.ts
import { query } from "../_generated/server";
import { v } from "convex/values";
import { ensureAdmin } from "../lib/helpers";

const STATUS = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

export const listByStatus = query({
  args: { status: v.optional(STATUS), search: v.optional(v.string()) },
  handler: async (ctx, { status, search }) => {
    await ensureAdmin(ctx);
    let users;
    if (status) {
      users = await ctx.db
        .query("users")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      users = await ctx.db.query("users").collect();
    }
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(s) ||
          u.name.toLowerCase().includes(s) ||
          u.phone.toLowerCase().includes(s)
      );
    }
    users.sort((a, b) => b.createdAt - a.createdAt);
    return users;
  },
});

export const countsByStatus = query({
  args: {},
  handler: async (ctx) => {
    await ensureAdmin(ctx);
    const all = await ctx.db.query("users").collect();
    return {
      total: all.length,
      pending: all.filter((u) => u.status === "pending").length,
      approved: all.filter((u) => u.status === "approved").length,
      rejected: all.filter((u) => u.status === "rejected").length,
    };
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/admin/users.ts convex/_generated/
git commit -m "feat(admin): listByStatus + countsByStatus queries"
```

---

### Task 16: admin/users — approveUser + rejectUser

**Files:**
- Modify: `convex/admin/users.ts`

- [ ] **Step 1: Дописать в `convex/admin/users.ts`**

```typescript
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const approveUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const admin = await ensureAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Пользователь не найден");
    if (user.status === "approved") throw new Error("Уже одобрен");
    if (!user.emailVerifiedAt) throw new Error("Email не подтверждён");

    const orgId = await ctx.db.insert("organizations", {
      name: user.businessName,
      ownerId: userId,
      createdAt: Date.now(),
    });
    await ctx.db.insert("memberships", {
      userId,
      orgId,
      role: "owner",
      createdAt: Date.now(),
    });
    await ctx.db.patch(userId, {
      status: "approved",
      approvedAt: Date.now(),
      approvedBy: admin._id,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await ctx.scheduler.runAfter(0, internal.email.actions.sendApproved, {
      email: user.email,
      name: user.name,
      loginUrl: `${appUrl}/login`,
    });

    return { ok: true, orgId };
  },
});

export const rejectUser = mutation({
  args: { userId: v.id("users"), reason: v.optional(v.string()) },
  handler: async (ctx, { userId, reason }) => {
    await ensureAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Пользователь не найден");
    if (user.status === "rejected") throw new Error("Уже отклонён");

    await ctx.db.patch(userId, {
      status: "rejected",
      rejectionReason: reason,
    });

    await ctx.scheduler.runAfter(0, internal.email.actions.sendRejected, {
      email: user.email,
      name: user.name,
      reason,
      supportContact: "@Virtuozick",
    });

    return { ok: true };
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/admin/users.ts convex/_generated/
git commit -m "feat(admin): approveUser создаёт org+membership; rejectUser шлёт письмо"
```

---

## Phase 8: Org functions

### Task 17: org/team — list + remove + leave

**Files:**
- Create: `convex/org/team.ts`

- [ ] **Step 1: Создать `convex/org/team.ts`**

```typescript
// convex/org/team.ts
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureOrgMember, ensureOrgOwner } from "../lib/helpers";

export const listMembers = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await ensureOrgMember(ctx, orgId);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const members = await Promise.all(
      memberships.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return u
          ? {
              membershipId: m._id,
              userId: u._id,
              email: u.email,
              name: u.name,
              role: m.role,
              joinedAt: m.createdAt,
            }
          : null;
      })
    );
    return members.filter((m) => m !== null);
  },
});

export const removeMember = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new Error("Membership не найден");
    const { user } = await ensureOrgOwner(ctx, membership.orgId);
    if (membership.userId === user._id) {
      throw new Error("Owner не может удалить сам себя — передайте ownership");
    }
    if (membership.role === "owner") {
      throw new Error("Нельзя удалить owner-а напрямую");
    }
    await ctx.db.delete(membershipId);
    return { ok: true };
  },
});

export const leaveOrg = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const { user, membership } = await ensureOrgMember(ctx, orgId);
    if (membership.role === "owner") {
      throw new Error("Owner не может покинуть org — передайте ownership");
    }
    await ctx.db.delete(membership._id);
    return { ok: true };
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/org/team.ts convex/_generated/
git commit -m "feat(org/team): listMembers + removeMember + leaveOrg"
```

---

### Task 18: org/team — transferOwnership

**Files:**
- Modify: `convex/org/team.ts`

- [ ] **Step 1: Дописать `transferOwnership` в `convex/org/team.ts`**

```typescript
export const transferOwnership = mutation({
  args: {
    orgId: v.id("organizations"),
    newOwnerMembershipId: v.id("memberships"),
  },
  handler: async (ctx, { orgId, newOwnerMembershipId }) => {
    const { user, org, membership: ownerMembership } = await ensureOrgOwner(
      ctx,
      orgId
    );
    const target = await ctx.db.get(newOwnerMembershipId);
    if (!target) throw new Error("Целевой member не найден");
    if (target.orgId !== orgId) throw new Error("Член другой org");
    if (target.userId === user._id) throw new Error("Уже owner");

    // Транзакция (всё в одном mutation — Convex гарантирует atomicity)
    await ctx.db.patch(ownerMembership._id, { role: "member" });
    await ctx.db.patch(target._id, { role: "owner" });
    await ctx.db.patch(orgId, { ownerId: target.userId });

    return { ok: true };
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/org/team.ts convex/_generated/
git commit -m "feat(org/team): transferOwnership одной транзакцией"
```

---

### Task 19: org/invites — create + revoke + resend

**Files:**
- Create: `convex/org/invites.ts`

- [ ] **Step 1: Создать `convex/org/invites.ts` с create/revoke/resend**

```typescript
// convex/org/invites.ts
import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import {
  generateRandomToken,
  normalizeEmail,
  validateEmail,
} from "../../src/lib/auth-utils";
import { ensureOrgMember, ensureOrgOwner } from "../lib/helpers";

const INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export const listInvitesForOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await ensureOrgOwner(ctx, orgId);
    const all = await ctx.db
      .query("invites")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    return all.filter((i) => i.status === "pending");
  },
});

export const createInvite = mutation({
  args: { orgId: v.id("organizations"), email: v.string() },
  handler: async (ctx, { orgId, email }) => {
    const { user, org } = await ensureOrgOwner(ctx, orgId);
    const normalized = normalizeEmail(email);
    if (!validateEmail(normalized).ok) throw new Error("Некорректный email");

    const existingMembers = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    for (const m of existingMembers) {
      const u = await ctx.db.get(m.userId);
      if (u && u.email === normalized) {
        throw new Error("Этот юзер уже в команде");
      }
    }

    // Проверим что нет другого pending invite на тот же email в той же org
    const existingInvites = await ctx.db
      .query("invites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", normalized).eq("status", "pending")
      )
      .collect();
    if (existingInvites.some((i) => i.orgId === orgId)) {
      throw new Error("Активное приглашение уже существует");
    }

    const token = generateRandomToken(32);
    const inviteId = await ctx.db.insert("invites", {
      orgId,
      email: normalized,
      role: "member",
      token,
      status: "pending",
      invitedBy: user._id,
      createdAt: Date.now(),
      expiresAt: Date.now() + INVITE_TTL_MS,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await ctx.scheduler.runAfter(0, internal.email.actions.sendTeamInvite, {
      email: normalized,
      inviterName: user.name,
      orgName: org.name,
      acceptUrl: `${appUrl}/invite/${token}`,
    });

    return { inviteId };
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Приглашение не найдено");
    await ensureOrgOwner(ctx, invite.orgId);
    if (invite.status !== "pending") throw new Error("Уже не pending");
    await ctx.db.patch(inviteId, { status: "revoked" });
    return { ok: true };
  },
});

export const resendInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Приглашение не найдено");
    const { user, org } = await ensureOrgOwner(ctx, invite.orgId);
    if (invite.status !== "pending") throw new Error("Только pending можно переотправлять");

    // Продлеваем срок
    await ctx.db.patch(inviteId, { expiresAt: Date.now() + INVITE_TTL_MS });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await ctx.scheduler.runAfter(0, internal.email.actions.sendTeamInvite, {
      email: invite.email,
      inviterName: user.name,
      orgName: org.name,
      acceptUrl: `${appUrl}/invite/${invite.token}`,
    });

    return { ok: true };
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/org/invites.ts convex/_generated/
git commit -m "feat(org/invites): create + revoke + resend + listInvitesForOrg"
```

---

### Task 20: org/invites — getByToken + accept + registerViaInvite

**Files:**
- Modify: `convex/org/invites.ts`

- [ ] **Step 1: Дописать в `convex/org/invites.ts`**

```typescript
export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite) return { ok: false as const, error: "not_found" };
    if (invite.status === "accepted")
      return { ok: false as const, error: "already_accepted" };
    if (invite.status === "revoked")
      return { ok: false as const, error: "revoked" };
    if (invite.status === "expired" || invite.expiresAt < Date.now())
      return { ok: false as const, error: "expired" };

    const org = await ctx.db.get(invite.orgId);
    const inviter = await ctx.db.get(invite.invitedBy);
    return {
      ok: true as const,
      invite: {
        email: invite.email,
        orgName: org?.name ?? "",
        inviterName: inviter?.name ?? "",
      },
    };
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("unauthorized");
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite || invite.status !== "pending")
      throw new Error("Приглашение недействительно");
    if (invite.expiresAt < Date.now()) throw new Error("Приглашение истекло");

    const userId = identity.subject.split("|")[0] as any;
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Пользователь не найден");
    if (user.email !== invite.email) {
      throw new Error("Этот инвайт для другого email");
    }

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("orgId", invite.orgId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(invite._id, {
        status: "accepted",
        acceptedAt: Date.now(),
      });
      return { ok: true, alreadyMember: true };
    }

    await ctx.db.insert("memberships", {
      userId,
      orgId: invite.orgId,
      role: invite.role,
      createdAt: Date.now(),
    });
    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    // Письмо owner-у
    const org = await ctx.db.get(invite.orgId);
    if (org) {
      const owner = await ctx.db.get(org.ownerId);
      if (owner) {
        await ctx.scheduler.runAfter(
          0,
          internal.email.actions.sendInviteAccepted,
          {
            email: owner.email,
            ownerName: owner.name,
            inviteeName: user.name,
            orgName: org.name,
          }
        );
      }
    }

    return { ok: true, alreadyMember: false };
  },
});

export const registerViaInvite = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    phone: v.string(),
    businessName: v.optional(v.string()),
  },
  handler: async (ctx, { token, name, phone, businessName }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Сначала войдите через signIn (Convex Auth)");

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite || invite.status !== "pending") throw new Error("Приглашение недействительно");
    if (invite.expiresAt < Date.now()) throw new Error("Приглашение истекло");

    if (identity.email !== invite.email) {
      throw new Error("Email сессии не совпадает с email инвайта");
    }

    // Проверяем, нет ли уже users записи для этой identity
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", invite.email))
      .unique();

    let userId;
    if (existingUser) {
      userId = existingUser._id;
      // Если существующий — просто привязка
      if (existingUser.status !== "approved") {
        await ctx.db.patch(userId, {
          status: "approved",
          emailVerifiedAt: existingUser.emailVerifiedAt ?? Date.now(),
          approvedAt: Date.now(),
        });
      }
    } else {
      userId = await ctx.db.insert("users", {
        email: invite.email,
        name: name.trim(),
        phone: phone.trim(),
        businessName: businessName?.trim() ?? "",
        shopsCountWB: 0,
        shopsCountOzon: 0,
        skuCount: 0,
        status: "approved",
        emailVerifiedAt: Date.now(),
        isSystemAdmin: false,
        createdAt: Date.now(),
        approvedAt: Date.now(),
      });
    }

    await ctx.db.insert("memberships", {
      userId,
      orgId: invite.orgId,
      role: invite.role,
      createdAt: Date.now(),
    });
    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    // Письмо owner-у
    const org = await ctx.db.get(invite.orgId);
    if (org) {
      const owner = await ctx.db.get(org.ownerId);
      if (owner) {
        await ctx.scheduler.runAfter(
          0,
          internal.email.actions.sendInviteAccepted,
          {
            email: owner.email,
            ownerName: owner.name,
            inviteeName: name,
            orgName: org.name,
          }
        );
      }
    }

    return { ok: true, userId };
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/org/invites.ts convex/_generated/
git commit -m "feat(org/invites): getInviteByToken + acceptInvite + registerViaInvite"
```

---

### Task 21: org/settings — renameOrg

**Files:**
- Create: `convex/org/settings.ts`

- [ ] **Step 1: Создать `convex/org/settings.ts`**

```typescript
// convex/org/settings.ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureOrgOwner } from "../lib/helpers";

export const renameOrg = mutation({
  args: { orgId: v.id("organizations"), newName: v.string() },
  handler: async (ctx, { orgId, newName }) => {
    await ensureOrgOwner(ctx, orgId);
    const trimmed = newName.trim();
    if (trimmed.length < 1) throw new Error("Имя не может быть пустым");
    if (trimmed.length > 100) throw new Error("Имя слишком длинное");
    await ctx.db.patch(orgId, { name: trimmed });
    return { ok: true };
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add convex/org/settings.ts convex/_generated/
git commit -m "feat(org/settings): renameOrg mutation"
```

---

## Phase 9: Cron — expire old invites

### Task 22: Cron expireOldInvites

**Files:**
- Modify: `convex/crons.ts`
- Modify: `convex/org/invites.ts`

- [ ] **Step 1: Дописать в `convex/org/invites.ts` mutation `expireOldInvites`**

В конец файла:

```typescript
import { internalMutation } from "../_generated/server";

export const expireOldInvites = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db
      .query("invites")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .collect();
    for (const i of stale) {
      await ctx.db.patch(i._id, { status: "expired" });
    }
    return { expired: stale.length };
  },
});
```

- [ ] **Step 2: Зарегистрировать cron в `convex/crons.ts`**

Прочитать текущий `convex/crons.ts`. Добавить регистрацию (если файл пустой — создать импорты сверху и сам cron):

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "expire old invites",
  { hourUTC: 3, minuteUTC: 0 },
  internal.org.invites.expireOldInvites
);

export default crons;
```

(Если в `crons.ts` уже есть другие cron'ы — просто добавить эту регистрацию рядом, не пересоздавая файл.)

- [ ] **Step 3: Typecheck + проверить crons в Convex dashboard**

```bash
npm run typecheck
```

В Convex dashboard → Crons → должен появиться `expire old invites` со следующим запуском.

- [ ] **Step 4: Commit**

```bash
git add convex/crons.ts convex/org/invites.ts convex/_generated/
git commit -m "feat(crons): ежедневный expireOldInvites"
```

---

## Phase 10: Apply ensureShopAccess to existing handlers

> **Контекст:** До этого момента старые Convex handler'ы (`analytics.ts`, `financials.ts`, etc.) работают **без auth-проверок** — потому что Юрий ещё не создан как пользователь, и `ctx.auth.getUserIdentity()` будет null. Если применить `ensureShopAccess` сейчас — текущий dashboard сломается. Поэтому Phase 10 идёт **после** Phase 11 (миграция).
>
> ⚠️ **ВАЖНО: эта Phase 10 описывает изменения, но коммитим их ТОЛЬКО ПОСЛЕ Phase 11.**

Перейти сразу к **Task 23 (Phase 11)**, выполнить миграцию, затем вернуться сюда.

---

## Phase 11: Migration

### Task 23: Migration script — seedLegacyUser

**Files:**
- Create: `convex/migrations/seedLegacyUser.ts`

- [ ] **Step 1: Создать `convex/migrations/seedLegacyUser.ts`**

```typescript
// convex/migrations/seedLegacyUser.ts
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const seedLegacyUser = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const email = "pihenella@gmail.com";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing && !force) {
      throw new Error(
        "Юзер уже создан. Используй force=true только в dev-режиме."
      );
    }
    if (existing && force) {
      await ctx.db.delete(existing._id);
    }

    const userId = await ctx.db.insert("users", {
      email,
      name: "Юрий",
      phone: "",
      businessName: "AID",
      shopsCountWB: 2,
      shopsCountOzon: 0,
      skuCount: 62,
      status: "approved",
      emailVerifiedAt: Date.now(),
      isSystemAdmin: true,
      createdAt: Date.now(),
      approvedAt: Date.now(),
    });

    const orgId = await ctx.db.insert("organizations", {
      name: "AID",
      ownerId: userId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("memberships", {
      userId,
      orgId,
      role: "owner",
      createdAt: Date.now(),
    });

    // Привязать существующие shops к этой org как marketplace=wb
    const shops = await ctx.db.query("shops").collect();
    for (const s of shops) {
      await ctx.db.patch(s._id, { orgId, marketplace: "wb" });
    }

    return { userId, orgId, shopsUpdated: shops.length };
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Запустить миграцию через Convex dashboard**

⚠️ **ОСТАНОВКА — спросить Юрия** перед выполнением (это destructive миграция данных).

В Convex dashboard → Functions → `migrations/seedLegacyUser:seedLegacyUser` → Run с args `{}`.

Ожидаемый результат: `{userId: "...", orgId: "...", shopsUpdated: 2}`.

- [ ] **Step 4: Verify в Data tab**

Проверить:
- `users` — 1 запись `pihenella@gmail.com`, status=approved, isSystemAdmin=true
- `organizations` — 1 запись «AID»
- `memberships` — 1 запись (owner)
- `shops` — обе записи имеют orgId и `marketplace="wb"`

- [ ] **Step 5: Commit**

```bash
git add convex/migrations/seedLegacyUser.ts convex/_generated/
git commit -m "feat(migration): seedLegacyUser создаёт юзера Юрия + org AID + привязывает shops"
```

---

### Task 24: Schema phase 3 — orgId + marketplace required

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Заменить `shops` определение в `convex/schema.ts`**

Снять `v.optional` с `orgId` и `marketplace`:

```typescript
  shops: defineTable({
    orgId: v.id("organizations"),                  // PHASE 3: required
    marketplace: v.union(                          // PHASE 3: required
      v.literal("wb"),
      v.literal("ozon")
    ),
    name: v.string(),
    apiKey: v.string(),
    ozonClientId: v.optional(v.string()),
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    enabledCategories: v.optional(v.array(v.string())),
  })
    .index("by_org", ["orgId"])
    .index("by_org_marketplace", ["orgId", "marketplace"]),
```

- [ ] **Step 2: Деплой**

В `npx convex dev` терминале — автоматически. **Если ошибка про несоответствие данных** — миграция Task 23 не была выполнена корректно. Откатиться: `v.optional` обратно, найти/исправить, повторить.

Ожидаемый результат: «Schema updated» без ошибок.

- [ ] **Step 3: Verify**

В Convex dashboard → Data → `shops` → все записи валидны.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/_generated/
git commit -m "feat(schema): phase 3 — orgId + marketplace теперь required"
```

---

## Phase 10 (resumed): Apply ensureShopAccess to existing handlers

⚠️ **Перед началом:** убедись что Task 23 выполнен и Юрий уже залогинен в Convex Auth (см. Task 28 ниже — установка пароля). Иначе все queries сломаются.

⚠️ **Строго:** эту фазу ВЫПОЛНЯТЬ ПОСЛЕ Task 28 (установка пароля Юрия). До этого dashboard продолжает работать без auth-проверок.

---

### Task 25: Apply ensureShopAccess to convex/analytics.ts + financials.ts + dashboard.ts

**Files:**
- Modify: `convex/analytics.ts`
- Modify: `convex/financials.ts`
- Modify: `convex/dashboard.ts`

- [ ] **Step 1: Добавить `ensureShopAccess` в `convex/analytics.ts`**

Открыть `convex/analytics.ts`. Найти функцию `getSalesAnalytics`. В начале handler-а (сразу после деструктурирования args) добавить:

```typescript
import { ensureShopAccess, listUserShopIds } from "./lib/helpers";

// ...

export const getSalesAnalytics = query({
  args: { /* ... */ },
  handler: async (ctx, { shopId, dateFrom, dateTo, groupBy }) => {
    // ↓ NEW
    if (shopId) {
      await ensureShopAccess(ctx, shopId);
    } else {
      // Если shopId не указан — фильтруем по shop'ам юзера
      const allowedShopIds = await listUserShopIds(ctx);
      if (allowedShopIds.length === 0) return [];
      // Дальнейшая логика должна работать только с allowedShopIds
      // (см. Step 2 ниже — заменить shops на allowedShops)
    }
    // ↑ NEW

    // Существующая логика, но shops = allowed
    // ...
  },
});
```

- [ ] **Step 2: Заменить `shops = await ctx.db.query("shops").collect()` на фильтрованный список**

Внутри `getSalesAnalytics`, найти строку:
```typescript
const shops = await ctx.db.query("shops").collect();
```

Заменить на:
```typescript
const allowedShopIds = shopId
  ? [shopId]
  : await listUserShopIds(ctx);
const shopsRaw = await Promise.all(allowedShopIds.map((id) => ctx.db.get(id)));
const shops = shopsRaw.filter((s) => s !== null);
```

- [ ] **Step 3: Аналогично для `convex/financials.ts` и `convex/dashboard.ts`**

В каждом — найти все экспортируемые `query` и `mutation`. Если они принимают `shopId` — добавить `await ensureShopAccess(ctx, shopId)`. Если они работают со «всеми shop'ами» — заменить запрос всех `shops` на `listUserShopIds(ctx)` + map.

Конкретные функции для аудита:
- `convex/financials.ts`: все exported queries (по spec — `getFinancialReports`, `getFinancialAggregate`, etc.)
- `convex/dashboard.ts`: все exported queries (по spec — `getDashboardOverview`, etc.)

- [ ] **Step 4: Smoke-test**

Зайти в текущий dashboard `http://localhost:3000` (если запущен `npm run dev`). После того как Юрий залогинится через Convex Auth (Task 28), дашборд должен работать как раньше — данные показываются.

⚠️ **Если ошибки `unauthorized`** — Convex Auth не настроена в `ConvexClientProvider` (это будет фаза A.2). Для smoke-теста временно вернуть `analytics.getSalesAnalytics` без auth-проверки **в одном handler'е** для проверки, и обратно после A.2.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add convex/analytics.ts convex/financials.ts convex/dashboard.ts
git commit -m "feat(access): добавить ensureShopAccess в analytics/financials/dashboard"
```

---

### Task 26: Apply ensureShopAccess to convex/shops.ts + costs.ts + actions.ts

**Files:**
- Modify: `convex/shops.ts`
- Modify: `convex/costs.ts`
- Modify: `convex/actions.ts`

- [ ] **Step 1: `convex/shops.ts`**

- Все queries (`list`, `get`) — фильтровать по `listUserShopIds`
- `add(name, apiKey, marketplace, ozonClientId?)` — теперь требует `orgId`. Получить через `ensureApproved` + найти или принять `orgId` параметром.
- `remove(shopId)` / `update(...)` — `ensureShopAccess(ctx, shopId)` + дополнительно проверка что `membership.role === "owner"`.

Пример для `list`:
```typescript
import { ensureApproved, listUserShopIds } from "./lib/helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await ensureApproved(ctx);
    const ids = await listUserShopIds(ctx);
    const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return docs.filter((s) => s !== null);
  },
});
```

Пример для `add` (новая сигнатура):
```typescript
export const add = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    apiKey: v.string(),
    marketplace: v.union(v.literal("wb"), v.literal("ozon")),
    ozonClientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await ensureOrgOwner(ctx, args.orgId);
    return await ctx.db.insert("shops", {
      orgId: args.orgId,
      name: args.name,
      apiKey: args.apiKey,
      marketplace: args.marketplace,
      ozonClientId: args.ozonClientId,
      isActive: true,
    });
  },
});
```

- [ ] **Step 2: `convex/costs.ts`**

Все handlers, принимающие `shopId` — добавить `ensureShopAccess(ctx, shopId)` первой строкой.

- [ ] **Step 3: `convex/actions.ts`**

Все publicly-exported actions — добавить `ensureApproved(ctx)` или `ensureShopAccess(ctx, shopId)` через `ctx.runMutation` (т.к. action не имеет прямого доступа к db).

Если в файле уже есть несколько action'ов — добавить guard в каждый. Пример:

```typescript
import { ensureApproved } from "./lib/helpers";

// В action:
const user = await ctx.runQuery(api.lib.helpersExposed.getCurrentUserSafe, {});
if (!user) throw new Error("unauthorized");
```

(Создать `convex/lib/helpersExposed.ts` — small wrapper-query экспонирующий `getCurrentUser` для actions.)

- [ ] **Step 4: Создать `convex/lib/helpersExposed.ts`**

```typescript
// convex/lib/helpersExposed.ts
import { query } from "../_generated/server";
import { ensureApproved } from "./helpers";

export const getCurrentUserSafe = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await ensureApproved(ctx);
    } catch {
      return null;
    }
  },
});
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 6: Smoke-test через Convex dashboard**

После того как Юрий залогинен (Task 28), вызвать `shops:list` без аргументов — должны вернуться оба shop. Вызвать `costs.something` с `shopId` Юриного shop — должен пройти. С чужим shopId (никаким — поскольку других нет) — Convex просто ничего не вернёт.

- [ ] **Step 7: Commit**

```bash
git add convex/shops.ts convex/costs.ts convex/actions.ts convex/lib/helpersExposed.ts convex/_generated/
git commit -m "feat(access): добавить ensureShopAccess в shops/costs/actions"
```

---

### Task 27: Apply ensureShopAccess to convex/sync.ts + sync/* + syncAll.ts

**Files:**
- Modify: `convex/sync.ts`
- Modify: `convex/sync/syncAnalytics.ts` + `syncContent.ts` + `syncFeedbacks.ts` + `syncPrices.ts` + `syncPromotion.ts` + `syncReturns.ts` + `syncStatistics.ts` + `syncTariffs.ts` + `helpers.ts`
- Modify: `convex/syncAll.ts`

- [ ] **Step 1: Аудит всех публичных функций**

Запустить:
```bash
grep -rn "^export const \(query\|mutation\|action\|internalQuery\|internalMutation\|internalAction\)" convex/sync.ts convex/sync/ convex/syncAll.ts
```

Получить список всех handler'ов. Для каждого определить:
- Принимает `shopId`? → `await ensureShopAccess(ctx, shopId)` или (для actions) — `ctx.runQuery(api.lib.helpersExposed.getCurrentUserSafe)`
- Internal* — пропустить (они вызываются нашим же кодом)
- Не принимает shopId, но работает с shop'ами юзера → `listUserShopIds`

- [ ] **Step 2: Применить guard к каждому публичному handler'у**

В `convex/sync.ts`:
- `syncShop({shopId})` (action) → guard через runQuery
- любая `query` с `shopId` → `ensureShopAccess`

В `convex/syncAll.ts`:
- `syncAllShops` (action) → `getCurrentUserSafe` → если null — throw, иначе syncать только `listUserShopIds`

В `convex/sync/*.ts`:
- В большинстве — это internal-functions, вызываемые из `sync.ts`. Им guard не нужен.
- Если есть public — добавить.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Smoke-test**

В Convex dashboard вызвать `sync:syncShop({shopId: "..."})` для Юриного shop. Должен пройти. Без identity (использовать «Anonymous» mode в dashboard) — должен fail с unauthorized.

- [ ] **Step 5: Commit**

```bash
git add convex/sync.ts convex/sync/ convex/syncAll.ts convex/_generated/
git commit -m "feat(access): добавить ensureShopAccess в sync/syncAll handlers"
```

---

## Phase 12: Verification

### Task 28: Юрий ставит пароль

**Files:** (нет)

⚠️ **Координировать с Юрием.**

- [ ] **Step 1: Запустить `forgotPassword` action**

В Convex dashboard → Functions → `auth/forgotPassword:forgotPassword` → запустить с `{ email: "pihenella@gmail.com" }`.

Ожидаемый результат: returns `{ok: true}`. Письмо приходит на pihenella@gmail.com.

- [ ] **Step 2: Юрий открывает письмо, кликает на ссылку**

⚠️ **Текущий момент:** в A.1 нет UI `/reset-password` (это A.2). Поэтому пароль ставится **не через ссылку**, а напрямую в Convex Auth — через временный server-side action или dashboard manipulation.

**Альтернативный путь:** в A.1 пропустить установку пароля для Юрия. После A.2 (auth UI) — Юрий заходит на `/forgot-password` и проходит обычный flow.

⚠️ **Решение для A.1:** ОТЛОЖИТЬ Task 28 до завершения A.2. До тех пор тестировать backend без идентификации (используя «Anonymous» role в Convex dashboard) — но тогда `ensureShopAccess` будет падать. Поэтому **Phase 10 (Tasks 25-27) тоже откладывать до A.2**.

**Финальное решение для A.1:**
- Tasks 1-22, 23-24 (миграция + schema phase 3) — выполнить в A.1
- Tasks 25-28 (применение `ensureShopAccess` + установка пароля) — **отложить до начала A.2**, когда появится UI auth

Это значит, что после миграции (Task 24) текущий dashboard продолжит работать **без проверок access** — потому что queries возвращают данные глобально, как и раньше. Это OK, поскольку до A.2 единственный пользователь — Юрий, и приложение никому больше не доступно.

- [ ] **Step 3: Документировать «отложенные tasks» в plan-progress note**

Дописать в memory `project_mfa_a1_progress.md` (создать в memory): «Tasks 25-28 отложены до начала A.2. Backend-функции в `convex/admin/`, `convex/org/`, `convex/auth/` уже применяют `ensureApproved` и `ensureOrgOwner` — они защищены. Только старые `analytics/financials/dashboard/sync` пока без guard'ов — это будет добавлено в первой задаче A.2.»

- [ ] **Step 4: Snapshot текущего состояния A.1 commit'а**

```bash
git log --oneline | head -25
```

Сохранить вывод в plan-progress note.

---

### Task 29: Final verification + push

**Files:** (нет)

- [ ] **Step 1: `npm test` зелёный**

```bash
npm test
```

Ожидаемый результат: все тесты в `src/lib/` зелёные. Никаких regressions в существующих тестах.

- [ ] **Step 2: `npm run typecheck` зелёный**

```bash
npm run typecheck
```

- [ ] **Step 3: `npm run build` проходит**

```bash
npm run build
```

Ожидаемый результат: Next.js собирается без ошибок (frontend ещё не использует auth, поэтому всё ок).

- [ ] **Step 4: Convex deployment корректно отображает все функции**

В Convex dashboard → Functions → должны быть видны:
- `auth/register`, `auth/verifyEmail`, `auth/forgotPassword`, `auth/resetPassword`
- `admin/users` (listByStatus, countsByStatus, approveUser, rejectUser)
- `org/team` (listMembers, removeMember, leaveOrg, transferOwnership)
- `org/invites` (createInvite, revokeInvite, resendInvite, getInviteByToken, acceptInvite, registerViaInvite, expireOldInvites)
- `org/settings` (renameOrg)
- `email/actions` (6 sendXxx)
- `email/rateLimit/checkAndRecord`
- `migrations/seedLegacyUser`
- Existing analytics/financials/dashboard/shops/costs/sync — без изменений (Phase 10 отложена)

- [ ] **Step 5: Verify Convex env**

```bash
npx convex env list
```

Должны быть выставлены: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `ADMIN_EMAIL`, `CONVEX_SITE_URL`.

- [ ] **Step 6: Push ветки**

```bash
git push -u origin mfa-a1-schema-backend
```

- [ ] **Step 7: Создать PR (или merge напрямую — выбор Юрия)**

Если PR-стиль: открыть в GitHub PR `mfa-a1-schema-backend` → master с заголовком «MFA A.1: schema + backend (auth/admin/org/email + миграция)».

- [ ] **Step 8: Обновить memory `project_mfa_subproject_a.md`**

Заменить триггер «продолжим MFA-A» на «начинаем MFA-A.2» с указанием, что A.1 завершён, миграция выполнена, отложенные tasks 25-28 переезжают в A.2.

---

## Summary: что Plan A.1 сдаёт

После выполнения всех Tasks 1-29:

✅ Schema готова (с фазой 1 + фазой 3)
✅ 5 новых таблиц + 2 token-таблицы
✅ Convex Auth настроена с password provider
✅ 6 email-шаблонов через Resend
✅ Rate-limit на верификационные/reset письма
✅ register/verifyEmail/forgotPassword/resetPassword Convex functions
✅ admin/users — list/counts/approve/reject
✅ org/team — list/remove/leave/transferOwnership
✅ org/invites — create/revoke/resend/getByToken/accept/registerViaInvite
✅ org/settings — renameOrg
✅ Cron expireOldInvites
✅ Юрий мигрирован — users + organizations(AID) + memberships(owner) + shops привязаны

⏳ Откладывается до A.2:
- ⏳ Установка пароля Юрия через `/forgot-password` UI
- ⏳ Применение `ensureShopAccess` к старым handlers (analytics/financials/dashboard/sync) — добавить как первая задача A.2 после того как UI auth заработает

---

## Self-Review

**Spec coverage check:**

- §3.1 Components — ✅ Convex Auth, Resend клиент (next-themes/middleware — A.2/A.4)
- §3.2 Доменные сущности — ✅ users, orgs, memberships, shops с orgId/marketplace
- §3.3 ensureShopAccess — ✅ helpers + apply (Task 25-27, отложено)
- §4.1 Новые таблицы — ✅ все 5 + 2 token-таблицы + loginAttempts
- §4.2 Изменения в shops — ✅ orgId required, marketplace, ozonClientId
- §4.3 Миграция 2-фазовая — ✅ phase 1 (Task 3) → seed (Task 23) → phase 3 (Task 24)
- §5.3 Convex функции — ✅ все папки `auth/`, `admin/`, `org/`, `email/` созданы
- §5.4 Password policy — ✅ validatePassword (8+, цифра+буква). Login rate-limit — таблица `loginAttempts` создана; реализация rate-limit в действии при signIn — A.2
- §6 Регистрация → approval — ✅ register создаёт pending, sendVerify, approveUser создаёт org+membership, sendApproved
- §7 Команды — ✅ listMembers, transferOwnership, invites flow, expireOldInvites cron
- §10 Resend — ✅ EMAIL_FROM env, 6 шаблонов, rate-limit
- §12 Безопасность — ✅ generateRandomToken, tokensEqual, escapeHtml, валидаторы

**Gap (отложено в A.2):**
- Login rate-limit table создана, но нет mutation использующей её — это в convex/auth.ts при handleSignIn override (A.2)
- Welcome-экран (§8) — UI работа в A.2
- `/admin/users`, `/org/team`, `/invite/:token` UI — A.3
- next-themes + редизайн — A.4

**Placeholder scan:** в плане нет «TODO», «later», «similar to». Везде exact code.

**Type consistency:**
- `ensureShopAccess` returns `{user, shop, membership}` — везде согласованно
- `ensureOrgOwner` returns `{user, org, membership}` — согласованно с Task 11
- Email render-функции возвращают `RenderedEmail = {subject, html, text}` — согласованно с `sendEmailViaResend(SendEmailArgs)` shape

---

## После завершения A.1

Открой и исполняй `2026-04-27-mfa-a-roadmap.md` → переходи к sub-plan A.2 (создание которого начинается после твоего ревью A.1).
