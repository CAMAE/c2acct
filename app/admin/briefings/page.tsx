import Link from "next/link";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { getAdminBriefingCatalog } from "@/lib/adminBriefingEngine";
import { buildOperatorBriefings, getAdminOverviewData } from "@/lib/adminControlPlane";

export const dynamic = "force-dynamic";

export default async function AdminBriefingsPage() {
  const [catalog, overview] = await Promise.all([
    getAdminBriefingCatalog(),
    getAdminOverviewData(),
  ]);

  const latestSubmitStatus = overview.diagnosticsSnapshot.latestByArea.get("survey_submit")?.status ?? null;
  const operatorBriefings = buildOperatorBriefings({
    canonicalModules: overview.canonicalModules,
    recentAuditCount: overview.auditEvents.length,
    latestSubmitStatus,
  });

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Briefings"
        description="Consultant and operator briefings that summarize individual, firm, product, and ecosystem signal from the live PAT engine only."
      />

      <AdminPanel
        title="Live firm briefings"
        description="These briefings are only generated for firm organizations because that is the current PAT layer with the complete individual -> firm -> product -> ecosystem chain."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {catalog.length === 0 ? (
            <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 text-sm leading-6 text-[var(--shell-muted)]">
              No firm organizations are ready for consultant/operator briefings yet.
            </div>
          ) : (
            catalog.map((item) => (
              <Link
                key={item.companyId}
                href={`/admin/briefings/${item.companyId}`}
                className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 transition hover:border-[rgba(6,54,116,0.32)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[var(--shell-ink)]">{item.companyName}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      {item.completedModuleCount}/5 firm modules · {item.productReviewCount} reviewed products · {item.userCount} linked users
                    </div>
                  </div>
                  <div className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--shell-ink)]">
                    {item.confidenceLabel}
                  </div>
                </div>
                <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                  Canonical firm score {item.canonicalFirmScore === null ? "--" : `${Math.round(item.canonicalFirmScore)}%`} · latest update{" "}
                  {item.latestUpdatedAt ? item.latestUpdatedAt.toLocaleDateString() : "not yet available"}
                </div>
              </Link>
            ))
          )}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Operator runtime briefings"
        description="These remain operational health checks. They are not the board-ready company briefings."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {operatorBriefings.map((briefing) => (
            <div key={briefing.key} className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{briefing.title}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{briefing.summary}</div>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
