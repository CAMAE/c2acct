import Link from "next/link";
import { AdminActionLink, AdminMetricCard, AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { getAdminOverviewData, buildOperatorBriefings } from "@/lib/adminControlPlane";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const overview = await getAdminOverviewData();
  const latestSubmitStatus = overview.diagnosticsSnapshot.latestByArea.get("survey_submit")?.status ?? null;
  const briefings = buildOperatorBriefings({
    canonicalModules: overview.canonicalModules,
    recentAuditCount: overview.auditEvents.length,
    latestSubmitStatus,
  });

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="C2Core operator control plane"
        description="Use this overview to move into the live operator work areas: organizations, users, taxonomy, modules, insights, products, briefings, and runtime controls. This is the canonical admin surface for PAT."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label="Organizations" value={String(overview.metrics.organizations)} detail="Companies under operator oversight" />
        <AdminMetricCard label="Users" value={String(overview.metrics.users)} detail="Accounts and role assignments" />
        <AdminMetricCard label="Products" value={String(overview.metrics.products)} detail="Vendor and firm-linked product records" />
        <AdminMetricCard label="Modules / Sections" value={`${overview.metrics.modules} / ${overview.metrics.sections}`} detail="Assessment runtime structure" />
        <AdminMetricCard label="Insights / Memberships" value={`${overview.metrics.insights} / ${overview.metrics.memberships}`} detail="Insight inventory and active membership rows" />
      </section>

      <AdminPanel
        title="Operator work areas"
        description="Each route below is data-backed and focused on a specific operator responsibility."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminActionLink href="/admin/organizations" title="Organizations" body="Company oversight, company-backed membership controls, linked users, and product context." />
          <AdminActionLink href="/admin/users" title="Users" body="Role assignment, company linkage, and individual membership controls." />
          <AdminActionLink href="/admin/taxonomy" title="Taxonomy" body="Category and subcategory management, plus bucket-to-capability mappings." />
          <AdminActionLink href="/admin/modules" title="Modules" body="Module, section, question, and assessment mapping management." />
          <AdminActionLink href="/admin/insights" title="Insights" body="Insight text, unlock rules, capability thresholds, and visibility state." />
          <AdminActionLink href="/admin/products" title="Products" body="Product oversight, taxonomy assignments, and capability mappings." />
          <AdminActionLink href="/admin/briefings" title="Briefings" body="Operator-ready summaries of readiness gaps, audit activity, and recent pipeline state." />
          <AdminActionLink href="/admin/runtime" title="Runtime" body="Portal visibility, runtime consistency, diagnostics, and recent audit events." />
        </div>
      </AdminPanel>

      <AdminPanel
        title="Canonical PAT firm runtime"
        description="The five-module firm model remains the canonical assessment runtime."
      >
        <div className="grid gap-4">
          {overview.canonicalModules.map((module) => (
            <div
              key={module.key}
              className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{module.title}</div>
                  <div className="mt-1 text-sm text-[var(--shell-muted)]">{module.key}</div>
                </div>
                <div className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                  {module.active ? "Active" : "Inactive"}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--shell-muted)]">
                <span>{module._count.SurveyQuestion} questions</span>
                <span>{module._count.SurveySection} sections</span>
                <span>{module._count.SurveySubmission} submissions</span>
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Operator briefings"
        description="Short summaries built from live admin data, not placeholder prose."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {briefings.map((briefing) => (
            <div key={briefing.key} className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{briefing.title}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{briefing.summary}</div>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Recent operator audit activity"
        description="Recent admin mutations recorded in the operator audit feed."
      >
        <div className="grid gap-3">
          {overview.auditEvents.length > 0 ? (
            overview.auditEvents.map((event) => (
              <div key={event.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--shell-ink)]">{event.summary}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      {event.action} · {event.entityType} · {event.Actor?.email ?? "Unknown operator"}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                    {event.createdAt.toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4 text-sm text-[var(--shell-muted)]">
              No operator audit events have been recorded yet.
            </div>
          )}
        </div>
        <div className="mt-5">
          <Link className="pat-button-secondary" href="/admin/runtime">
            Open runtime and audit feed
          </Link>
        </div>
      </AdminPanel>
    </div>
  );
}
