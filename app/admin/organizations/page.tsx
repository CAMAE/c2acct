import Link from "next/link";
import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { COMPANY_TYPE_OPTIONS, MEMBERSHIP_PLAN_OPTIONS, MEMBERSHIP_STATUS_OPTIONS } from "@/lib/adminControlPlane";
import { createOrganizationAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
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
            },
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
