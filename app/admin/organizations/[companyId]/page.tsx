import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import {
  COMPANY_TYPE_OPTIONS,
  MEMBERSHIP_PLAN_OPTIONS,
  MEMBERSHIP_STATUS_OPTIONS,
} from "@/lib/adminControlPlane";
import { updateOrganizationAction, updateOrganizationMembershipAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const organization = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      Subject: {
        include: {
          MembershipSubscription: true,
        },
      },
      User: {
        orderBy: { email: "asc" },
        select: { id: true, email: true, role: true },
      },
      Product: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, active: true },
      },
      PilotCohortMember: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          dataBoundary: true,
          provisioningState: true,
          memberKind: true,
          inviteEmail: true,
          ownerContactName: true,
          ownerContactEmail: true,
          supportContactName: true,
          supportContactEmail: true,
          PilotCohort: {
            select: { name: true, startsAt: true },
          },
        },
      },
      SurveySubmission: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          score: true,
          createdAt: true,
          SurveyModule: {
            select: { title: true },
          },
        },
      },
    },
  });

  if (!organization) {
    notFound();
  }

  const subscription = organization.Subject?.MembershipSubscription[0] ?? null;

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title={organization.name}
        description="Company detail, membership control, linked users, products, and recent PAT submission activity."
      />

      <AdminPanel title="Organization settings">
        <form action={updateOrganizationAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="companyId" value={organization.id} />
          <input type="hidden" name="returnTo" value={`/admin/organizations/${organization.id}`} />
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--shell-ink)]">Name</span>
            <input name="name" defaultValue={organization.name} className="pat-input" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--shell-ink)]">Type</span>
            <select name="type" defaultValue={organization.type} className="pat-select">
              {COMPANY_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="pat-button-primary">
              Save organization
            </button>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="Company-backed membership">
        <form action={updateOrganizationMembershipAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input type="hidden" name="companyId" value={organization.id} />
          <input type="hidden" name="returnTo" value={`/admin/organizations/${organization.id}`} />
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--shell-ink)]">Plan</span>
            <select name="plan" defaultValue={subscription?.plan ?? "FREE"} className="pat-select">
              {MEMBERSHIP_PLAN_OPTIONS.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--shell-ink)]">Status</span>
            <select name="status" defaultValue={subscription?.status ?? "ACTIVE"} className="pat-select">
              {MEMBERSHIP_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="pat-button-primary">
              Save membership
            </button>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="Billing reconciliation state" description="Provider subscription truth and the last webhook reconciliation proof for this company subject.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
            <div className="pat-label">Provider</div>
            <div className="mt-2 font-semibold text-[var(--shell-ink)]">{subscription?.provider ?? "none"}</div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">{subscription?.externalCustomerRef ?? "No provider customer"}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
            <div className="pat-label">Subscription</div>
            <div className="mt-2 font-semibold text-[var(--shell-ink)]">{subscription?.providerStatus ?? "unreconciled"}</div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">{subscription?.externalSubscriptionRef ?? "No provider subscription"}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
            <div className="pat-label">Last event</div>
            <div className="mt-2 font-semibold text-[var(--shell-ink)]">{subscription?.lastBillingEventType ?? "none"}</div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">{subscription?.lastBillingEventAt ? subscription.lastBillingEventAt.toLocaleString() : "No event timestamp"}</div>
          </div>
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
            <div className="pat-label">Webhook proof</div>
            <div className="mt-2 font-semibold text-[var(--shell-ink)]">{subscription?.lastWebhookEventId ?? "none"}</div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">{subscription?.lastReconciledAt ? subscription.lastReconciledAt.toLocaleString() : "Never reconciled"}</div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Pilot cohort boundary"
        description="Pilot membership is tracked independently from deterministic demo readiness and production customer behavior."
      >
        {organization.PilotCohortMember.length > 0 ? (
          <div className="grid gap-4">
            {organization.PilotCohortMember.map((membership) => (
              <div key={membership.id} className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{membership.PilotCohort.name}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  {membership.memberKind} · {membership.dataBoundary} · {membership.provisioningState} · Starts {membership.PilotCohort.startsAt ? membership.PilotCohort.startsAt.toLocaleDateString() : "unscheduled"}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                  Invite {membership.inviteEmail ?? "none"} · Owner {membership.ownerContactName ?? "unassigned"} {membership.ownerContactEmail ?? ""} · Support {membership.supportContactName ?? "unassigned"} {membership.supportContactEmail ?? ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4 text-sm text-[var(--shell-muted)]">
            No pilot cohort membership is assigned to this organization.
          </div>
        )}
      </AdminPanel>

      <section className="grid gap-6 xl:grid-cols-3">
        <AdminPanel title="Users">
          <div className="grid gap-3">
            {organization.User.map((user) => (
              <Link key={user.id} href="/admin/users" className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{user.email}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">{user.role}</div>
              </Link>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Products">
          <div className="grid gap-3">
            {organization.Product.map((product) => (
              <Link key={product.id} href={`/admin/products/${product.id}`} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{product.name}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">{product.active ? "Active" : "Inactive"}</div>
              </Link>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Recent PAT submissions">
          <div className="grid gap-3">
            {organization.SurveySubmission.map((submission) => (
              <div key={submission.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{submission.SurveyModule.title}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  Raw score <strong className="font-semibold text-[var(--shell-ink)]">{submission.score}%</strong> · {submission.createdAt.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </section>
    </div>
  );
}
