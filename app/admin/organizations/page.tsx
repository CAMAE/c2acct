import Link from "next/link";
import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { COMPANY_TYPE_OPTIONS, MEMBERSHIP_PLAN_OPTIONS, MEMBERSHIP_STATUS_OPTIONS } from "@/lib/adminControlPlane";
import { createOrganizationAction, provisionOrganizationAccountAction } from "@/app/admin/actions";
import { PROVISION_ORG_KINDS } from "@/lib/provisioning/account";

export const dynamic = "force-dynamic";

const PROVISION_ERROR_COPY: Record<string, string> = {
  invalid_org_name: "Organization name is required.",
  invalid_org_kind: 'Organization kind must be "firm" or "vendor".',
  invalid_email: "Owner email is not a valid email address.",
  password_policy: "Temporary password must be at least 12 characters with lowercase, uppercase, and a number.",
  email_exists: "A user with that email already exists — manage it from /admin/users instead.",
};

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ provisioned?: string; provisionError?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const provisionedEmail = params.provisioned ?? null;
  const provisionError = params.provisionError ? (PROVISION_ERROR_COPY[params.provisionError] ?? "Provisioning failed.") : null;
  const organizations = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      Subject: {
        select: {
          id: true,
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
      },
      PilotCohortMember: {
        orderBy: { createdAt: "asc" },
        select: {
          dataBoundary: true,
          provisioningState: true,
          memberKind: true,
          PilotCohort: {
            select: { name: true },
          },
        },
      },
      _count: {
        select: {
          User: true,
          Product: true,
          SurveySubmission: true,
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Organizations"
        description="Operator oversight for firm and vendor companies, including company-backed membership state, linked users, and product activity."
      />

      <AdminPanel
        title="Provision account"
        description="Create a firm or vendor organization together with its owner user. The temporary credential must be rotated at first sign-in."
      >
        {provisionedEmail ? (
          <div className="mb-4 rounded-[12px] border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Provisioned organization and owner account for {provisionedEmail}. First-login password update is enforced.
          </div>
        ) : null}
        {provisionError ? (
          <div className="mb-4 rounded-[12px] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
            {provisionError}
          </div>
        ) : null}
        <form action={provisionOrganizationAccountAction} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="returnTo" value="/admin/organizations" />
          <input name="orgName" placeholder="Organization name" required className="pat-input" />
          <select name="orgKind" defaultValue="firm" className="pat-select">
            {PROVISION_ORG_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind === "firm" ? "Firm" : "Vendor"}
              </option>
            ))}
          </select>
          <input name="ownerEmail" type="email" placeholder="owner@example.com" required className="pat-input" />
          <input name="ownerName" placeholder="Owner display name (optional)" className="pat-input" />
          <input
            name="temporaryPassword"
            type="password"
            placeholder="Temporary password (12+ chars, Aa1)"
            required
            className="pat-input"
            autoComplete="new-password"
          />
          <button type="submit" className="pat-button-primary">
            Provision organization + owner
          </button>
        </form>
      </AdminPanel>

      <AdminPanel title="Create organization" description="Create a new firm or vendor company record.">
        <form action={createOrganizationAction} className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_auto]">
          <input type="hidden" name="returnTo" value="/admin/organizations" />
          <input name="name" placeholder="Organization name" required className="pat-input" />
          <select name="type" defaultValue="FIRM" className="pat-select">
            {COMPANY_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button type="submit" className="pat-button-primary">
            Create
          </button>
        </form>
      </AdminPanel>

      <AdminPanel title="Organization inventory" description="Each organization links to its detail control page.">
        <div className="grid gap-4">
          {organizations.map((organization) => {
            const subscription = organization.Subject?.MembershipSubscription[0] ?? null;
            const pilotBoundary = organization.PilotCohortMember.length
              ? organization.PilotCohortMember.map(
                  (membership) =>
                    `${membership.PilotCohort.name}: ${membership.memberKind} ${membership.dataBoundary} / ${membership.provisioningState}`
                ).join(" · ")
              : "No pilot cohort";
            return (
              <Link
                key={organization.id}
                href={`/admin/organizations/${organization.id}`}
                className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5 transition hover:border-[rgba(6,54,116,0.32)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[var(--shell-ink)]">{organization.name}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      {organization.type} · Membership {subscription ? `${subscription.plan} / ${subscription.status}` : `${MEMBERSHIP_PLAN_OPTIONS[0]} / ${MEMBERSHIP_STATUS_OPTIONS[0]}`}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                      Billing {subscription?.provider ?? "none"} · Provider status {subscription?.providerStatus ?? "unreconciled"} · Last event {subscription?.lastBillingEventType ?? "none"} · Reconciled {subscription?.lastReconciledAt ? subscription.lastReconciledAt.toLocaleString() : "never"}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                      Pilot boundary {pilotBoundary}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--shell-muted)]">Open detail</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--shell-muted)]">
                  <span>{organization._count.User} users</span>
                  <span>{organization._count.Product} products</span>
                  <span>{organization._count.SurveySubmission} submissions</span>
                </div>
              </Link>
            );
          })}
        </div>
      </AdminPanel>
    </div>
  );
}
