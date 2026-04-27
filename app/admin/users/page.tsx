import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { MEMBERSHIP_PLAN_OPTIONS, MEMBERSHIP_STATUS_OPTIONS } from "@/lib/adminControlPlane";
import { updateUserContextAction, updateUserMembershipAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, organizations, personSubjects] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { email: "asc" }],
      include: {
        Company: {
          select: { id: true, name: true, type: true },
        },
      },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: { kind: "PERSON" },
      select: {
        key: true,
        MembershipSubscription: {
          select: {
            plan: true,
            status: true,
            provider: true,
            providerStatus: true,
            lastBillingEventType: true,
            lastReconciledAt: true,
          },
        },
      },
    }).catch(() => []),
  ]);

  const personSubjectByKey = new Map(personSubjects.map((subject) => [subject.key, subject]));

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Users"
        description="Operator controls for role assignment, company linkage, and individual membership state."
      />

      <AdminPanel title="User oversight">
        <div className="grid gap-4">
          {users.map((user) => {
            const individualMembership =
              personSubjectByKey.get(`person:${user.id}`)?.MembershipSubscription[0] ?? null;
            return (
              <div key={user.id} className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5">
                <div className="mb-4">
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{user.email}</div>
                  <div className="mt-1 text-sm text-[var(--shell-muted)]">
                    {user.role} · {user.Company ? `${user.Company.name} (${user.Company.type})` : "No company linked"} · Individual membership {individualMembership ? `${individualMembership.plan} / ${individualMembership.status}` : "FREE / ACTIVE"}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                    Billing {individualMembership?.provider ?? "none"} · Provider status {individualMembership?.providerStatus ?? "unreconciled"} · Last event {individualMembership?.lastBillingEventType ?? "none"} · Reconciled {individualMembership?.lastReconciledAt ? individualMembership.lastReconciledAt.toLocaleString() : "never"}
                  </div>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <form action={updateUserContextAction} className="grid gap-3 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="returnTo" value="/admin/users" />
                    <div className="text-sm font-semibold text-[var(--shell-ink)]">Role and company</div>
                    <select name="role" defaultValue={user.role} className="pat-select">
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="MEMBER">MEMBER</option>
                    </select>
                    <select name="companyId" defaultValue={user.companyId ?? "__none__"} className="pat-select">
                      <option value="__none__">No company</option>
                      {organizations.map((organization) => (
                        <option key={organization.id} value={organization.id}>
                          {organization.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="pat-button-primary">
                      Save user context
                    </button>
                  </form>

                  <form action={updateUserMembershipAction} className="grid gap-3 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="returnTo" value="/admin/users" />
                    <div className="text-sm font-semibold text-[var(--shell-ink)]">Individual membership</div>
                    <select name="plan" defaultValue={individualMembership?.plan ?? "FREE"} className="pat-select">
                      {MEMBERSHIP_PLAN_OPTIONS.map((plan) => (
                        <option key={plan} value={plan}>
                          {plan}
                        </option>
                      ))}
                    </select>
                    <select name="status" defaultValue={individualMembership?.status ?? "ACTIVE"} className="pat-select">
                      {MEMBERSHIP_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="pat-button-secondary">
                      Save individual membership
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </AdminPanel>
    </div>
  );
}
