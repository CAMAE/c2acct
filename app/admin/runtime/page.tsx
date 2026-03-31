import prisma from "@/lib/prisma";
import { AdminMetricCard, AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { getAdminOverviewData } from "@/lib/adminControlPlane";
import { updatePortalAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminRuntimePage() {
  const [overview, portals, diagnostics] = await Promise.all([
    getAdminOverviewData(),
    prisma.portal.findMany({
      orderBy: { key: "asc" },
    }),
    prisma.operatorAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        Actor: {
          select: { email: true },
        },
      },
    }).catch(() => []),
  ]);

  const recentDiagnostics = overview.diagnosticsSnapshot.recent.slice(0, 10);

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Runtime"
        description="Portal visibility controls, canonical PAT runtime metrics, diagnostics, and the operator audit feed."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Portals" value={String(portals.length)} detail="Portal records under operator control" />
        <AdminMetricCard label="Diagnostics" value={String(recentDiagnostics.length)} detail="Recent PAT runtime diagnostics in-process" />
        <AdminMetricCard label="Audit events" value={String(diagnostics.length)} detail="Recent operator mutations recorded" />
        <AdminMetricCard label="Canonical firm modules" value={String(overview.canonicalModules.length)} detail="Expected canonical total: 5" />
      </section>

      <AdminPanel title="Portal visibility controls">
        <div className="grid gap-4">
          {portals.map((portal) => (
            <form key={portal.id} action={updatePortalAction} className="grid gap-4 rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 md:grid-cols-[1.1fr_0.9fr_auto]">
              <input type="hidden" name="portalId" value={portal.id} />
              <input type="hidden" name="returnTo" value="/admin/runtime" />
              <input name="title" defaultValue={portal.title} className="pat-input" />
              <label className="flex items-center gap-2 rounded-[18px] border border-[var(--shell-border)] px-4 py-3 text-sm text-[var(--shell-muted)]">
                <input type="checkbox" name="active" defaultChecked={portal.active} />
                {portal.key} active
              </label>
              <button type="submit" className="pat-button-primary">
                Save portal
              </button>
            </form>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Canonical runtime diagnostics">
        <div className="grid gap-3">
          {overview.canonicalModules.map((module) => (
            <div key={module.key} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
              <div className="font-semibold text-[var(--shell-ink)]">{module.title}</div>
              <div className="mt-1 text-sm text-[var(--shell-muted)]">
                {module._count.SurveyQuestion} questions · {module._count.SurveySection} sections · {module._count.SurveySubmission} submissions
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Recent runtime diagnostics">
          <div className="grid gap-3">
            {recentDiagnostics.map((event) => (
              <div key={event.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{event.area} · {event.status}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">{event.summary}</div>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Operator audit feed">
          <div className="grid gap-3">
            {diagnostics.map((event) => (
              <div key={event.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{event.summary}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  {event.action} · {event.entityType} · {event.Actor?.email ?? "Unknown operator"} · {event.createdAt.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </section>
    </div>
  );
}
