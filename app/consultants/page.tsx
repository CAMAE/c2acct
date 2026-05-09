import Link from "next/link";
import { AdminMetricCard, AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { getAdminBriefingCatalog } from "@/lib/adminBriefingEngine";
import { requireConsultantSession } from "@/lib/consultantAccess";

export const dynamic = "force-dynamic";

function formatPercent(value: number | null) {
  return value === null ? "--" : `${Math.round(value)}%`;
}

export default async function ConsultantOverviewPage() {
  const consultantAccess = await requireConsultantSession("/consultants");
  if (!consultantAccess) {
    return null;
  }

  const assignedCompanyIds = consultantAccess.ecosystems.flatMap((scope) =>
    scope.firmCompanies.map((firm) => firm.id)
  );
  const catalog =
    assignedCompanyIds.length > 0
      ? await getAdminBriefingCatalog({ companyIds: assignedCompanyIds })
      : [];
  const firmsWithCompletedModules = catalog.filter((item) => item.completedModuleCount > 0).length;
  const firmsWithReviewedProducts = catalog.filter((item) => item.productReviewCount > 0).length;
  const groundedOrEmerging = catalog.filter(
    (item) => item.confidenceLabel === "Grounded current-state signal" || item.confidenceLabel === "Emerging signal"
  ).length;

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Consultant"
        title="Assigned PAT briefings"
        description="This overview stays inside the firm-company scopes assigned to this PAT user account. Every card below is built from live PAT firm, product, and individual evidence only. Thin-evidence cases remain explicit rather than inferred."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Assigned firms"
          value={String(assignedCompanyIds.length)}
          detail="Firm-company briefing scopes assigned to this consultant account"
        />
        <AdminMetricCard
          label="Module-ready firms"
          value={String(firmsWithCompletedModules)}
          detail="Assigned firms with at least one completed canonical PAT module"
        />
        <AdminMetricCard
          label="Product-ready firms"
          value={String(firmsWithReviewedProducts)}
          detail="Assigned firms with at least one firm-reviewed product in the briefing stack"
        />
        <AdminMetricCard
          label="Grounded / Emerging"
          value={String(groundedOrEmerging)}
          detail="Assigned firms whose current PAT briefing has more than directional evidence"
        />
      </section>

      <AdminPanel
        title="Assigned company briefings"
        description="Consultant scope is currently enforced at the firm-company level. Ecosystem context, product readouts, and open-ended vendor narrative stay inside each company briefing."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {catalog.length === 0 ? (
            <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 text-sm leading-6 text-[var(--shell-muted)]">
              No firm briefing assignments are active yet for this consultant account.
            </div>
          ) : (
            catalog.map((item) => {
              const thinEvidence = item.completedModuleCount === 0 && item.productReviewCount === 0;
              return (
                <Link
                  key={item.companyId}
                  href={`/consultants/briefings/${item.companyId}`}
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
                    Canonical firm score {formatPercent(item.canonicalFirmScore)} · latest update {item.latestUpdatedAt ? item.latestUpdatedAt.toLocaleDateString() : "not yet available"}
                  </div>
                  <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                    {thinEvidence
                      ? "Thin evidence only. This assigned firm does not yet have completed module or product-review signal for a richer briefing readout."
                      : "Open briefing to review the current PAT executive summary, module heatmap, product stack, and open-ended vendor product responses inside this assigned scope."}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </AdminPanel>
    </div>
  );
}
