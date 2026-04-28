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
import { FinlyCard, FinlyEmptyState } from "@/components/finly";
import { Input } from "@/components/ui/input";
import { Search, ShieldCheck } from "lucide-react";
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
    <div className="mx-auto max-w-screen-lg space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-frame border border-gold-frame/40 bg-gold-frame/10 p-2 text-gold-frame">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Заявки пользователей
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Одобрение и отклонение регистраций. Доступно только администратору.
          </p>
        </div>
      </div>

      <FinlyCard accent="teal" className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Поиск по email / имени / телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <StatusTabs
          active={tab}
          counts={counts ?? { total: 0, pending: 0, approved: 0, rejected: 0 }}
          onChange={setTab}
        />
      </FinlyCard>

      <div className="space-y-3">
        {users === undefined ? (
          <div className="py-12 text-center text-muted-foreground">Загрузка…</div>
        ) : users.length === 0 ? (
          <FinlyCard accent="gold" className="p-0">
            <FinlyEmptyState
              pose="empty-data"
              title="Заявок нет"
              body="Пользователи появятся здесь после регистрации или смены фильтра."
            />
          </FinlyCard>
        ) : (
          users.map((user) => (
            <UserCard
              key={user._id}
              user={user}
              onApprove={async () => {
                await approve({ userId: user._id as Id<"users"> });
              }}
              onReject={() => setRejectTarget(user)}
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
