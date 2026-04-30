"use client";
import { useState, type ReactNode } from "react";
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
import {
  FinlyButton,
  FinlyCard,
  FinlyDataTable,
  FinlyEmptyState,
} from "@/components/finly";
import { LogOut, MailPlus } from "lucide-react";

type RenderRow = {
  id: string;
  render: ReactNode;
};

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
    return <div className="py-12 text-center text-muted-foreground">Загрузка…</div>;
  }
  if (org === null) {
    return (
      <FinlyEmptyState
        pose="empty-data"
        title="Организация не найдена"
        body="Свяжитесь с администратором или примите приглашение в команду."
      />
    );
  }
  const isOwner = org.role === "owner";

  const memberRows: RenderRow[] = members.map((member) => ({
    id: member.membershipId,
    render: (
      <MemberRow
        member={member}
        canManage={isOwner}
        isSelf={member.userId === me._id}
        onRemove={async () => {
          if (confirm(`Удалить ${member.name || member.email} из команды?`)) {
            await removeMember({ membershipId: member.membershipId });
          }
        }}
        onMakeOwner={() => setTransferTarget(member)}
      />
    ),
  }));

  const inviteRows: RenderRow[] = (invites ?? []).map((invite) => ({
    id: invite._id,
    render: (
      <PendingInviteRow
        invite={invite}
        onResend={async () => {
          await resendInvite({ inviteId: invite._id });
        }}
        onRevoke={async () => {
          if (confirm(`Отозвать приглашение для ${invite.email}?`)) {
            await revokeInvite({ inviteId: invite._id });
          }
        }}
      />
    ),
  }));

  return (
    <div className="mx-auto max-w-screen-lg space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {org.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Команда организации и активные приглашения.
          </p>
        </div>
        {isOwner && (
          <FinlyButton onClick={() => setInviteOpen(true)}>
            <MailPlus className="mr-2 h-4 w-4" />
            Пригласить
          </FinlyButton>
        )}
      </div>

      <FinlyCard accent="teal" className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Участники</h2>
          <p className="text-sm text-muted-foreground">
            Владельцы управляют приглашениями, ролями и доступом к магазинам.
          </p>
        </div>
        <FinlyDataTable
          rows={memberRows}
          rowKey={(row) => row.id}
          columns={[
            {
              key: "member",
              header: "Участник",
              render: (row) => row.render,
            },
          ]}
        />
        {!isOwner && (
          <div className="flex justify-end">
            <FinlyButton
              variant="ghost"
              className="text-rune-danger"
              onClick={async () => {
                if (confirm("Покинуть организацию?")) {
                  await leaveOrg({ orgId: org.orgId });
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Покинуть организацию
            </FinlyButton>
          </div>
        )}
      </FinlyCard>

      {isOwner && (
        <FinlyCard accent="gold" className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Pending приглашения
            </h2>
            <p className="text-sm text-muted-foreground">
              Неактивированные ссылки для новых участников.
            </p>
          </div>
          {invites === undefined ? (
            <div className="py-8 text-center text-muted-foreground">Загрузка…</div>
          ) : (
            <FinlyDataTable
              rows={inviteRows}
              rowKey={(row) => row.id}
              empty={
                <FinlyEmptyState
                  pose="empty-data"
                  title="Приглашений нет"
                  body="Новые приглашения появятся здесь после отправки."
                  cta={{ label: "Пригласить", onClick: () => setInviteOpen(true) }}
                />
              }
              columns={[
                {
                  key: "invite",
                  header: "Приглашение",
                  render: (row) => row.render,
                },
              ]}
            />
          )}
        </FinlyCard>
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
