# MFA — подпроект A: Auth + multi-tenancy + полный редизайн

**Дата:** 2026-04-24
**Область:** `/home/iurii/MFA-repo` (Next.js 16 + Convex + Tailwind 4)
**Статус:** Design approved by brainstorming, awaiting user review before writing-plans.

## 1. Цель и мотивация

Сейчас MFA — single-tenant приложение: нет юзеров, нет auth, магазины глобальные, данные принадлежат одному человеку. Продукт готов к выходу на рынок как SaaS для WB/Ozon-селлеров, но требуется превратить его в мульти-юзерский сервис с изоляцией данных на уровне организаций.

Подпроект A превращает MFA в полноценное multi-tenant-приложение с регистрацией, approval-flow, командами, инвайтами и фирменным дизайном. Не включены в A: реальная интеграция Ozon API (только credential capture), объединённый дашборд WB+Ozon, биллинг и Telegram-бот — это отдельные подпроекты B, C, D.

### Подпроекты за пределами A

Из изначального запроса Юрия вычленены 5 подпроектов:

- **A** — этот документ (auth + multi-tenancy + редизайн)
- **B** — Ozon API integration (sync, таблицы, данные)
- **C** — Unified dashboard WB + Ozon
- **D** — Productization: тарифы, биллинг, Telegram-бот с приёмом оплат
- **E** — (в A влит по выбору пользователя) Design System Orange-Black

## 2. Решения, зафиксированные в brainstorming-сессии

| # | Вопрос | Решение |
|---|---|---|
| Q1 | Способ входа | Email + пароль (классика) |
| Q2 | Модель регистрации | Открытая регистрация + ручной approval от admin |
| Q3 | Модель владения магазинами | Organizations/teams (юзеры → orgs → shops, с ролями) |
| Q4 | Auth-провайдер | Convex Auth (родной, без внешних сервисов) |
| Q5 | Поля регистрации | email, пароль, имя, телефон, название бизнеса, **кол-во магазинов WB**, **кол-во магазинов Ozon**, **кол-во SKU** |
| Q6 | Инвайты команды в A | ДА. Роли: owner + member. Передача ownership — в A. |
| Q7 | Поток регистрации | Flow A: **Verify email → Pending → Admin approved** |
| Email | Провайдер | Resend. Домен покупается позже (.ru). До покупки — dev-режим. |
| Q8 | Миграция данных Юрия | Seed-скрипт 1b: создаёт юзера без пароля, пароль ставится через `/forgot-password` |
| Ozon | Scope в A | **3b:** credentials capture + UI в A, sync — в B |
| Редизайн | Scope в A | **W:** полный редизайн в A (орандж-чёрный, dark/light toggle) |

## 3. Архитектура

### 3.1 Компоненты

- **Convex Auth** (`@convex-dev/auth` + `@auth/core/providers/password`) — идентичности, сессии, хэшированные пароли, токены verify/reset
- **Next.js middleware** (`src/middleware.ts`) — защищает все приватные роуты, редиректит неавторизованных и юзеров со статусом `pending`/`rejected`
- **Resend клиент** — actions в Convex, шаблоны как TS-строки
- **`next-themes`** — toggle dark/light
- **Tailwind palette** — primary `orange-500` / `orange-600`, base слой dark переделан под чёрный фон

### 3.2 Доменные сущности

```
User (identity)
  └─ belongs to many Organizations (via Membership)

Organization
  ├─ has one owner (User)
  ├─ has many Members (Memberships)
  ├─ has many Shops
  └─ has many Invites

Shop
  ├─ belongs to one Organization
  ├─ is on marketplace "wb" or "ozon"
  └─ has cascade data (orders, sales, ...) via shopId (не меняются)
```

### 3.3 Основной инвариант доступа

Каждая Convex query/mutation, работающая с данными магазинов, первым делом вызывает `ensureShopAccess(ctx, shopId)`:

1. `ctx.auth.getUserIdentity()` → если нет — ошибка `unauthorized`
2. Найти `user` по identity
3. Проверить `user.status === "approved"`
4. Проверить что `shopId` → его `orgId` → у юзера есть `membership` в этой org
5. Если всё ок — вернуть `{ user, shop, membership }`; иначе — `forbidden`

Все существующие файлы `convex/analytics.ts`, `financials.ts`, `dashboard.ts`, `sync.ts`, `actions.ts`, `shops.ts`, `costs.ts`, `syncAll.ts` и подпапка `convex/sync/` получают эту проверку в начале каждого publicly-exported handler.

## 4. Модель данных

### 4.1 Новые таблицы

```ts
users: defineTable({
  email: v.string(),                                        // уникально, lowercase
  name: v.string(),
  phone: v.string(),
  businessName: v.string(),
  shopsCountWB: v.number(),
  shopsCountOzon: v.number(),
  skuCount: v.number(),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  emailVerifiedAt: v.optional(v.number()),
  isSystemAdmin: v.boolean(),
  rejectionReason: v.optional(v.string()),
  createdAt: v.number(),
  approvedAt: v.optional(v.number()),
  approvedBy: v.optional(v.id("users")),
}).index("by_email", ["email"])
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
}).index("by_user", ["userId"])
  .index("by_org", ["orgId"])
  .index("by_user_org", ["userId", "orgId"]),

invites: defineTable({
  orgId: v.id("organizations"),
  email: v.string(),
  role: v.union(v.literal("owner"), v.literal("member")),
  token: v.string(),
  status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired"), v.literal("revoked")),
  invitedBy: v.id("users"),
  createdAt: v.number(),
  expiresAt: v.number(),        // createdAt + 3 дня
  acceptedAt: v.optional(v.number()),
}).index("by_token", ["token"])
  .index("by_org", ["orgId"])
  .index("by_email_status", ["email", "status"]),

emailSendLog: defineTable({     // для rate-limiting
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
```

### 4.2 Изменения в существующих таблицах

```ts
shops: defineTable({
  orgId: v.id("organizations"),              // НОВОЕ, required (после миграции)
  marketplace: v.union(                      // НОВОЕ
    v.literal("wb"),
    v.literal("ozon")
  ),
  name: v.string(),
  apiKey: v.string(),
  ozonClientId: v.optional(v.string()),      // НОВОЕ, только для Ozon-магазинов
  isActive: v.boolean(),
  lastSyncAt: v.optional(v.number()),
  enabledCategories: v.optional(v.array(v.string())),
}).index("by_org", ["orgId"])                // НОВЫЙ индекс
  .index("by_org_marketplace", ["orgId", "marketplace"]),
```

**Дочерние таблицы** (`orders`, `sales`, `stocks`, `financials`, `costs`, `campaigns`, `syncLog`, `productCards`, `feedbacks`, `questions`, `prices`, `returns`, `tariffs`, `nmReports`) не меняются. Доступ проверяется транзитивно через `shops.orgId`.

### 4.3 Миграция существующих данных (2-фазовая)

**Фаза 1:** `shops.orgId` и `shops.marketplace` добавляются как **optional**. Деплой проходит без ошибок на существующих записях.

**Фаза 2 (миграция):** action `migrations.seedLegacyUser` запускается один раз:
1. Создать `users{email: "pihenella@gmail.com", name: "Юрий", businessName: "AID", shopsCountWB: 2, shopsCountOzon: 0, skuCount: 62, status: "approved", isSystemAdmin: true, emailVerifiedAt: Date.now()}` — **без пароля**.
2. Создать `organizations{name: "AID", ownerId: userId}`.
3. Создать `memberships{userId, orgId, role: "owner"}`.
4. Проставить всем существующим `shops`: `orgId` (созданной выше), `marketplace: "wb"`.
5. Скрипт идемпотентен — при повторном запуске бросает ошибку, если юзер уже создан (`--force` для dev).

**Фаза 3:** После успешной миграции — `shops.orgId` и `shops.marketplace` переводятся в **required**. Деплой.

**Пароль Юрия:** ставится через обычный `/forgot-password` flow после завершения миграции (Resend должен быть настроен).

**Бэкап:** перед миграцией — `npx convex export --path mfa-backup-YYYY-MM-DD.zip`. Тест миграции: клонировать deployment в Convex dashboard, `npx convex import` бэкап туда, прогнать миграцию, валидировать. Затем на основном.

## 5. Auth flow

### 5.1 Роуты Next.js (новые)

| Роут | Доступ | Назначение |
|---|---|---|
| `/login` | неавторизованные | форма email+password, ссылки на `/register`, `/forgot-password` |
| `/register` | неавторизованные | форма: email, password, имя, телефон, businessName, shopsCountWB, shopsCountOzon, skuCount |
| `/verify-email` | все | `?token=` → валидация → `users.emailVerifiedAt` проставляется → редирект на `/pending-approval` |
| `/pending-approval` | auth + `status=pending` | экран ожидания; если `emailVerifiedAt === null` — показываем блок «Подтвердите email (письмо отправлено на X)» выше основного текста; кнопка logout |
| `/rejected` | auth + `status=rejected` | «К сожалению, заявка отклонена» + причина + контакт поддержки |
| `/forgot-password` | все | форма email → action отправляет reset-письмо |
| `/reset-password` | все | `?token=` → новый пароль × 2 → смена пароля → редирект на `/login` |
| `/invite/:token` | все | обработка инвайта (см. раздел 7.2) |
| `/admin/users` | auth + `isSystemAdmin=true` | админ-панель approval |
| `/org/team` | auth + owner | страница команды, приглашения, удаление, передача ownership |
| `/org/settings` | auth + owner | переименование organization |

### 5.2 Middleware логика (src/middleware.ts)

```
session отсутствует → редирект на /login (кроме public-путей)
status === "pending" и не на /pending-approval → редирект на /pending-approval
status === "rejected" → редирект на /rejected
status === "approved" → пропустить
```

`emailVerifiedAt` проверять не нужно в middleware (Flow A гарантирует verify до approval).

### 5.3 Convex-функции (новые)

```
convex/auth/
├── config.ts                   — Convex Auth provider setup (password)
├── register.ts                 — mutation register(...)
├── verifyEmail.ts              — mutation verifyEmail(token)
├── forgotPassword.ts           — action forgotPassword(email)
├── resetPassword.ts            — mutation resetPassword(token, password)
└── helpers.ts                  — ensureApproved(), ensureShopAccess(), ensureAdmin(), ensureOrgMember(), ensureOrgOwner()

convex/admin/
├── users.ts                    — query listByStatus, mutation approveUser, mutation rejectUser
└── stats.ts                    — query countsByStatus

convex/org/
├── team.ts                     — query listMembers, mutation removeMember, mutation transferOwnership, mutation leaveOrg
├── invites.ts                  — mutation createInvite, mutation revokeInvite, mutation resendInvite, mutation acceptInvite, query listInvitesForOrg, query getInviteByToken
└── settings.ts                 — mutation renameOrg

convex/email/
├── resend.ts                   — клиент Resend + общий sendEmail()
├── rateLimit.ts                — canSend(email, kind) с проверкой emailSendLog
├── templates/
│   ├── verifyEmail.ts
│   ├── approved.ts
│   ├── rejected.ts
│   ├── resetPassword.ts
│   ├── teamInvite.ts
│   └── inviteAccepted.ts
└── actions.ts                  — публичные actions для каждого kind

convex/migrations/
└── seedLegacyUser.ts           — одноразовый seed-скрипт
```

### 5.4 Password policy

- Минимум 8 символов, минимум 1 цифра, минимум 1 буква
- Без истории, без принудительной смены, без MFA (MVP)
- Rate limit на login: 5 попыток / 5 минут на email → блок 15 минут; реализуется через `loginAttempts` table

## 6. Регистрация → approval: полный путь (Flow A)

```
1. /register: юзер заполняет форму (8 полей) → submit
2. Convex: users создаётся со status="pending", generateVerifyToken(), sendVerifyEmail
3. Юзер переходит в /pending-approval (сессия создана, но он не авторизован в приложении)
4. Юзер кликает в письме → /verify-email?token=... → emailVerifiedAt проставляется
5. Админ (ты) в /admin/users видит карточку «EMAIL ✓», кликает «Одобрить»
   a. users.status = "approved", approvedAt/approvedBy заполняются
   b. organizations создаётся (name = user.businessName, ownerId = userId)
   c. memberships{userId, orgId, role: "owner"} создаётся
   d. sendApprovedEmail(email)
6. Юзер входит через /login → попадает на / (дашборд)
7. Если shops.length === 0 — welcome-экран с CTA «Добавить WB» и «Добавить Ozon»
```

## 7. Команды: invites + ownership

### 7.1 Страница /org/team

Видит только owner орг-ы. Показывает:

- Список `memberships` с именами, email, ролями, датами; у owner-а — бейдж «Вы — owner»
- Список `pending` инвайтов с кнопками «Отправить повторно» и «Отозвать»
- Кнопка «+ Пригласить» → модалка (email + role в будущем)

На каждом участнике в меню `· · ·`:
- Owner → member, member → [«Удалить из команды», «Сделать владельцем»]
- member → [«Удалить из команды»]

### 7.2 Invite flow

1. Owner создаёт инвайт: `invites{orgId, email, role: "member", token: randomBytes(32).hex(), expiresAt: now + 3*24*3600*1000}`
2. Action `sendTeamInviteEmail(email, token, orgName, inviterName)` через Resend
3. Получатель кликает → `/invite/:token`:
   - Токен невалиден/expired → экран «Приглашение истекло, попросите пригласить заново»
   - Токен ок, юзер **не залогинен и email не зарегистрирован** → форма «Создать аккаунт»: email prefilled (readonly), password, name, phone, businessName (optional, по умолчанию пусто). После submit: `users{status: "approved", emailVerifiedAt: now, ...}` (пропускает approval), `memberships{userId, orgId, role: "member"}`, инвайт → `accepted`, логин.
   - Токен ок, юзер **не залогинен и email зарегистрирован** → форма «Войти»: password. После логина — membership создаётся.
   - Токен ок, юзер **уже залогинен как invitee-email** → «Принять приглашение в X?» → кнопка → membership создаётся.
   - Токен ок, юзер **залогинен другим email** → экран «Этот инвайт для X, войдите под этим email» + logout-кнопка.
4. После acceptance: `inviteAcceptedEmail(owner.email, invitee.name)`

### 7.3 Передача ownership

1. Owner клик на «·· ·» у member → «Сделать владельцем» → модалка подтверждения
2. Транзакция:
   - `memberships[owner].role = "member"`
   - `memberships[target].role = "owner"`
   - `organizations.ownerId = target.userId`

### 7.4 Удаление из команды / выход

- Owner удаляет member-а: `memberships` удаляется. Audit-лог пока не пишем (MVP).
- Member сам покидает org: кнопка «Покинуть организацию» в `/org/team`, `memberships` удаляется. Owner сам себя удалить не может, пока не передал ownership.

### 7.5 Cron invitations cleanup

Раз в день Convex cron `expireOldInvites` обходит `invites{status: "pending", expiresAt < now}` → переводит в `expired`. Чисто для корректного UI-статуса.

## 8. Welcome / onboarding

**На `/` (дашборд), если текущий юзер не состоит в org где есть хотя бы один shop:**

Показываем welcome-блок (по центру, mockup в `.superpowers/brainstorm/.../content/empty-dashboard.html`):

- Заголовок: `👋 Добро пожаловать, {user.name}!`
- Подзаголовок с описанием
- Две CTA-кнопки: «🟣 Добавить магазин Wildberries», «🔵 Добавить магазин Ozon» — обе редиректят на `/settings?marketplace=wb|ozon`
- Блок «Что вам понадобится»: API-ключ WB (где взять) / Client ID + API Ozon (где взять)

**После появления первого shop** welcome исчезает, дашборд рендерится как обычно.

**Селектор org в шапке:** скрыт при одной org, показан при двух+.

**Страница `/settings`:** расширяется на поддержку `marketplace`. При открытии `?marketplace=wb` формируется WB-форма (только API-ключ), при `?marketplace=ozon` — Ozon-форма (Client ID + API-ключ). После add: `shops{orgId: текущая org, marketplace, ...}`, для `wb` триггерится sync, для `ozon` — пока нет (заглушка).

**Дашборд-таб Ozon:** сейчас disabled — заменяется на enabled, но показывает плашку «Синхронизация Ozon скоро» (реализуется в B).

## 9. Админ-панель `/admin/users`

Доступ только `isSystemAdmin === true`. Макет: `.superpowers/brainstorm/.../content/admin-panel-v2.html`.

Фичи:
- Табы: **Ожидают** (default) / Одобрены / Отклонены / Все + счётчики
- Поиск по email / имени / телефону
- Карточка юзера: имя, бейджи (EMAIL ✓ / NOT VERIFIED, размер бизнеса «WB·N + OZ·M · K SKU»), контактная строка (email, phone, business), строка размера (shopsCountWB, shopsCountOzon, skuCount), строка дат (registration, emailVerified)
- Кнопка **Одобрить** — disabled до email verify; при клике: `users.status = approved`, создание `organizations` и `memberships{role: owner}`, `sendApprovedEmail`
- Кнопка **Отклонить** — модалка с опциональной причиной; `users.status = rejected`, `rejectionReason`, `sendRejectedEmail`

**Не в A:** массовые действия (чекбоксы), ручная смена ролей, аудит-лог.

## 10. Email (Resend)

### 10.1 Env-переменные

```
Convex env:
  RESEND_API_KEY=re_xxx
  EMAIL_FROM="MFA <noreply@<domain>>"
  APP_URL=https://<domain>
  ADMIN_EMAIL=pihenella@gmail.com

Next.js (.env.local):
  NEXT_PUBLIC_APP_URL=https://<domain>
```

До покупки домена: `EMAIL_FROM=onboarding@resend.dev`, отправка только на `pihenella@gmail.com` (ограничение Resend dev-режима).

### 10.2 Шаблоны

6 шаблонов как TS-функции, возвращают `{subject, html, text}`:

| kind | Когда | Ключевые переменные |
|---|---|---|
| `verifyEmail` | после /register | `name`, `verifyUrl`, срок 24ч |
| `approved` | при approve в админке | `name`, `loginUrl` |
| `rejected` | при reject в админке | `name`, `reason?`, `supportContact` |
| `resetPassword` | по /forgot-password | `name`, `resetUrl`, срок 1ч |
| `teamInvite` | при создании invite | `inviterName`, `orgName`, `acceptUrl`, срок 3 дня |
| `inviteAccepted` | после acceptInvite | `owner.name`, `invitee.name`, `orgName` |

Стиль: минимализм, оранжевый primary `#f97316` на кнопках, чёрный текст, inline-CSS, русский на «вы», footer с дисклеймером и @Virtuozick.

### 10.3 Rate limiting

Через `emailSendLog`:
- `verifyEmail`: не чаще 3 раз/час на email
- `resetPassword`: не чаще 5 раз/час на email
- Остальные — без ограничения (тригерятся action-ами админа/owner-а)

## 11. Редизайн (в scope A по выбору W)

### 11.1 Палитра

| Тема | Фон | Primary (акценты, кнопки, бейджи) | Текст | Бордеры |
|---|---|---|---|---|
| Light | `white` / `neutral-50` | `orange-500` (#f97316) | `neutral-900` | `neutral-200` |
| Dark | `neutral-950` / `neutral-900` | `orange-500` (тот же) | `neutral-50` | `neutral-800` |

### 11.2 Объём работ

- Установить `next-themes`, добавить `ThemeProvider` в `src/app/layout.tsx`
- В `tailwind.config` (или CSS-слое Tailwind 4) — обновить primary-шкалу на orange
- Компонент `ThemeToggle` в шапке (иконка луна/солнце)
- Пройти по **всем существующим компонентам** (`src/components/ui/*`, `src/components/dashboard/*`, `src/components/nav/*`, `src/components/charts/*`) и добавить `dark:` классы
- Перекрасить карточки дашборда, метрики, табы, графики Recharts (fill/stroke цвета через CSS-variables)
- Обновить страницы: `/`, `/analytics`, `/financials`, `/products`, `/prices`, `/feedbacks`, `/returns`, `/pulse`, `/settings`
- Новые страницы auth / admin / team — сразу в палитре
- Логотип MFA (текстовый/монограмма из 3 букв, оранжевый на чёрном) в шапке + favicon + в email-шаблонах

### 11.3 Footer с @Virtuozick

На всех страницах (через `src/app/layout.tsx`): мини-футер с ссылкой «Связь с разработчиком: @Virtuozick» (https://t.me/Virtuozick).

## 12. Безопасность

- Пароли хэшированные через Convex Auth (bcrypt-equivalent)
- Токены verify/reset/invite — `crypto.randomBytes(32).hex()`, сравнение через constant-time
- API-ключи магазинов (WB/Ozon) — хранятся как есть (в будущем — шифрование AES в D)
- CSRF: Next.js Server Actions и Convex mutations уже защищены session-cookie, дополнительных токенов не нужно
- Rate limits на login и email — см. выше
- XSS в email-шаблонах: экранируем `name`, `orgName`, `reason` перед вставкой в HTML

## 13. Scope / Non-goals

### В scope A:
- ✅ Auth-провайдер (Convex Auth), email/password
- ✅ Users table + approval state machine
- ✅ Organizations + memberships + roles (owner, member)
- ✅ Shops.orgId + marketplace field
- ✅ Admin panel (approve/reject users)
- ✅ Team invites + ownership transfer
- ✅ Миграция данных Юрия
- ✅ Email via Resend (6 шаблонов)
- ✅ Ozon credentials capture + settings form + welcome CTA (но НЕ sync)
- ✅ Полный редизайн orange-black с dark/light toggle

### Не в A (отложено):
- ❌ Реальный sync Ozon API, таблицы/метрики Ozon (→ B)
- ❌ Объединённый дашборд WB+Ozon (→ C)
- ❌ Тарифы, биллинг, Telegram-бот с приёмом оплат (→ D)
- ❌ Мультифакторная аутентификация (MFA-2FA), SSO, OAuth
- ❌ Роль viewer (read-only) — только owner + member в A
- ❌ Мультиорганизация: UI есть, но активно никому не требуется (для себя и ранних юзеров — 1 org)
- ❌ Массовые действия в админке (чекбоксы, bulk approve/reject)
- ❌ Аудит-лог действий в org
- ❌ Смена ролей существующих членов (только удалить + пригласить заново)
- ❌ Разделение Convex deployment на dev + prod (отдельная задача между A и launch)

## 14. Pre-launch checklist

Должно быть выполнено до открытия регистрации новым юзерам:

- [ ] Купить домен `.ru` (Юрий купит позже) → напоминалка сохранена в memory
- [ ] Верифицировать домен в Resend (SPF, DKIM, DMARC)
- [ ] Переключить `EMAIL_FROM` с `onboarding@resend.dev` на реальный адрес
- [ ] Завести отдельный Convex prod-deployment и настроить env
- [ ] Ручной smoke-test полного flow: register → verify → pending → approve → login → add shop → sync
- [ ] Ручной smoke-test invite: owner invites → invitee registers → member → см. данные org
- [ ] Убедиться что dark/light theme работает на всех страницах
- [ ] Проверить что миграция Юрия прошла: пароль через forgot-password, оба shop доступны, данные синкаются

## 15. Открытые вопросы / риски

- **Convex Auth новый** — API может меняться. Риск: API breaking change при будущем обновлении. Митигация: pin версии пакета, следить за changelog, в плане предусмотреть «smoke test после любого upgrade Convex».
- **Полный редизайн + auth в одном A** — риск смешения багов (дизайн-баги маскируют auth-баги и наоборот). Митигация: в плане разделить фазы (1. schema+backend, 2. auth UI в новом стиле, 3. admin/team/invites, 4. редизайн старых страниц), каждая фаза деплоится, smoke-тестируется.
- **Удаление юзера** — в A не предусмотрено (юзеры только approved/rejected). Если юзер захочет удалиться — ручной процесс через Convex dashboard. Нормально для MVP.
- **GDPR/152-ФЗ** — обработка ПД. Для запуска в РФ нужна политика конфиденциальности + согласие на обработку ПД на форме регистрации (чекбокс «Я согласен») + оферта. Политика и оферта — это D (legal). В A по умолчанию чекбокс согласия **не добавляем** — Юрий не просил. **Открытый вопрос для ревью:** добавить ли чекбокс-заглушку «Я согласен на обработку ПД» на `/register` сейчас (ссылка ведёт на `/privacy`, страница = placeholder), чтобы не переделывать форму перед launch? Решение — на этапе ревью spec.
