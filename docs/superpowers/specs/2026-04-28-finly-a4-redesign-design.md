# Finly A.4 — Redesign в стиле «Карта Финли»: design spec

**Status:** approved by Юрий (2026-04-28)
**Plan:** будет создан как `docs/superpowers/plans/2026-04-28-finly-a4-redesign.md` после ревью этого спека.
**Branch:** продолжаем `mfa-a2-auth-ui` (A.4 идёт сверху A.3 в том же PR #3, либо новая ветка `finly-a4-redesign` — решим в плане).

---

## 1. Цель и scope

A.4 закрывает редизайн Finly (бывшая MFA) во вселенной Сэра Финли Мрргглтона / Лиги исследователей в формате **«Карта Финли»**: Hearthstone-карточки в SaaS-теле. Полный scope C — все 18+ страниц приложения переходят на новые дизайн-токены, ключевые места (дашборд, auth, лендинг, achievements) получают глубокий редизайн с маскотом и микроинтеракциями.

**Бизнес-цель:** «не скучно смотреть на показатели, интересно нажимать». Метрика успеха — после редизайна Юрий проводит manual smoke и подтверждает, что (а) UI не отвлекает от данных, (б) даёт желание кликать, (в) цифры на дашборде совпадают с тем, что было до редизайна, до копейки.

**Также включено в A.4:** покрытие 11 страниц, на которых до сих пор `useQuery` без `AuthGate` (техдолг от A.3) — это T1 плана, потому что редизайн страниц без этого фикса оставит pending-краш под новой темой.

---

## 2. IP-ограничения (обязательны для всех ассетов и копи)

Сэр Финли Мрргглтон — IP Blizzard Entertainment. Безопасные/опасные пересечения:

| ✅ Допустимо | ❌ Запрещено |
|---|---|
| Архетип «мурлок-исследователь» (троп жанра) | Воспроизведение точной позы / окраса / костюма с карты Сэра Финли |
| Шлем-фонарь, рюкзак-свиток, монокль (общие explorer-аксессуары) | Имя «Sir Finley Mrrgglton» где-либо в копи |
| Имя сервиса «Finly» (отличается от «Finley»; -y/-ey — другая лексема) | Прямой текст «Hearthstone / League of Explorers / Warcraft» в маркетинге |
| Тёплая отсылка типа «вдохновлено мурлоком-исследователем» в подвале | Логотипы/фонты Hearthstone (Belwe, Friz Quadrata) |
| Сине-зелёная палитра воды как намёк на мурлоков | Использование оригинальных Hearthstone арт-ассетов |
| Hearthstone-подобная рамка карточек (форма-троп) | Копирование UI-элементов Hearthstone один-в-один |

Эти границы прокинуты в GPT-промпты для генерации маскота (раздел 6.3) и в ревью-чеклист.

---

## 3. Дизайн-токены

### 3.1. Палитра «Murloc Tide» — semantic tokens

Объявляются в `src/app/globals.css` через Tailwind v4 `@theme inline`. Все Финли-компоненты используют только семантические имена, не сырые HEX. Существующие shadcn-токены (`--background`, `--card`, `--border`, …) перепривязываются на наши, чтобы не ломать примитивы.

| Токен | Light value | Dark value | Назначение |
|---|---|---|---|
| `--color-tavern-bg` | `oklch(0.97 0.02 90)` (`#faf6ec` пергамент) | `oklch(0.10 0.04 220)` (deep-tide) | Базовый фон страницы |
| `--color-tavern-surface` | `oklch(0.99 0.01 90)` | `oklch(0.16 0.05 215)` | Карточки/панели/TopNav/Footer |
| `--color-tavern-elevated` | `oklch(1 0 0)` | `oklch(0.22 0.06 210)` | Модалки, dropdown, popover |
| `--color-orange-flame` | `#f97316` | `#ff8a3d` | Primary CTA, ссылки, активный таб, акценты |
| `--color-murloc-teal` | `#2c8a92` | `#3bb0b8` | Secondary CTA, info, мурлок-акцент, hover-подсветка |
| `--color-gold-frame` | `#b8881e` | `#d4a93a` | Рамки FinlyCard/FinlyMetricTile, разделители-руны, achievement glow |
| `--color-scroll-ink` | `#1a1208` | `#f5e9c4` | Основной текст |
| `--color-scroll-faded` | `#6a5a3c` | `#a99770` | Вторичный текст, label, placeholder |
| `--color-rune-success` | `#2e8b57` | `#4cc080` | Прирост KPI, milestones, ▲-стрелка |
| `--color-rune-danger` | `#c0392b` | `#e85a4a` | Возвраты, потери, ошибки, ▼-стрелка |
| `--color-tide-glow` | `rgba(44,138,146,0.25)` | `rgba(44,138,146,0.4)` | Hover-glow на CTA и FinlyCard |

Маппинг shadcn → Финли (тоже в `@theme inline`):
- `--color-primary` ← `--color-orange-flame`
- `--color-primary-foreground` ← `oklch(1 0 0)` (контрастный текст)
- `--color-secondary` ← `--color-murloc-teal`
- `--color-background` ← `--color-tavern-bg`
- `--color-card` ← `--color-tavern-surface`
- `--color-popover` ← `--color-tavern-elevated`
- `--color-border` ← `--color-gold-frame` с opacity 0.3 в light, 0.4 в dark
- `--color-destructive` ← `--color-rune-danger`
- `--color-muted-foreground` ← `--color-scroll-faded`
- `--color-foreground` ← `--color-scroll-ink`
- `--color-chart-1..5` ← orange-flame / murloc-teal / gold-frame / rune-success / rune-danger (порядок для recharts)

### 3.2. Типографика

- **Sans:** Inter (уже подключён в `layout.tsx`). Используется для всех body-текстов, таблиц, форм, label, кнопок.
- **Display:** **Cinzel** (Google Fonts через `next/font/google`, weights 400/600/700, subsets `latin` + `latin-ext`). Используется для:
  - `<h1>`, `<h2>` на лендинге, auth-flows и пустых состояниях.
  - `FinlyMetricTile.value` (большие KPI-цифры).
  - `FinlyAchievementToast.title`.
  - `FinlySection` заголовки.
  - Wordmark «Finly» в TopNav.
  Базовые `<h3>`–`<h6>` остаются Inter (Cinzel слишком тяжёлый для подзаголовков таблиц).
- **Mono:** GeistMono (если уже есть) — для дат/времени/SKU/ID. Если не подключён, оставляем браузерный `monospace`.
- `display: swap` для Cinzel; fallback chain `Cinzel, "Iowan Old Style", Georgia, serif`.

### 3.3. Радиусы

- `--radius` (база): `0.5rem`
- `--radius-frame`: `0.25rem` — для `FinlyMetricTile` и `FinlyCard` (почти прямоугольные, как Hearthstone-карты)
- `--radius-pill`: `9999px` — для `FinlyButton` primary CTA
- `--radius-sm` / `--radius-md` / `--radius-lg` пересчитываются через `calc()` от `--radius` (как сейчас в shadcn)

### 3.4. Тени и эффекты

- `--shadow-rune`: `0 1px 0 rgba(184,136,30,0.2)` — стандартная тень карточек (light), в dark `0 1px 0 rgba(212,169,58,0.3)`
- `--shadow-tide`: `0 0 0 1px var(--color-murloc-teal), 0 8px 32px var(--color-tide-glow)` — hover карточек
- `--shadow-treasure`: `0 0 0 2px var(--color-gold-frame), 0 0 24px rgba(212,169,58,0.4)` — achievement-state
- `--shadow-toast`: `0 24px 48px rgba(0,0,0,0.4)` — для FinlyAchievementToast

### 3.5. Motion

- `--ease-tilt`: `cubic-bezier(.2,.9,.3,1)` — для card hover-tilt
- `--ease-rune`: `cubic-bezier(.4,0,.2,1)` (стандартный) — для всего остального
- `FinlyMetricTile` hover: `transform: perspective(800px) rotateX(2deg) rotateY(-2deg) translateZ(0); transition: transform 220ms var(--ease-tilt), box-shadow 220ms var(--ease-rune)`
- `FinlyAchievementToast`: enter `slide-in-from-top + scale 0.95 → 1 + fade` за 380ms, hold 4s (если не наводят hover), exit `scale → 0.9 + fade` за 240ms
- В Tavern Mode: добавляется фоновое мерцание `--shadow-tide` (5s loop infinite), tilt amplitude увеличивается до `rotateX(3deg) rotateY(-3deg)`
- Уважается `prefers-reduced-motion: reduce` — все анимации заменяются на 0ms, tilt отключается, мерцание глушится

---

## 4. Theme system

### 4.1. Состояние и провайдеры

Не используем `next-themes`. Свой `<ThemeProvider>` в `src/components/finly/Provider/ThemeProvider.tsx`:
- Состояние: `'light' | 'dark' | 'system'`. По умолчанию `'system'`.
- `'system'` подписывается на `matchMedia('(prefers-color-scheme: dark)')` и применяет соответствующий класс.
- Класс `dark` ставится на `<html>` (через `useEffect` + ref на documentElement).
- Persistence:
  - **Незалогинен:** cookie `finly_theme` с `SameSite=Lax; Max-Age=31536000`.
  - **Залогинен:** Convex `users.themePreference` (`v.union(v.literal('light'), v.literal('dark'), v.literal('system'))`, default `'system'`).
  - **Sync:** при логине берём `users.themePreference` (приоритет) и обновляем cookie. При смене через `<ThemeToggle/>` обновляем оба.
- На сервере (Next SSR/RSC): читаем cookie через `cookies()` из `next/headers`, прокидываем в `<html className={initialTheme === 'dark' ? 'dark' : ''}>` чтобы избежать FOUC.

### 4.2. Tavern Mode

Отдельный провайдер `<TavernProvider>` — состояние `boolean`, default `false`. Persistence идентичен Theme: cookie `finly_tavern` + Convex `users.tavernMode`. Класс `tavern` ставится на `<html>`. CSS-правила в `globals.css` под селектором `html.tavern *`:
- `--shadow-tide` мерцание включается на `FinlyMetricTile` и `FinlyButton` (5s infinite).
- `FinlyMetricTile` tilt amplitude увеличивается.
- `<SoundProvider>` начинает реагировать на события (вне Tavern — silent).
- На дашборде включается фоновая текстура «дерево таверны» (CSS gradient + noise, без растровых картинок).

### 4.3. Convex schema delta (theme/tavern; achievements — в §9.1)

```ts
// convex/schema.ts — defineSchema()
users: defineTable({
  // ... существующие поля
  themePreference: v.optional(v.union(
    v.literal('light'),
    v.literal('dark'),
    v.literal('system'),
  )),
  tavernMode: v.optional(v.boolean()),
  monthlyProfitGoal: v.optional(v.number()),  // используется в milestone `monthlyPlanHit` (§9.3)
})
```

Миграция existing users: новые поля optional → null/undefined трактуется как `'system'` / `false` / `undefined` (нет цели). Если `monthlyProfitGoal === undefined`, milestone `monthlyPlanHit` не триггерится, остальные работают.

### 4.4. Backend mutations

```ts
// convex/users.ts
export const updateThemePreference = mutation({
  args: { themePreference: v.union(v.literal('light'), v.literal('dark'), v.literal('system')) },
  handler: async (ctx, { themePreference }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');
    await ctx.db.patch(userId, { themePreference });
  },
});
export const updateTavernMode = mutation({ ... });
```

---

## 5. Component layer — `src/components/finly/`

### 5.1. Структура каталога

```
src/components/finly/
  FinlyCard.tsx
  FinlyMetricTile.tsx
  FinlyAchievementToast.tsx
  FinlyButton.tsx
  FinlyBadge.tsx
  FinlySection.tsx
  FinlyDataTable.tsx
  FinlyEmptyState.tsx
  FinlyChartCard.tsx
  FinlyAuthLayout.tsx          // wrapper для login/register/forgot и т.д.
  TavernToggle.tsx
  ThemeToggle.tsx
  MascotIllustration.tsx
  Provider/
    AchievementProvider.tsx
    SoundProvider.tsx
    ThemeProvider.tsx
    TavernProvider.tsx
  index.ts                     // re-exports
  __tests__/
    FinlyCard.test.tsx
    FinlyMetricTile.test.tsx
    ThemeProvider.test.tsx
    TavernProvider.test.tsx
    AchievementProvider.test.tsx
    SoundProvider.test.tsx
    MascotIllustration.test.tsx
```

### 5.2. Ключевые props и поведение

**`FinlyCard`** — обёртка над shadcn `Card`. Пропсы: `accent?: 'gold' | 'teal' | 'flame'` (цвет рамки), `interactive?: boolean` (включает hover-tilt + shadow-tide), `glowing?: boolean` (фоновое мерцание независимо от Tavern, для achievements). Рендерит `<div class="rounded-frame border border-gold-frame/30 bg-tavern-surface p-... transition...">`.

**`FinlyMetricTile`** — главный «Hearthstone»-плиточный компонент. Пропсы:
```ts
{
  label: string;
  value: number | string;
  formatted?: string;          // "847 320 ₽" — если undefined, форматируем по умолчанию
  deltaPct?: number;           // 12.4 → ▲ +12.4%
  comparison?: string;         // "vs. март"
  accent?: 'gold' | 'teal' | 'flame';
  achievement?: { kind: string; sinceDate: string };  // показывает ⟡ + treasure-shadow
  loading?: boolean;
  onClick?: () => void;        // если задан, плитка интерактивна (звук в Tavern)
}
```
Layout: маленький uppercase-label сверху, большое Cinzel-число посередине, дельта снизу. На hover — tilt + tide-shadow. Если `achievement` задан — добавляется ⟡-маркер в углу и treasure-shadow вместо tide.

**`FinlyAchievementToast`** — рендерится через `<AchievementProvider>` (см. ниже). Не вызывается напрямую; в коде делаем `useAchievement().show({...})`.

**`FinlyButton`** — обёртка над shadcn `Button`. Варианты: `primary` (orange-flame, pill-radius), `secondary` (murloc-teal outline), `ghost`, `treasure` (gold gradient — для редких CTA типа «Открыть milestone»). В Tavern — звук `click` на нажатие primary.

**`FinlyBadge`** — варианты `success` (rune-success), `danger` (rune-danger), `info` (murloc-teal), `gold` (gold-frame).

**`FinlySection`** — `<section>` с заголовком (Cinzel) и под ним золотой рунической линией: `<div class="h-px bg-gradient-to-r from-gold-frame to-transparent">`. Children — content секции.

**`FinlyDataTable`** — обёртка над shadcn `Table`. Чередующиеся строки в `bg-tavern-bg` / `bg-tavern-surface`. Sticky header с teal-полосой снизу. Пропс `dense?: boolean` для сжатия.

**`FinlyEmptyState`** — пропсы `{ mascotPose, title, body, cta?: { label, href|onClick } }`. Mascot 200px центрирован сверху, под ним Cinzel-заголовок, body Inter, CTA — primary FinlyButton.

**`FinlyChartCard`** — обёртка над recharts. Прокидывает `chart-1..5` CSS-переменные в стили линий/баров/площадей. Темо-осознан (light/dark меняет grid color).

**`FinlyAuthLayout`** — двухколоночный шаблон для всех auth-страниц. Слева mascot-hero (на md+), справа форма на `bg-tavern-elevated`. На <md mascot скрывается.

**`MascotIllustration`** — пропсы `{ pose: PoseKey; size?: number; alt?: string; loading?: 'lazy'|'eager' }`. Внутри — `<picture>` с `<source srcSet="/mascot/{pose}.webp">` + `<img src="/mascot/{pose}.svg">`. SVG всегда есть (плейсхолдер), webp — финальный, появляется когда положишь.

**`ThemeToggle`** — три ghost-кнопки: ☀ (light), ☾ (dark), ⚙ (system). Активная подсвечивается `bg-orange-flame/10`.

**`TavernToggle`** — большой переключатель с описанием «🍺 Включить режим таверны: фоновое мерцание, звуки, анимация-форвард. Ничего не сохраняет ваши данные иначе».

### 5.3. Provider-компоненты

**`AchievementProvider`** — context, expose `show({kind, title, body, mascotPose})`. Внутренне держит очередь тостов (max 3 одновременно), реагирует на `useQuery(api.achievements.newSinceLastSeen)` — для каждой новой записи вызывает `show`. После показа — мутация `markAchievementSeen(achievementId)`.

**`SoundProvider`** — preload-sprite (`public/sounds/finly.ogg`) только если Tavern Mode = on. Expose `useSound(name)` который возвращает `() => void`. Уважает `prefers-reduced-motion` (silent), уважает первый user-gesture (autoplay блокировка).

**`ThemeProvider`** — выше описан в §4.

**`TavernProvider`** — выше описан в §4.

### 5.4. Wiring в `layout.tsx`

```tsx
// src/app/layout.tsx
import { ThemeProvider } from '@/components/finly/Provider/ThemeProvider';
import { TavernProvider } from '@/components/finly/Provider/TavernProvider';
import { SoundProvider } from '@/components/finly/Provider/SoundProvider';
import { AchievementProvider } from '@/components/finly/Provider/AchievementProvider';
import { Footer } from '@/components/nav/Footer';

// Внутри <html lang="ru" className={initialTheme === 'dark' ? 'dark' : ''}>
<body className="bg-tavern-bg text-scroll-ink min-h-screen flex flex-col">
  <ConvexAuthNextjsServerProvider>
    <ConvexClientProvider>
      <ThemeProvider initialTheme={initialTheme}>
        <TavernProvider initialTavern={initialTavern}>
          <SoundProvider>
            <AchievementProvider>
              <TopNav />
              <main className="max-w-screen-2xl mx-auto px-4 py-6 flex-1 w-full">{children}</main>
              <Footer />
            </AchievementProvider>
          </SoundProvider>
        </TavernProvider>
      </ThemeProvider>
    </ConvexClientProvider>
  </ConvexAuthNextjsServerProvider>
</body>
```

`initialTheme` и `initialTavern` читаются на сервере из cookies в layout (RSC).

---

## 6. Mascot system

### 6.1. Места размещения

| Pose key | Где используется | Размер (max width) | Описание позы |
|---|---|---|---|
| `nav-icon` | TopNav слева от wordmark | 32px | Голова мурлока в шлеме-фонарике, фронтально, нейтральное выражение |
| `hero` | `/login`, `/register`, неавторизованный заход на `/` | 320px | Полный рост, поза «исследователь со свитком», смотрит вдаль вправо |
| `empty-shops` | `/settings` без магазинов, `/pending-approval` | 200px | Чешет затылок над пустым сундуком, удивлённое выражение |
| `empty-data` | `/analytics`, `/products`, `/financials` без данных | 200px | Изучает свиток-карту через монокль |
| `achievement` | `FinlyAchievementToast` | 80px | Поднимает золотой кубок над головой, гордое выражение |
| `not-found` | `/404`, `/rejected` | 240px | Держит компас, рядом перевёрнутая карта, растерянное выражение |

### 6.2. Файловая структура ассетов

```
public/mascot/
  nav-icon.svg              // SVG-плейсхолдер (от Claude)
  nav-icon.webp             // финальный PNG → WebP (от GPT, ты)
  nav-icon@2x.webp          // retina
  hero.svg
  hero.webp
  hero@2x.webp
  empty-shops.svg
  empty-shops.webp
  empty-shops@2x.webp
  empty-data.svg
  empty-data.webp
  empty-data@2x.webp
  achievement.svg
  achievement.webp
  achievement@2x.webp
  not-found.svg
  not-found.webp
  not-found@2x.webp
```

`MascotIllustration` рендерит `<picture>`: `webp` через `<source>`, `svg` как `<img src>` fallback. До тех пор пока ты не положишь webp — будет показан svg.

### 6.3. GPT-промпты для генерации (один формат на все позы)

Базовый промпт-шаблон для всех 6 поз (используй DALL-E 3 / GPT-Image-1 в ChatGPT, разрешение 1024×1024):

```
Flat vector illustration, transparent background, single character,
centered composition with safe margins ~10% on all sides.

Character: a friendly murloc-inspired explorer (NOT Sir Finley
Mrgglton from Hearthstone — distinct design). Round head with
large dark eyes, prominent fish-like fin on top of the head, soft
greenish-teal scaly skin (#2c8a92 base with lighter belly), webbed
hands, small height (chibi-friendly proportions, ~3 heads tall).
Outfit: leather adventurer vest in warm brown, brass goggles or
monocle, scroll quiver on back, NOT Hearthstone-card armor.

Style: clean flat vectors with subtle gradients, soft outlines,
limited shading. Color palette LOCKED to: orange-flame #f97316
(primary accent), murloc-teal #2c8a92 (skin/water), gold-frame
#d4a93a (metal/highlights), scroll-ink #1a1208 (linework),
parchment #faf6ec (light surfaces). Avoid heavy black, avoid
photorealism, avoid Hearthstone-specific iconography (no card
borders, no Belwe font, no Blizzard logo elements).

Output: PNG with transparent background, square 1024×1024.
```

Дальше per-pose добавляешь только описание позы (берёшь из таблицы 6.1, перефразируй на английский). Пример для `hero`:

```
[base prompt above]

Pose: standing full-body, three-quarter view facing right, holding
an unrolled treasure map in both hands at chest height, slight
forward lean as if just spotted something on the horizon. Hopeful,
curious expression. Magical sparkles or glow not required.
```

Аналогично для каждой из 6 поз. Финальные PNG → конверт через `cwebp -q 85` или онлайн-конвертер; кладёшь в `public/mascot/`.

### 6.4. SVG-плейсхолдеры (от Claude в плане T?)

Я хэндкрафчу простые векторные мурлок-силуэты — круглая голова, плавники, шлем-фонарь, базовые цвета. 6 SVG-файлов кладутся в `public/mascot/{pose}.svg` сразу в плане A.4 (отдельная Task), чтобы UI работал и можно было оценивать макеты до твоей AI-генерации.

**Acceptance:** SVG-плейсхолдер в коде должен иметь header-комментарий `<!-- TODO: replace with GPT-generated PNG (see docs/superpowers/specs/2026-04-28-finly-a4-redesign-design.md §6.3) -->`.

---

## 7. Покрытие страниц

| Группа | Страница | Что делаем |
|---|---|---|
| **Auth-flows** | `/login`, `/register` | `<FinlyAuthLayout>` с `pose="hero"` слева, форма справа, primary CTA orange-flame, заголовок Cinzel («Вход в Лигу» / «Стать Исследователем») |
| | `/forgot-password`, `/reset-password`, `/verify-email` | Тот же `<FinlyAuthLayout>`, mascot 200px, общий шаблон формы |
| | `/pending-approval` | `<FinlyEmptyState pose="empty-shops" title="Лига рассматривает заявку" body="...">` |
| | `/rejected` | `<FinlyEmptyState pose="not-found" title="Заявка отклонена" cta="Связаться с админом">` |
| | `/invite/[token]` | 4 ветки (ok / used / expired / wrong-email) — каждая с разным mascot-pose и описанием |
| **Dashboard** | `/` | Welcome-блок (`pose="hero"` 160px) для новых, иначе сразу PeriodSelector в стиле «свиток» + 4-колонка `FinlyMetricTile` (Прибыль/Выручка/Маржа/Возвраты) + `FinlyChartCard` (выручка по дням) + `FinlySection "Магазины"` со списком |
| **Internal** | `/analytics` | Заголовок `<FinlySection>`, фильтры → svg-«свитки», `FinlyDataTable` + `FinlyChartCard` |
| | `/pulse` | Лента событий — каждое `FinlyCard accent="teal"` с timestamp |
| | `/products` | Сетка `FinlyCard` SKU-карточек или `FinlyDataTable` (toggle), empty-state |
| | `/financials` | Top-row из `FinlyMetricTile` totals, под ним `FinlyDataTable` отчёта |
| | `/prices` | `FinlyDataTable` редактор + primary CTA «Применить изменения» |
| | `/returns` | `FinlyDataTable`, status-бейджи (`FinlyBadge`) |
| | `/feedbacks` | Лента `FinlyCard` отзывов, фильтр по звёздам — golden stars |
| | `/settings` | Табы (shadcn): Профиль / Магазины / Уведомления / **Tavern Mode** (новая) / Тема. Empty-state `pose="empty-shops"` |
| **Org** | `/org/team` | `FinlyDataTable` участников, MemberRow refactor, invite-modal в стиле |
| | `/org/settings` | Форма + danger-zone (red FinlyButton) |
| **Admin** | `/admin/users` | StatusTabs, UserCard через FinlyCard, RejectModal стилизован |
| **Прочее** | `/legal/privacy`, `/legal/terms` | Новые статичные страницы (контент-заглушка: «Будет опубликовано позднее. Связь: @Virtuozick») |
| | `/achievements` | Новая страница — архив всех достижений пользователя, grid `FinlyCard glowing` |
| | `/404` | `<FinlyEmptyState pose="not-found">` |

---

## 8. TopNav и Footer

### 8.1. TopNav (новый)

- Высота: 56px desktop, 64px mobile
- Фон: `bg-tavern-surface` с нижним border `border-gold-frame/30`
- **Слева:** `<MascotIllustration pose="nav-icon" size={32}/>` + wordmark `<span class="font-cinzel text-xl">Finly</span>`. Кликом → `/`.
- **Центр (≥md):** горизонтальное меню — Дашборд · Аналитика · Пульс · Товары · Финансы · Цены · Возвраты · Отзывы. Активная ссылка получает orange-flame underline. На <md скрывается, заменяется бургером.
- **Справа:** `<ThemeToggle/>` → `<OrgSwitcher/>` (если orgs > 1) → `<AvatarMenu/>` (Профиль / Команда / Настройки / Админ-панель если isSystemAdmin / Выйти).
- На мобильном — бургер открывает side-drawer «развёрнутый свиток»: фон `bg-tavern-elevated`, ссылки в две колонки, mascot внизу.

### 8.2. Footer (новый)

```tsx
<footer class="border-t border-gold-frame/30 bg-tavern-surface mt-auto">
  <div class="max-w-screen-2xl mx-auto px-4 py-6 text-center text-scroll-faded text-sm space-y-2">
    <p><span class="font-cinzel text-scroll-ink">Finly</span> · финансы селлера на маркетплейсах</p>
    <p>© 2026 · Связь с автором: <a class="text-orange-flame hover:underline" href="https://t.me/Virtuozick">@Virtuozick</a> (Telegram)</p>
    <p>
      <a class="hover:text-scroll-ink" href="/legal/privacy">Политика конфиденциальности</a> ·
      <a class="hover:text-scroll-ink" href="/legal/terms">Условия использования</a>
    </p>
  </div>
</footer>
```

Footer прокидывается в layout; `<main>` получает `flex-1` для прижатия footer'а к низу при коротком контенте.

---

## 9. Achievements / milestones

### 9.1. Convex schema

```ts
// convex/schema.ts
userAchievements: defineTable({
  userId: v.id('users'),
  kind: v.union(
    v.literal('firstShop'),
    v.literal('firstThousandSales'),
    v.literal('monthlyPlanHit'),
    v.literal('firstMillionProfit'),
    v.literal('tenKSold'),
    v.literal('zeroReturnsWeek'),
    v.literal('firstReviewFiveStar'),
    v.literal('storeAnniversary'),
  ),
  achievedAt: v.number(),                    // ms epoch
  payload: v.optional(v.record(v.any())),    // {monthLabel, planTarget, ...}
  seenAt: v.optional(v.number()),            // когда юзер увидел toast
})
  .index('by_user', ['userId'])
  .index('by_user_kind', ['userId', 'kind'])
  .index('by_user_unseen', ['userId', 'seenAt']);
```

### 9.2. Backend functions

```ts
// convex/achievements.ts
export const recordIfNew = internalMutation({
  args: { userId: v.id('users'), kind: ..., payload: v.optional(...) },
  handler: async (ctx, { userId, kind, payload }) => {
    const existing = await ctx.db
      .query('userAchievements')
      .withIndex('by_user_kind', q => q.eq('userId', userId).eq('kind', kind))
      .first();
    if (existing) return null;
    return await ctx.db.insert('userAchievements', {
      userId, kind, achievedAt: Date.now(), payload, seenAt: undefined,
    });
  },
});

export const newSinceLastSeen = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query('userAchievements')
      .withIndex('by_user_unseen', q => q.eq('userId', userId).eq('seenAt', undefined))
      .collect();
  },
});

export const markSeen = mutation({
  args: { achievementId: v.id('userAchievements') },
  handler: async (ctx, { achievementId }) => {
    const userId = await getAuthUserId(ctx);
    const a = await ctx.db.get(achievementId);
    if (!a || a.userId !== userId) throw new Error('Forbidden');
    await ctx.db.patch(achievementId, { seenAt: Date.now() });
  },
});

export const listAll = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query('userAchievements')
      .withIndex('by_user', q => q.eq('userId', userId))
      .order('desc')
      .collect();
  },
});
```

### 9.3. Triggering points (где `recordIfNew` вызывается)

- `firstShop` — после `shops:create` mutation, если у юзера это первый магазин.
- `firstThousandSales` — в существующей функции суммы продаж (`shops/syncOrders` или `analytics:total`), при пересечении порога.
- `monthlyPlanHit` — в дашборд-query: сравнить fact-profit vs `users.monthlyProfitGoal` (новое опциональное поле; если задано и достигнут — record).
- `firstMillionProfit` — аналогично, порог 1 000 000 ₽.
- `tenKSold` — сумма quantity продаж >= 10 000.
- `zeroReturnsWeek` — за прошедшую неделю returns = 0 при > 0 sales.
- `firstReviewFiveStar` — при синке отзывов, первый 5★.
- `storeAnniversary` — год от `shops.createdAt`, scheduler раз в день проверяет.

### 9.4. UI

`<AchievementProvider>` подписан на `useQuery(api.achievements.newSinceLastSeen)`. На каждое появление записи:
1. Очередь добавляет тост.
2. `<FinlyAchievementToast>` рендерится 4s в правом верхнем углу.
3. После закрытия (timer или клик-крестик) → `mutation: markSeen(id)`.
4. Звук `achievement` (если Tavern Mode on).
5. Tile с этим KPI на дашборде получает `glowing` proп ещё на 24h.

Страница `/achievements` — grid `FinlyCard glowing` с описанием каждой achieved плашки и датой.

---

## 10. AuthGate refactor (T1)

### 10.1. Существующий wrapper

`src/components/auth/AuthGate.tsx` уже создан в A.3 и реализует нужную логику: ждёт `useCurrentUser()` (`undefined` → loader, `null` → redirect /login, `status === 'pending'` → redirect /pending-approval, `'rejected'` → redirect /rejected, `'approved'` → render children). Контракт устраивает A.4 как есть; правка одна — заменить hardcoded `text-gray-400` на токены (`text-scroll-faded`) и обернуть loader в `<FinlyEmptyState pose="empty-data" title="Загрузка…">` или просто `<FinlyCard>` со спиннером.

### 10.2. Применение

11 страниц, оборачиваемых в плане T1:
- `/pulse`, `/analytics`, `/products`, `/financials`, `/feedbacks`, `/returns`, `/prices`, `/settings`
- `/org/team`, `/org/settings`, `/admin/users` (последняя — `<AdminGate>` уже есть, но также через `<AuthGate>` для status-проверки)
- Также `/achievements` — новая страница, обёрнута сразу.

Pattern для каждой:
```tsx
export default function PulsePage() {
  return (
    <AuthGate>
      <PulseContent/>
    </AuthGate>
  );
}
function PulseContent() {
  const data = useQuery(api.pulse.list, {}); // безопасно: AuthGate гарантирует approved
  // ...
}
```

### 10.3. Тесты

Один параметризированный тест-файл `src/app/__tests__/auth-gate-coverage.test.tsx` со списком всех 11+ страниц, для каждой:
- Mock `useCurrentUser` → `{loading: true}` → ожидаем `LoadingSpinner`.
- Mock → `{user: {status: 'pending'}}` → ожидаем `router.replace('/pending-approval')`.
- Mock → `{user: {status: 'approved'}}` → ожидаем рендер контента.

---

## 11. Тестирование

| Тип | Что покрываем |
|---|---|
| **Юнит** | Каждый Финли-компонент: класс-маппинг (light/dark/tavern), props-варианты (achievement, accent), focus-visible, role/aria |
| **Юнит** | `ThemeProvider` (cookie+convex sync), `TavernProvider`, `AchievementProvider` (queue, mark seen), `SoundProvider` (silent without Tavern, silent with reduced-motion) |
| **Юнит** | `MascotIllustration` (picture+source+img markup, lazy default) |
| **Рендер** | Auth-gate coverage test (см. §10.3) |
| **Рендер** | `FinlyMetricTile` с achievement → проверяем gold-frame и ⟡-маркер; без — стандарт |
| **Snapshot/regression** | `dashboard-numbers.test.ts` — на фиксированных seed-данных запрос `dashboard.metrics()` возвращает идентичные значения до/после редизайна (защита от случайной правки расчётов) |
| **E2E (jsdom-эмуляция)** | Тема: cookie ставится, `<html>` получает `dark`, после mock-логина значение синкается в `users.themePreference` |
| **Build/typecheck** | После каждого Task `npm run build` + `npm run typecheck` зелёные |

Все тесты в `vitest`. Существующие 115 тестов должны остаться зелёными.

---

## 12. Sequencing (контур; точный T-список — в плане)

Ориентировочный порядок Task для плана:

1. **AuthGate refactor** (T1) — фикс 11 страниц + тесты.
2. **Design tokens** (T2) — `globals.css` + Cinzel + перепривязка shadcn.
3. **Theme system** (T3) — `<ThemeProvider>` + cookie+Convex + schema delta + mutations.
4. **Tavern Mode** (T4) — `<TavernProvider>` + cookie+Convex + tavern CSS.
5. **Mascot SVG-плейсхолдеры** (T5) — 6 SVG в `public/mascot/`.
6. **`MascotIllustration`** (T6).
7. **`finly/` foundation** (T7) — `FinlyCard`, `FinlyButton`, `FinlyBadge`, `FinlySection`, `FinlyEmptyState` + тесты.
8. **`FinlyMetricTile`** (T8) — с achievement-state.
9. **`FinlyChartCard`, `FinlyDataTable`** (T9).
10. **`FinlyAuthLayout`** (T10).
11. **TopNav redesign** (T11) — mascot + ThemeToggle + меню + AvatarMenu.
12. **Footer + privacy/terms-заглушки** (T12).
13. **Auth-flows redesign** (T13) — login/register/forgot/reset/verify/pending/rejected/invite.
14. **Dashboard `/` redesign** (T14) — FinlyMetricTile + Chart + Section + PeriodSelector-«свиток».
15. **Internal pages redesign** (T15) — analytics/pulse/products/financials/prices/returns/feedbacks/settings (можно поделить на 2–3 подзадачи).
16. **Org & Admin pages redesign** (T16).
17. **Achievements backend** (T17) — schema + mutations + triggering points.
18. **`AchievementProvider` + `FinlyAchievementToast` + `/achievements`** (T18).
19. **`SoundProvider`** (T19) — sprite + Tavern wiring.
20. **`/404`** (T20).
21. **Snapshot regression test** (T21) — dashboard-numbers.test.
22. **Manual smoke + Юрий ревью** (T22) — полный флоу, цифры до копейки.

---

## 13. Риски и mitigation

| Риск | Mitigation |
|---|---|
| Cinzel грузится медленно | `next/font` с `display: swap`, fallback `Iowan Old Style, Georgia, serif` |
| Tilt-анимация ломается на iOS | feature-detect 3D transforms, fallback на flat hover (только shadow) |
| Tavern-звуки автоплей блокированы браузером | первый user-gesture включает sprite; до этого silent |
| Mascot SVG-плейсхолдеры выглядят дёшево | в коде комментарий-TODO, в плане T22 чеклист «Юрий проверил, что финальные PNG положены» |
| Цифры на дашборде сместились | snapshot-тест T21 ловит регрессию |
| Pending-юзер падает на непокрытом месте | T1 закрывает 11; код-ревью на новые страницы — `useQuery` только под AuthGate |
| GPT-mascot выглядит как Sir Finley copy | IP-чеклист в §2; визуальная валидация Юрием перед merge |
| Размер бандла растёт | sound-sprite lazy-load в Tavern; mascot — webp + `loading="lazy"`; tree-shaking lucide-react |
| Recharts не подхватит токены | в `FinlyChartCard` явно прокидываем `chart-1..5` через CSS-vars; тестируем light/dark |
| Theme FOUC при SSR | initialTheme читается на сервере из cookie и проставляется в `<html>` сразу |

---

## 14. Out of scope (отдельные планы / следующие итерации)

- Финальные PNG-маскоты от GPT — Юрий генерирует после T6, до тех пор работают SVG-плейсхолдеры.
- ESLint custom-rule «обязательный AuthGate для useQuery» — если не успеем в A.4, выносим в A.5.
- Контент Privacy/Terms — заглушки сейчас, юрист-копирайт позже.
- Полный маркетинговый лендинг для не-залогиненных (`/landing`) — пока `/` для не-залогиненных = редирект на `/login`. Лендинг — отдельный план.
- Push-уведомления о milestone в Telegram-бота — отдельный модуль.
- Перевод копи на английский для международного запуска — отдельный план.
- Переход на серверные компоненты для тяжёлых страниц (analytics/pulse) — отдельный план перформанса.

---

## 15. Open / TBD к моменту написания плана

- Точное содержание T15 (можно ли разбить «Internal pages» на 2–3 параллельных Task; или одна большая Task с подпунктами).
- Решение по ветке: продолжаем `mfa-a2-auth-ui` (PR #3 разрастается ещё на ~25 коммитов и становится 77+) или открываем `finly-a4-redesign` поверх — в плане зафиксируем.
- Финальный список звуков (3 базовых: click/achievement/flip) — в плане может расширяться по мере UI.
- Порядок rollout на prod: A.4 идёт после prod-deploy A.1+A.2+A.3 (см. project_finly_subproject_a.md, §«Что осталось», п.3) или они мерджатся в один rollout. Нужно решение Юрия в начале плана.
