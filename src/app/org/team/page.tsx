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
    return <div className="text-gray-400 py-12 text-center">Загрузка…</div>;
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
