# MFA-A.3 Admin / Team / Invites UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть UI-фазу A.3 поверх готового A.1 backend и A.2 auth — страницы `/admin/users`, `/org/team`, `/org/settings`, `/invite/[token]` (4 ветки), org-switcher в TopNav для multi-org.

**Architecture:** Чистый Next.js App Router frontend на уже существующих Convex handlers (`convex/admin/users.ts`, `convex/org/{invites,team,me,settings}.ts`). Все handlers закрыты `ensureAdmin` / `ensureOrgOwner` / `ensureOrgMember`, поэтому клиент вызывает их напрямую через refs из `src/lib/convex-refs.ts`. Новые гейты `AdminGate` (system admin) и `OwnerGate` (owner текущей org) — обёртки над `AuthGate` для статус-чека.

**Tech Stack:** Next.js 16 App Router + React 19, Convex 1.32 + `@convex-dev/auth/react`, Tailwind CSS 4, shadcn-style UI (`@/components/ui/*` уже на месте), vitest 4 + @testing-library/react для smoke-тестов компонентов.

---

## Файловая структура

**Создаются:**
- `src/lib/convex-refs.ts` — добавить 14 refs (admin/users, org/invites, org/team, org/settings)
- `src/hooks/useIsAdmin.ts` (+ `.test.tsx`) — обёртка над useCurrentUser → bool
- `src/components/auth/AdminGate.tsx` (+ `.test.tsx`)
- `src/components/auth/OwnerGate.tsx` (+ `.test.tsx`)
- `src/app/admin/users/page.tsx` — admin panel
- `src/components/admin/UserCard.tsx` (+ `.test.tsx`)
- `src/components/admin/RejectModal.tsx`
- `src/components/admin/StatusTabs.tsx`
- `src/app/org/team/page.tsx` — owner team page
- `src/components/org/MemberRow.tsx`
- `src/components/org/PendingInviteRow.tsx`
- `src/components/org/InviteModal.tsx`
- `src/components/org/TransferOwnershipModal.tsx`
- `src/app/org/settings/page.tsx` — owner-only renameOrg
- `src/app/invite/[token]/page.tsx` — 4-branch acceptance
- `src/components/nav/OrgSwitcher.tsx` (+ `.test.tsx`) — селектор org для multi-org

**Модифицируются:**
- `src/components/nav/TopNav.tsx` — добавить admin-link (если isSystemAdmin), команда-link (если owner), OrgSwitcher (если orgs.length ≥ 2)
- `src/app/layout.tsx` — нового ничего, но проверим что TopNav рендерится для всех приватных страниц

**Без изменений:** middleware (уже допускает `/invite/(.*)` как public).

---

## Замечания

- Все UI-тексты на русском, «вы» с маленькой буквы, кнопки в imperative form.
- Цвета: оставляем текущие violet-* стили из A.2 — orange-black редизайн = A.4.
- Тесты — минимальный smoke (export-check + render без crash). Глубокие e2e не делаем (нет Storybook/Playwright в проекте).
- TopNav.test.tsx уже есть — расширим под новые ссылки.
- TS2589: новые refs объявляются в `convex-refs.ts` через `as unknown as Mut/Q` шаблон — не дёргать `api.X.Y` напрямую в страницах.

---

## Phase 1: Refs + Гейты

### Task 1: Добавить refs для admin/users

**Files:**
- Modify: `src/lib/convex-refs.ts`

- [ ] **Step 1: Добавить блок admin в convex-refs.ts (после блока orgs в самом низу файла)**

```typescript
// ───────────────── admin/users
export const adminUsersListByStatusRef =
  "admin/users:listByStatus" as unknown as Q<
    {
      status?: "pending" | "approved" | "rejected";
      search?: string;
    },
    Doc<"users">[]
  >;
export const adminUsersCountsByStatusRef =
  "admin/users:countsByStatus" as unknown as Q<
    Record<string, never>,
    { total: number; pending: number; approved: number; rejected: number }
  >;
export const adminApproveUserRef = "admin/users:approveUser" as unknown as Mut<
  { userId: Id<"users"> },
  { ok: true; orgId: Id<"organizations"> }
>;
export const adminRejectUserRef = "admin/users:rejectUser" as unknown as Mut<
  { userId: Id<"users">; reason?: string },
  { ok: true }
>;
```

- [ ] **Step 2: Запустить typecheck**

Run: `npm run typecheck`
Expected: `tsc --noEmit` без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/lib/convex-refs.ts
git commit -m "feat(refs): admin/users refs (A.3)"
```

---

### Task 2: Добавить refs для org/invites

**Files:**
- Modify: `src/lib/convex-refs.ts`

- [ ] **Step 1: Добавить блок org/invites после блока admin**

```typescript
// ───────────────── org/invites
export type InvitePublic = {
  email: string;
  orgName: string;
  inviterName: string;
};
export const orgInvitesListRef = "org/invites:listInvitesForOrg" as unknown as Q<
  { orgId: Id<"organizations"> },
  Doc<"invites">[]
>;
export const orgInviteByTokenRef =
  "org/invites:getInviteByToken" as unknown as Q<
    { token: string },
    | { ok: true; invite: InvitePublic }
    | { ok: false; error: "not_found" | "expired" | "revoked" | "already_accepted" }
  >;
export const orgInviteCreateRef = "org/invites:createInvite" as unknown as Mut<
  { orgId: Id<"organizations">; email: string },
  { inviteId: Id<"invites"> }
>;
export const orgInviteRevokeRef = "org/invites:revokeInvite" as unknown as Mut<
  { inviteId: Id<"invites"> },
  { ok: true }
>;
export const orgInviteResendRef = "org/invites:resendInvite" as unknown as Mut<
  { inviteId: Id<"invites"> },
  { ok: true }
>;
export const orgInviteAcceptRef = "org/invites:acceptInvite" as unknown as Mut<
  { token: string },
  { ok: true; alreadyMember: boolean }
>;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/convex-refs.ts
git commit -m "feat(refs): org/invites refs (A.3)"
```

---

### Task 3: Добавить refs для org/team + org/settings

**Files:**
- Modify: `src/lib/convex-refs.ts`

- [ ] **Step 1: Добавить блок org/team + org/settings после блока org/invites**

```typescript
// ───────────────── org/team
export type TeamMember = {
  membershipId: Id<"memberships">;
  userId: Id<"users">;
  email: string;
  name: string;
  role: "owner" | "member";
  joinedAt: number;
};
export const orgTeamListMembersRef = "org/team:listMembers" as unknown as Q<
  { orgId: Id<"organizations"> },
  TeamMember[]
>;
export const orgTeamRemoveMemberRef = "org/team:removeMember" as unknown as Mut<
  { membershipId: Id<"memberships"> },
  { ok: true }
>;
export const orgTeamLeaveRef = "org/team:leaveOrg" as unknown as Mut<
  { orgId: Id<"organizations"> },
  { ok: true }
>;
export const orgTeamTransferOwnershipRef =
  "org/team:transferOwnership" as unknown as Mut<
    {
      orgId: Id<"organizations">;
      newOwnerMembershipId: Id<"memberships">;
    },
    { ok: true }
  >;

// ───────────────── org/settings
export const orgRenameRef = "org/settings:renameOrg" as unknown as Mut<
  { orgId: Id<"organizations">; newName: string },
  { ok: true }
>;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/convex-refs.ts
git commit -m "feat(refs): org/team + org/settings refs (A.3)"
```

---

### Task 4: useIsAdmin hook

**Files:**
- Create: `src/hooks/useIsAdmin.ts`
- Test: `src/hooks/useIsAdmin.test.tsx`

- [ ] **Step 1: Написать тест**

```typescript
// src/hooks/useIsAdmin.test.tsx
import { describe, it, expect } from "vitest";
import { useIsAdmin } from "./useIsAdmin";

describe("useIsAdmin", () => {
  it("is exported as a function", () => {
    expect(typeof useIsAdmin).toBe("function");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/hooks/useIsAdmin.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать hook**

```typescript
// src/hooks/useIsAdmin.ts
"use client";
import { useCurrentUser } from "./useCurrentUser";

/**
 * - undefined — loading
 * - false — нет сессии или не системный админ
 * - true — isSystemAdmin === true
 */
export function useIsAdmin(): boolean | undefined {
  const user = useCurrentUser();
  if (user === undefined) return undefined;
  if (!user) return false;
  return user.isSystemAdmin === true;
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/hooks/useIsAdmin.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useIsAdmin.ts src/hooks/useIsAdmin.test.tsx
git commit -m "feat(hooks): useIsAdmin (A.3)"
```

---

### Task 5: AdminGate component

**Files:**
- Create: `src/components/auth/AdminGate.tsx`
- Test: `src/components/auth/AdminGate.test.tsx`

- [ ] **Step 1: Написать тест**

```typescript
// src/components/auth/AdminGate.test.tsx
import { describe, it, expect } from "vitest";
import { AdminGate } from "./AdminGate";

describe("AdminGate", () => {
  it("is exported as a component", () => {
    expect(typeof AdminGate).toBe("function");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/components/auth/AdminGate.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реализовать AdminGate**

```typescript
// src/components/auth/AdminGate.tsx
"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AuthGate } from "./AuthGate";

function AdminCheck({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  useEffect(() => {
    if (isAdmin === false) router.replace("/");
  }, [isAdmin, router]);
  if (isAdmin === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Загрузка…
      </div>
    );
  }
  if (!isAdmin) return null;
  return <>{children}</>;
}

export function AdminGate({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AdminCheck>{children}</AdminCheck>
    </AuthGate>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/components/auth/AdminGate.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/AdminGate.tsx src/components/auth/AdminGate.test.tsx
git commit -m "feat(auth): AdminGate component (A.3)"
```

---

### Task 6: OwnerGate component

**Files:**
- Create: `src/components/auth/OwnerGate.tsx`
- Test: `src/components/auth/OwnerGate.test.tsx`

- [ ] **Step 1: Написать тест**

```typescript
// src/components/auth/OwnerGate.test.tsx
import { describe, it, expect } from "vitest";
import { OwnerGate } from "./OwnerGate";

describe("OwnerGate", () => {
  it("is exported as a component", () => {
    expect(typeof OwnerGate).toBe("function");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/components/auth/OwnerGate.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реализовать OwnerGate**

```typescript
// src/components/auth/OwnerGate.tsx
"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { AuthGate } from "./AuthGate";

function OwnerCheck({ children }: { children: ReactNode }) {
  const org = useCurrentOrg();
  const router = useRouter();
  useEffect(() => {
    if (org && org.role !== "owner") router.replace("/");
  }, [org, router]);
  if (org === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Загрузка…
      </div>
    );
  }
  if (!org || org.role !== "owner") return null;
  return <>{children}</>;
}

export function OwnerGate({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <OwnerCheck>{children}</OwnerCheck>
    </AuthGate>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/components/auth/OwnerGate.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/OwnerGate.tsx src/components/auth/OwnerGate.test.tsx
git commit -m "feat(auth): OwnerGate component (A.3)"
```

---

## Phase 2: /admin/users

### Task 7: StatusTabs + RejectModal + UserCard scaffolding

**Files:**
- Create: `src/components/admin/StatusTabs.tsx`
- Create: `src/components/admin/RejectModal.tsx`
- Create: `src/components/admin/UserCard.tsx`
- Test: `src/components/admin/UserCard.test.tsx`

- [ ] **Step 1: Написать тест UserCard**

```typescript
// src/components/admin/UserCard.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UserCard } from "./UserCard";

describe("UserCard", () => {
  const baseUser = {
    _id: "u1" as never,
    email: "test@example.com",
    name: "Тестовый Юзер",
    phone: "+71234567890",
    businessName: "ООО Тест",
    shopsCountWB: 2,
    shopsCountOzon: 1,
    skuCount: 50,
    status: "pending" as const,
    isSystemAdmin: false,
    emailVerifiedAt: null,
    rejectionReason: null,
    createdAt: 1700000000000,
    approvedAt: null,
    approvedBy: null,
  };

  it("renders user name and email", () => {
    const { getByText } = render(
      <UserCard
        user={baseUser as never}
        onApprove={() => {}}
        onReject={() => {}}
      />
    );
    expect(getByText("Тестовый Юзер")).toBeTruthy();
    expect(getByText(/test@example.com/)).toBeTruthy();
  });

  it("shows NOT VERIFIED badge when emailVerifiedAt is null", () => {
    const { getByText } = render(
      <UserCard
        user={baseUser as never}
        onApprove={() => {}}
        onReject={() => {}}
      />
    );
    expect(getByText(/NOT VERIFIED/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/components/admin/UserCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать StatusTabs**

```typescript
// src/components/admin/StatusTabs.tsx
"use client";
import { cn } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected" | "all";
type Counts = { total: number; pending: number; approved: number; rejected: number };

const TABS: Array<{ key: Status; label: string }> = [
  { key: "pending", label: "Ожидают" },
  { key: "approved", label: "Одобрены" },
  { key: "rejected", label: "Отклонены" },
  { key: "all", label: "Все" },
];

export function StatusTabs({
  active,
  counts,
  onChange,
}: {
  active: Status;
  counts: Counts;
  onChange: (s: Status) => void;
}) {
  const count = (k: Status) => (k === "all" ? counts.total : counts[k]);
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === t.key
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-gray-600 hover:text-gray-900"
          )}
        >
          {t.label} <span className="text-gray-400">({count(t.key)})</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Реализовать RejectModal**

```typescript
// src/components/admin/RejectModal.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function RejectModal({
  userName,
  onConfirm,
  onCancel,
}: {
  userName: string;
  onConfirm: (reason: string | undefined) => Promise<void>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold">Отклонить заявку — {userName}</h2>
        <div className="space-y-1">
          <Label>Причина (опционально)</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-sm min-h-[80px]"
            placeholder="Например: не соответствует профилю"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              setSubmitting(true);
              try {
                await onConfirm(reason.trim() || undefined);
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? "Отклоняем…" : "Отклонить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Реализовать UserCard**

```typescript
// src/components/admin/UserCard.tsx
"use client";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatDate(ms: number | null | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("ru-RU");
}

export function UserCard({
  user,
  onApprove,
  onReject,
}: {
  user: Doc<"users">;
  onApprove: () => void;
  onReject: () => void;
}) {
  const verified = !!user.emailVerifiedAt;
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{user.name || "(без имени)"}</h3>
          <div className="text-sm text-gray-500">
            {user.email} · {user.phone || "—"} · {user.businessName || "—"}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {verified ? (
            <Badge>EMAIL ✓</Badge>
          ) : (
            <Badge variant="secondary">NOT VERIFIED</Badge>
          )}
          <Badge variant="outline">
            WB·{user.shopsCountWB ?? 0} + OZ·{user.shopsCountOzon ?? 0} ·{" "}
            {user.skuCount ?? 0} SKU
          </Badge>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Регистрация: {formatDate(user.createdAt)} · Email подтверждён:{" "}
        {formatDate(user.emailVerifiedAt)}
        {user.status === "rejected" && user.rejectionReason && (
          <> · Причина отклонения: {user.rejectionReason}</>
        )}
      </div>
      {user.status === "pending" && (
        <div className="flex gap-2">
          <Button onClick={onApprove} disabled={!verified}>
            Одобрить
          </Button>
          <Button variant="destructive" onClick={onReject}>
            Отклонить
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run test**

Run: `npx vitest run src/components/admin/UserCard.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/
git commit -m "feat(admin): StatusTabs + RejectModal + UserCard (A.3)"
```

---

### Task 8: /admin/users page

**Files:**
- Create: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Реализовать страницу**

```typescript
// src/app/admin/users/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  adminUsersListByStatusRef,
  adminUsersCountsByStatusRef,
  adminApproveUserRef,
  adminRejectUserRef,
} from "@/lib/convex-refs";
import { AdminGate } from "@/components/auth/AdminGate";
import { StatusTabs } from "@/components/admin/StatusTabs";
import { UserCard } from "@/components/admin/UserCard";
import { RejectModal } from "@/components/admin/RejectModal";
import { Input } from "@/components/ui/input";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

type Status = "pending" | "approved" | "rejected" | "all";

function AdminUsersInner() {
  const [tab, setTab] = useState<Status>("pending");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Doc<"users"> | null>(null);

  const users = useQuery(adminUsersListByStatusRef, {
    status: tab === "all" ? undefined : tab,
    search: search.trim() || undefined,
  });
  const counts = useQuery(adminUsersCountsByStatusRef, {});
  const approve = useMutation(adminApproveUserRef);
  const reject = useMutation(adminRejectUserRef);

  return (
    <div className="max-w-screen-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Заявки пользователей</h1>
        <p className="text-sm text-gray-500">
          Одобрение / отклонение регистраций. Доступно только администратору.
        </p>
      </div>
      <Input
        placeholder="Поиск по email / имени / телефону"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <StatusTabs
        active={tab}
        counts={counts ?? { total: 0, pending: 0, approved: 0, rejected: 0 }}
        onChange={setTab}
      />
      <div className="space-y-3">
        {users === undefined ? (
          <div className="text-gray-400 py-12 text-center">Загрузка…</div>
        ) : users.length === 0 ? (
          <div className="text-gray-400 py-12 text-center">Пусто</div>
        ) : (
          users.map((u) => (
            <UserCard
              key={u._id}
              user={u}
              onApprove={async () => {
                await approve({ userId: u._id as Id<"users"> });
              }}
              onReject={() => setRejectTarget(u)}
            />
          ))
        )}
      </div>
      {rejectTarget && (
        <RejectModal
          userName={rejectTarget.name || rejectTarget.email || ""}
          onCancel={() => setRejectTarget(null)}
          onConfirm={async (reason) => {
            await reject({
              userId: rejectTarget._id as Id<"users">,
              reason,
            });
            setRejectTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminGate>
      <AdminUsersInner />
    </AdminGate>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: оба проходят.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/users/page.tsx
git commit -m "feat(admin): /admin/users page (A.3)"
```

---

## Phase 3: /org/team

### Task 9: MemberRow + InviteModal + PendingInviteRow + TransferOwnershipModal

**Files:**
- Create: `src/components/org/MemberRow.tsx`
- Create: `src/components/org/PendingInviteRow.tsx`
- Create: `src/components/org/InviteModal.tsx`
- Create: `src/components/org/TransferOwnershipModal.tsx`
- Test: `src/components/org/MemberRow.test.tsx`

- [ ] **Step 1: Написать тест MemberRow**

```typescript
// src/components/org/MemberRow.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemberRow } from "./MemberRow";

describe("MemberRow", () => {
  it("renders name and email", () => {
    const { getByText } = render(
      <MemberRow
        member={{
          membershipId: "m1" as never,
          userId: "u1" as never,
          email: "a@b.com",
          name: "Иван",
          role: "member",
          joinedAt: 0,
        }}
        canManage={true}
        isSelf={false}
        onRemove={() => {}}
        onMakeOwner={() => {}}
      />
    );
    expect(getByText("Иван")).toBeTruthy();
    expect(getByText(/a@b.com/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/components/org/MemberRow.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реализовать MemberRow**

```typescript
// src/components/org/MemberRow.tsx
"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import type { TeamMember } from "@/lib/convex-refs";

export function MemberRow({
  member,
  canManage,
  isSelf,
  onRemove,
  onMakeOwner,
}: {
  member: TeamMember;
  canManage: boolean;
  isSelf: boolean;
  onRemove: () => void;
  onMakeOwner: () => void;
}) {
  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-md p-3">
      <div>
        <div className="font-medium">{member.name || "(без имени)"}</div>
        <div className="text-sm text-gray-500">{member.email}</div>
      </div>
      <div className="flex items-center gap-2">
        {member.role === "owner" ? (
          <Badge>{isSelf ? "Вы — owner" : "Owner"}</Badge>
        ) : (
          <Badge variant="secondary">Member</Badge>
        )}
        {canManage && member.role === "member" && (
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-gray-100 rounded">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onMakeOwner}>
                Сделать владельцем
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRemove}>
                Удалить из команды
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Реализовать PendingInviteRow**

```typescript
// src/components/org/PendingInviteRow.tsx
"use client";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PendingInviteRow({
  invite,
  onResend,
  onRevoke,
}: {
  invite: Doc<"invites">;
  onResend: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center justify-between border border-dashed border-gray-300 rounded-md p-3">
      <div>
        <div className="text-sm">{invite.email}</div>
        <div className="text-xs text-gray-500">
          Приглашение действительно до{" "}
          {new Date(invite.expiresAt).toLocaleDateString("ru-RU")}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">pending</Badge>
        <Button variant="outline" size="sm" onClick={onResend}>
          Отправить повторно
        </Button>
        <Button variant="destructive" size="sm" onClick={onRevoke}>
          Отозвать
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Реализовать InviteModal**

```typescript
// src/components/org/InviteModal.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (email: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          try {
            await onConfirm(email.trim());
          } catch (err) {
            setError((err as Error).message || "Ошибка отправки");
          } finally {
            setSubmitting(false);
          }
        }}
        className="bg-white rounded-lg max-w-md w-full p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold">Пригласить в команду</h2>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Отправляем…" : "Отправить приглашение"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Реализовать TransferOwnershipModal**

```typescript
// src/components/org/TransferOwnershipModal.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TransferOwnershipModal({
  targetName,
  onConfirm,
  onCancel,
}: {
  targetName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold">Передать владение</h2>
        <p className="text-sm text-gray-700">
          Подтвердите передачу владения организацией пользователю{" "}
          <strong>{targetName}</strong>. После передачи вы станете обычным
          членом команды.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Отмена
          </Button>
          <Button
            onClick={async () => {
              setSubmitting(true);
              try {
                await onConfirm();
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? "Передаём…" : "Подтвердить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run test**

Run: `npx vitest run src/components/org/MemberRow.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/org/
git commit -m "feat(org): MemberRow + invite/transfer modals (A.3)"
```

---

### Task 10: /org/team page

**Files:**
- Create: `src/app/org/team/page.tsx`

- [ ] **Step 1: Реализовать страницу**

```typescript
// src/app/org/team/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  orgTeamListMembersRef,
  orgTeamRemoveMemberRef,
  orgTeamLeaveRef,
  orgTeamTransferOwnershipRef,
  orgInvitesListRef,
  orgInviteCreateRef,
  orgInviteRevokeRef,
  orgInviteResendRef,
  type TeamMember,
} from "@/lib/convex-refs";
import { AuthGate } from "@/components/auth/AuthGate";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MemberRow } from "@/components/org/MemberRow";
import { PendingInviteRow } from "@/components/org/PendingInviteRow";
import { InviteModal } from "@/components/org/InviteModal";
import { TransferOwnershipModal } from "@/components/org/TransferOwnershipModal";
import { Button } from "@/components/ui/button";

function TeamInner() {
  const org = useCurrentOrg();
  const me = useCurrentUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<TeamMember | null>(
    null
  );

  const members = useQuery(
    orgTeamListMembersRef,
    org ? { orgId: org.orgId } : "skip"
  );
  const invites = useQuery(
    orgInvitesListRef,
    org && org.role === "owner" ? { orgId: org.orgId } : "skip"
  );
  const createInvite = useMutation(orgInviteCreateRef);
  const revokeInvite = useMutation(orgInviteRevokeRef);
  const resendInvite = useMutation(orgInviteResendRef);
  const removeMember = useMutation(orgTeamRemoveMemberRef);
  const leaveOrg = useMutation(orgTeamLeaveRef);
  const transferOwnership = useMutation(orgTeamTransferOwnershipRef);

  if (org === undefined || members === undefined || !me) {
    return (
      <div className="text-gray-400 py-12 text-center">Загрузка…</div>
    );
  }
  if (org === null) {
    return (
      <div className="max-w-screen-md mx-auto p-6 text-gray-500">
        У вас нет организации. Свяжитесь с администратором или примите приглашение.
      </div>
    );
  }
  const isOwner = org.role === "owner";

  return (
    <div className="max-w-screen-md mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-sm text-gray-500">Команда организации</p>
        </div>
        {isOwner && (
          <Button onClick={() => setInviteOpen(true)}>+ Пригласить</Button>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Участники</h2>
        {members.map((m) => (
          <MemberRow
            key={m.membershipId}
            member={m}
            canManage={isOwner}
            isSelf={m.userId === me._id}
            onRemove={async () => {
              if (confirm(`Удалить ${m.name || m.email} из команды?`)) {
                await removeMember({ membershipId: m.membershipId });
              }
            }}
            onMakeOwner={() => setTransferTarget(m)}
          />
        ))}
        {!isOwner && (
          <Button
            variant="outline"
            onClick={async () => {
              if (confirm("Покинуть организацию?")) {
                await leaveOrg({ orgId: org.orgId });
              }
            }}
          >
            Покинуть организацию
          </Button>
        )}
      </section>

      {isOwner && invites && invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">
            Pending приглашения
          </h2>
          {invites.map((inv) => (
            <PendingInviteRow
              key={inv._id}
              invite={inv}
              onResend={async () => {
                await resendInvite({ inviteId: inv._id });
              }}
              onRevoke={async () => {
                if (confirm(`Отозвать приглашение для ${inv.email}?`)) {
                  await revokeInvite({ inviteId: inv._id });
                }
              }}
            />
          ))}
        </section>
      )}

      {inviteOpen && (
        <InviteModal
          onCancel={() => setInviteOpen(false)}
          onConfirm={async (email) => {
            await createInvite({ orgId: org.orgId, email });
            setInviteOpen(false);
          }}
        />
      )}
      {transferTarget && (
        <TransferOwnershipModal
          targetName={transferTarget.name || transferTarget.email}
          onCancel={() => setTransferTarget(null)}
          onConfirm={async () => {
            await transferOwnership({
              orgId: org.orgId,
              newOwnerMembershipId: transferTarget.membershipId,
            });
            setTransferTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default function TeamPage() {
  return (
    <AuthGate>
      <TeamInner />
    </AuthGate>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/org/team/page.tsx
git commit -m "feat(org): /org/team page (A.3)"
```

---

## Phase 4: /org/settings

### Task 11: /org/settings page

**Files:**
- Create: `src/app/org/settings/page.tsx`

- [ ] **Step 1: Реализовать страницу**

```typescript
// src/app/org/settings/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { orgRenameRef } from "@/lib/convex-refs";
import { OwnerGate } from "@/components/auth/OwnerGate";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function OrgSettingsInner() {
  const org = useCurrentOrg();
  const rename = useMutation(orgRenameRef);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (org) setName(org.name);
  }, [org]);

  if (!org) return null;

  return (
    <div className="max-w-screen-sm mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Настройки организации</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          setSaved(false);
          try {
            await rename({ orgId: org.orgId, newName: name });
            setSaved(true);
          } catch (err) {
            setError((err as Error).message || "Ошибка сохранения");
          } finally {
            setSubmitting(false);
          }
        }}
        className="space-y-4"
      >
        <div className="space-y-1">
          <Label>Название организации</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            maxLength={100}
            required
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {saved && <div className="text-sm text-green-700">Сохранено.</div>}
        <Button type="submit" disabled={submitting || name.trim() === org.name}>
          {submitting ? "Сохраняем…" : "Сохранить"}
        </Button>
      </form>
    </div>
  );
}

export default function OrgSettingsPage() {
  return (
    <OwnerGate>
      <OrgSettingsInner />
    </OwnerGate>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/org/settings/page.tsx
git commit -m "feat(org): /org/settings rename page (A.3)"
```

---

## Phase 5: /invite/[token]

### Task 12: /invite/[token] page — token validation + branching

**Files:**
- Create: `src/app/invite/[token]/page.tsx`

- [ ] **Step 1: Реализовать страницу с 4 ветками**

```typescript
// src/app/invite/[token]/page.tsx
"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  orgInviteByTokenRef,
  orgInviteAcceptRef,
} from "@/lib/convex-refs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageProps = { params: Promise<{ token: string }> };

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Приглашение не найдено",
  expired: "Приглашение истекло",
  revoked: "Приглашение было отозвано",
  already_accepted: "Приглашение уже принято",
};

export default function InvitePage({ params }: PageProps) {
  const { token } = use(params);
  const inviteResult = useQuery(orgInviteByTokenRef, { token });
  const me = useCurrentUser();
  const router = useRouter();
  const acceptInvite = useMutation(orgInviteAcceptRef);
  const { signIn, signOut } = useAuthActions();

  // signUp form state (новый юзер)
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  // signIn form state (existing email)
  const [signInPassword, setSignInPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (inviteResult === undefined || me === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Загрузка…
      </div>
    );
  }

  if (!inviteResult.ok) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-3">
        <h1 className="text-xl font-bold">{ERROR_MESSAGES[inviteResult.error]}</h1>
        <p className="text-sm text-gray-600">
          Попросите owner-а отправить приглашение заново.
        </p>
        <Link href="/login" className="text-violet-600 hover:underline text-sm">
          На главную
        </Link>
      </div>
    );
  }

  const { email: inviteEmail, orgName, inviterName } = inviteResult.invite;

  // Branch 1: уже залогинен под другим email
  if (me && me.email !== inviteEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-3">
        <h1 className="text-xl font-bold">Этот инвайт для другого email</h1>
        <p className="text-sm text-gray-600">
          Приглашение отправлено на <strong>{inviteEmail}</strong>, но вы вошли как{" "}
          <strong>{me.email}</strong>. Выйдите и откройте ссылку под нужным
          аккаунтом.
        </p>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            router.refresh();
          }}
        >
          Выйти
        </Button>
      </div>
    );
  }

  // Branch 2: уже залогинен как invitee — confirm button
  if (me && me.email === inviteEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-3">
        <h1 className="text-xl font-bold">Приглашение в {orgName}</h1>
        <p className="text-sm text-gray-600">
          {inviterName} приглашает вас присоединиться к организации{" "}
          <strong>{orgName}</strong>.
        </p>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              await acceptInvite({ token });
              router.push("/");
            } catch (err) {
              setError((err as Error).message || "Ошибка");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Принимаем…" : "Принять приглашение"}
        </Button>
      </div>
    );
  }

  // Не залогинен — нужно решить, новая регистрация или signIn.
  // Решает сама форма: предлагаем sign up. Если юзер уже зарегистрирован,
  // signIn вернёт ошибку → переключаемся на signIn-форму.
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn("password", {
        email: inviteEmail,
        password,
        name,
        phone,
        businessName: businessName || "",
        flow: "signUp",
      });
      await acceptInvite({ token });
      router.push("/");
    } catch (err) {
      setError((err as Error).message || "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn("password", {
        email: inviteEmail,
        password: signInPassword,
        flow: "signIn",
      });
      await acceptInvite({ token });
      router.push("/");
    } catch (err) {
      setError((err as Error).message || "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold">Приглашение в {orgName}</h1>
        <p className="text-sm text-gray-600">
          {inviterName} зовёт вас в команду. Email: <strong>{inviteEmail}</strong>
        </p>
      </div>

      <details className="border border-gray-200 rounded-md p-4 space-y-3" open>
        <summary className="font-medium cursor-pointer">
          У меня нет аккаунта — создать
        </summary>
        <form onSubmit={handleSignUp} className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={inviteEmail} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-1">
            <Label>Пароль</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1">
            <Label>Имя</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Телефон</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Название бизнеса (опционально)</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Создаём…" : "Создать аккаунт и принять"}
          </Button>
        </form>
      </details>

      <details className="border border-gray-200 rounded-md p-4 space-y-3">
        <summary className="font-medium cursor-pointer">
          У меня уже есть аккаунт — войти
        </summary>
        <form onSubmit={handleSignIn} className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={inviteEmail} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-1">
            <Label>Пароль</Label>
            <Input
              type="password"
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Входим…" : "Войти и принять"}
          </Button>
        </form>
      </details>

      {error && <div className="text-sm text-red-600 text-center">{error}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/invite/[token]/page.tsx
git commit -m "feat(invite): /invite/[token] page with 4 branches (A.3)"
```

---

## Phase 6: TopNav extensions

### Task 13: OrgSwitcher component

**Files:**
- Create: `src/components/nav/OrgSwitcher.tsx`
- Test: `src/components/nav/OrgSwitcher.test.tsx`

> **Замечание:** В A.3 у нас MVP single-org-per-user, но invitee → multi-org. Поэтому OrgSwitcher показывается только при ≥2 org. Активная org берётся из `useCurrentOrg` (первая в списке). Переключение пока хранится локально через состояние страницы (полная реализация контекста — отложено до B/C, тут только UI).

- [ ] **Step 1: Написать тест**

```typescript
// src/components/nav/OrgSwitcher.test.tsx
import { describe, it, expect } from "vitest";
import { OrgSwitcher } from "./OrgSwitcher";

describe("OrgSwitcher", () => {
  it("is exported as a component", () => {
    expect(typeof OrgSwitcher).toBe("function");
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/components/nav/OrgSwitcher.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реализовать OrgSwitcher**

```typescript
// src/components/nav/OrgSwitcher.tsx
"use client";
import { useQuery } from "convex/react";
import { orgListMineRef } from "@/lib/convex-refs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

/**
 * Селектор org. Показывается только при ≥2 org-ах (single-org case
 * обрабатывается выше — компонент возвращает null).
 *
 * Активная org-а в текущем MVP всегда первая из списка (см. useCurrentOrg).
 * Переключение в этом тикете не реализуется — компонент только UI-показ
 * списка для будущих фаз (B/C).
 */
export function OrgSwitcher() {
  const orgs = useQuery(orgListMineRef);
  if (!orgs || orgs.length < 2) return null;
  const active = orgs[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm px-2 py-1 hover:bg-gray-100 rounded-md">
        {active.name} <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {orgs.map((o) => (
          <DropdownMenuItem key={o.orgId}>
            {o.name}
            {o.orgId === active.orgId && (
              <span className="ml-2 text-xs text-violet-600">·</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/components/nav/OrgSwitcher.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/nav/OrgSwitcher.tsx src/components/nav/OrgSwitcher.test.tsx
git commit -m "feat(nav): OrgSwitcher component (A.3)"
```

---

### Task 14: TopNav — admin / team links + OrgSwitcher

**Files:**
- Modify: `src/components/nav/TopNav.tsx`
- Modify: `src/components/nav/TopNav.test.tsx`

- [ ] **Step 1: Прочитать существующий TopNav.tsx (уже сделано). Модифицировать `import` блок и `right side` секцию**

Заменить блок `Settings + user menu` (между `<span>Ozon ...</span>` и закрывающим `</div></header>`) на:

```typescript
import { OrgSwitcher } from "./OrgSwitcher";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
// ... existing imports
```

Затем внутри `<TopNav>` после `</span>` (Ozon disabled placeholder) до `<div className="ml-auto ...">`:

```typescript
const org = useCurrentOrg();
const isOwner = org?.role === "owner";
const isAdmin = user?.isSystemAdmin === true;
```

И в `<div className="ml-auto flex items-center gap-3">` добавить ссылки **до** `<Link href="/settings"`:

```tsx
<OrgSwitcher />
{isOwner && (
  <Link
    href="/org/team"
    className="text-sm text-gray-500 hover:text-gray-700"
  >
    Команда
  </Link>
)}
{isAdmin && (
  <Link
    href="/admin/users"
    className="text-sm text-violet-600 hover:underline"
  >
    Админ
  </Link>
)}
```

- [ ] **Step 2: Полный TopNav.tsx после изменений (для справки):**

```typescript
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useAuthActions } from "@convex-dev/auth/react";
import { OrgSwitcher } from "./OrgSwitcher";

const WB_MENU = [
  { label: "Дашборд", href: "/" },
  { label: "Рука на пульсе", href: "/pulse" },
  { label: "Аналитика продаж", href: "/analytics" },
  { label: "Товары", href: "/products" },
  { label: "Финансовые отчеты", href: "/financials" },
  { label: "Отзывы и вопросы", href: "/feedbacks" },
  { label: "Возвраты", href: "/returns" },
  { label: "Цены", href: "/prices" },
];

export function TopNav() {
  const pathname = usePathname();
  const isWbActive = WB_MENU.some((item) => pathname === item.href);
  const user = useCurrentUser();
  const org = useCurrentOrg();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const isOwner = org?.role === "owner";
  const isAdmin = user?.isSystemAdmin === true;
  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-violet-600">
          Finly
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition-colors",
              isWbActive
                ? "bg-violet-50 text-violet-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            Wildberries <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {WB_MENU.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full cursor-pointer",
                    pathname === item.href && "text-violet-700 font-medium"
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-sm text-gray-400 cursor-not-allowed flex items-center gap-1">
          Ozon <ChevronDown className="h-4 w-4" />
        </span>

        <div className="ml-auto flex items-center gap-3">
          <OrgSwitcher />
          {isOwner && (
            <Link
              href="/org/team"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Команда
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/users"
              className="text-sm text-violet-600 hover:underline"
            >
              Админ
            </Link>
          )}
          <Link
            href="/settings"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
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
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/components/nav/TopNav.test.tsx && npm run typecheck`
Expected: existing TopNav test still passes (просто проверяет export); typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/nav/TopNav.tsx
git commit -m "feat(nav): admin + team links + org switcher in TopNav (A.3)"
```

---

## Phase 7: Smoke + final QA

### Task 15: Smoke-test полного A.3 flow через Convex CLI

**Files:**
- (none — ручной + Convex run)

> **Контекст:** dev deployment `energized-wolverine-691`. Юрий — `nh71v60nrmh27mpekw2em9jj2h85mcbw`, approved + isSystemAdmin. Email доставка живая (`Finly <noreply@finly-app.ru>`). Создаём тестового pending-юзера, прогоняем approve → invite flow.

- [ ] **Step 1: Создать тестовый pending-юзер через UI или signUp action**

Через UI: открой `/register` под чистой сессией, зарегистрируй `test-a3@example.com`. Pending-юзер создаётся.
Через CLI: `npx convex run "auth/registerUser:registerUser" '{"email":"test-a3@example.com","password":"qwerty12345","name":"Тест A3","phone":"+71234567890","businessName":"ООО Тест"}'` (если такая mutation существует — проверь в `convex/auth/`).

Получить `userId` тестового юзера: `npx convex data users | grep test-a3`.

- [ ] **Step 2: Проставить emailVerifiedAt вручную (Resend dev — письма приходят, но проще скриптом)**

```bash
npx convex run "users:setEmailVerified" '{"userId":"<userId>"}'
```

(Если такой mutation нет — добавить тестовый internalMutation временно или использовать `convex/auth/verifyEmail.ts`).

- [ ] **Step 3: Зайти на `/admin/users` под Юрием (isSystemAdmin)**

Открой http://localhost:3001/admin/users. Должна быть видна вкладка «Ожидают» с тестовым юзером, кнопка «Одобрить» активна (т.к. emailVerifiedAt set).

- [ ] **Step 4: Нажать «Одобрить» → проверить в Resend**

```bash
sleep 3 && curl -s -H "Authorization: Bearer $(npx convex env get RESEND_API_KEY)" "https://api.resend.com/emails?limit=1" | python3 -m json.tool | head -20
```

Expected: последнее письмо — «Заявка одобрена — Finly» на `test-a3@example.com`.

- [ ] **Step 5: Под Юрием на `/org/team` пригласить `invite-test@example.com`**

Открыть `/org/team` (Юрий — owner Finly org-а). Кнопка «+ Пригласить» → email → отправить.
Получить токен: `npx convex data invites | grep invite-test`.

- [ ] **Step 6: Открыть `/invite/<token>` в incognito-окне**

Должен показаться signUp branch (т.к. email не зарегистрирован). Заполнить пароль/имя/телефон → submit. Должен редиректнуть на `/`.

- [ ] **Step 7: Проверить что invitee стал approved+member**

```bash
npx convex data users | grep invite-test
npx convex data memberships | grep <invitee userId>
```

Expected: `status=approved`, `memberships{role:"member", orgId=<Finly org>}`.

- [ ] **Step 8: Нет коммита — это ручной QA. Просто отметить здесь:**

> Все 4 ветки (`signUp`, `signIn`, `accept-as-invitee`, `wrong-email`) можно проверить точечно на этом же токене через cleanup и повтор через `npx convex data invites` + `revokeInvite` + `createInvite`.

---

### Task 16: Финальный typecheck + tests + build

**Files:**
- (none — only verification)

- [ ] **Step 1: Запустить полный набор**

```bash
npm test && npm run typecheck && npm run build
```

Expected: всё зелёное.

- [ ] **Step 2: Проверить deploy на Convex dev**

```bash
npx convex dev --once
```

Expected: `Convex functions ready!` без ошибок.

- [ ] **Step 3: Финальный commit (если что-то изменилось от tests/lint)**

```bash
git add -A
git commit -m "chore: final A.3 verification" || echo "ничего не изменилось — пропускаем"
```

- [ ] **Step 4: Push**

```bash
git push origin mfa-a2-auth-ui
```

> **Не сливаем в master** — A.3 идёт поверх A.2 в той же PR-ветке, ревью отдельным проходом. После A.4 → ребейз/мердж master целиком.

---

## Spec coverage checklist

- [x] /admin/users с табами и счётчиками — Task 7-8
- [x] Approve кнопка disabled пока не verify — Task 7 (UserCard.tsx: `disabled={!verified}`)
- [x] Reject с опциональной причиной — Task 7 (RejectModal.tsx)
- [x] /org/team owner-only invite UI — Task 9-10
- [x] Все 4 ветки `/invite/:token` — Task 12
- [x] Передача ownership в одной транзакции — Task 9 (TransferOwnershipModal вызывает `transferOwnership` mutation, она атомарна на стороне Convex)
- [x] Owner не может удалить себя / leave — Task 9-10 (`leaveOrg` button скрыт для owner; backend дополнительно throw)
- [x] OrgSwitcher при ≥2 org — Task 13-14
- [x] Admin link в TopNav — Task 14
- [x] Owner team link в TopNav — Task 14
- [x] Smoke pass — Task 15

**Out of scope (per roadmap):**
- Theme toggle (orange-black) → A.4
- Массовые действия в админке → не в A
- Audit-лог удалений → не в MVP
- Полноценный orgId-context для multi-org switching → отложено в B/C
