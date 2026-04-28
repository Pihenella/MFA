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
