# MFA подпроект A — Implementation Roadmap (Plan 0)

> **For agentic workers:** Этот документ — meta-план подпроекта A. Он не содержит исполняемых задач. Каждая фаза имеет собственный детальный sub-plan, который следует исполнять через `superpowers:subagent-driven-development` (рекомендуется) или `superpowers:executing-plans`.

**Spec:** `docs/superpowers/specs/2026-04-24-mfa-auth-multitenancy-design.md` (commit `2013359` на master)

**Goal:** Превратить MFA из single-tenant приложения в multi-tenant SaaS с email-паролем auth-ом, approval-flow от админа, командами/инвайтами, фирменным orange-black дизайном (dark/light), и migration-скриптом для текущих данных Юрия.

**Architecture:** Convex Auth (password provider) для identity и сессий → новые таблицы `users / organizations / memberships / invites / emailSendLog` → существующие `shops` получают `orgId + marketplace` → access-инвариант `ensureShopAccess(ctx, shopId)` обвязывает каждый publicly-exported handler в Convex → Next.js middleware блокирует pending/rejected → Resend для писем (6 шаблонов) → ручной seed легаси-юзера → редизайн `orange-500` primary с `next-themes` toggle.

**Tech Stack:** Next.js 16 + React 19, Convex 1.32+, `@convex-dev/auth` + `@auth/core/providers/password`, `resend` SDK, `next-themes`, Tailwind CSS 4, vitest 4.

---

## Декомпозиция на 4 sub-плана

Подпроект A разделён на 4 фазы. Каждая фаза — отдельный детальный план в `docs/superpowers/plans/`. Каждая фаза должна быть закоммичена и задеплоена до начала следующей.

| # | Sub-plan | Файл | Output |
|---|---|---|---|
| A.1 | Schema + backend + миграция | `2026-04-27-mfa-a1-schema-backend.md` | Convex backend полностью готов: таблицы, helpers, auth/admin/org/email functions, cron, миграция Юрия выполнена. Frontend — без изменений (всё ещё работает старый dashboard как single-tenant, потому что Юрий через миграцию = единственный owner-юзер). |
| A.2 | Auth UI + middleware + email-провайдер | `2026-04-27-mfa-a2-auth-ui.md` (создаётся **после завершения A.1**) | Полностью рабочие страницы `/login`, `/register`, `/verify-email`, `/pending-approval`, `/rejected`, `/forgot-password`, `/reset-password`. Middleware защищает приватные роуты. Resend настроен в dev-режиме (с `onboarding@resend.dev`). Welcome-экран на `/` для юзеров без shops. |
| A.3 | Admin / Team / Invites UI | `2026-04-27-mfa-a3-admin-team-invites.md` (создаётся **после A.2**) | Страницы `/admin/users`, `/org/team`, `/org/settings`, `/invite/:token`. Полный invite-flow для всех 4 веток (новый юзер, существующий неавторизованный, авторизованный invitee-email, авторизованный другой email). Передача ownership. Theme toggle в шапке. |
| A.4 | Редизайн orange-black + dark/light + footer | `2026-04-27-mfa-a4-redesign.md` (создаётся **после A.3**) | Все существующие страницы (`/`, `/analytics`, `/financials`, `/products`, `/prices`, `/feedbacks`, `/returns`, `/pulse`, `/settings`) перекрашены в orange-black палитру с поддержкой dark/light темы. Логотип MFA в шапке + favicon + email-шаблонах. Footer с @Virtuozick на всех страницах. |

---

## Зависимости между фазами

```
A.1 (schema + backend) ─→ A.2 (auth UI) ─→ A.3 (admin/team) ─→ A.4 (редизайн)
       │
       └─→ миграция Юрия выполнена
```

**Жёстко-последовательные:** A.1 → A.2 → A.3. Каждая последующая фаза опирается на функции, типы и роуты предыдущей.

**A.4 (редизайн)** теоретически параллельна A.2 и A.3 (CSS-only), но мы делаем её **последней по решению Юрия** — чтобы новый стиль покрыл и новые auth/admin страницы тоже, без переделки.

---

## Pre-requisites (выполнить до запуска A.1)

- [ ] Сделать Convex export бэкап текущей prod-базы:
  ```bash
  npx convex export --path mfa-backup-2026-04-27.zip
  ```
- [ ] Положить бэкап в `~/mfa-backups/` (создать папку если нет)
- [ ] Убедиться что нет несинхронизированных изменений: `git status` чисто
- [ ] Создать ветку для A.1:
  ```bash
  git checkout -b mfa-a1-schema-backend
  ```
- [ ] Убедиться что `npm test` проходит на текущем master (baseline)
- [ ] Убедиться что `npm run typecheck` проходит на текущем master
- [ ] Зарегистрироваться на resend.com и получить API key (бесплатный план — 100 писем/день в dev-режиме)
- [ ] Сохранить `RESEND_API_KEY` в `.env.local` и через `npx convex env set RESEND_API_KEY <value>`

---

## Phase exit criteria

### A.1 готова, когда:
- Все Convex env-переменные выставлены (`RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `ADMIN_EMAIL`)
- Schema phase 1 + phase 3 деплои прошли без ошибок
- Юзер Юрия создан через `seedLegacyUser`, оба shops привязаны к org «AID» с `marketplace="wb"`
- Юрий поставил себе пароль через `forgotPassword` action (вызвать вручную в Convex dashboard, проверить письмо)
- `npm test` зелёный, `npm run typecheck` зелёный
- Все handler'ы существующих файлов (`analytics.ts`, `financials.ts`, `dashboard.ts`, `shops.ts`, `sync.ts`, `syncAll.ts`, `actions.ts`, `costs.ts`) вызывают `ensureShopAccess` первой строкой
- Cron `expireOldInvites` зарегистрирован в `crons.ts`
- Smoke: текущий Юрий-юзер может вручную через Convex dashboard вызвать `analytics.getSalesAnalytics` и получить корректные цифры (т.к. id-identity-fixture настроена)

### A.2 готова, когда:
- Незалогиненный посетитель `/` редиректится на `/login`
- Регистрация на `/register` создаёт `users{status:"pending"}`, отправляет verify-письмо
- Юзер с `status="pending"` блокируется на `/pending-approval`
- Юзер с `emailVerifiedAt=null` видит warning-блок на `/pending-approval`
- `forgot-password / reset-password` циклы работают
- Юзер Юрия может войти с паролем, который поставил в A.1, попасть на `/`
- `/` показывает welcome-экран если у юзера нет shops (для нового юзера в дальнейшем)
- `/admin/users` пока 404/redirect (UI ещё не сделан, это A.3)
- `npm test` зелёный, `npm run typecheck` зелёный

### A.3 готова, когда:
- Юрий заходит на `/admin/users`, видит вкладки и (тестового) ожидающего approval юзера
- Кнопка «Одобрить» создаёт org+membership и отправляет approved-письмо
- Кнопка «Отклонить» проставляет rejected + rejection_reason
- Owner на `/org/team` видит список членов org-а
- «+ Пригласить» создаёт invite, отправляет teamInvite-письмо
- Все 4 ветки `/invite/:token` работают (e2e в Storybook или smoke-test)
- Передача ownership меняет роли двусторонне в одной транзакции
- `npm test` зелёный, `npm run typecheck` зелёный

### A.4 готова, когда:
- На каждой странице есть theme toggle, переключение работает без mismatch при SSR
- Все существующие компоненты dashboard'а имеют `dark:` классы
- Логотип MFA в шапке + favicon + в email-шаблонах
- Footer «Связь с разработчиком: @Virtuozick» на всех страницах (вкл. /login, /register)
- Recharts графики цветно работают в обеих темах
- Контрастность WCAG AA на ключевых элементах
- `npm test` зелёный, `npm run typecheck` зелёный

---

## Когда запускать pre-launch checklist (spec §14)

После того как A.1+A.2+A.3+A.4 закоммичены и задеплоены:
- Юрий покупает домен `.ru` (см. memory `project_mfa_domain_reminder.md`)
- Верифицируется в Resend, переключает `EMAIL_FROM` с `onboarding@resend.dev` на реальный
- Создаётся отдельный Convex prod-deployment (см. memory `project_mfa_envs.md`)
- Подпроекты B/C/D готовятся как отдельные roadmap'ы

---

## Что НЕ покрыто этим A-roadmap'ом

- **Реальный Ozon API sync** — это подпроект B
- **Объединённый дашборд WB+Ozon** — подпроект C
- **Биллинг, Telegram-бот, оферта, политика конфиденциальности, чекбокс согласия** — подпроект D
- **Дополнительные роли (viewer, billing-admin)** — пока не нужны
- **2FA / SSO / OAuth** — отложено

---

## Sub-plan для исполнения сейчас

Открой и исполняй: **`2026-04-27-mfa-a1-schema-backend.md`** (фаза 1).

После завершения A.1 (в т.ч. ревью кода и миграции) — вернись сюда, я детально распишу A.2.
