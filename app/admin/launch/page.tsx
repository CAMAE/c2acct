import Link from "next/link";
import {
  AdminActionLink,
  AdminPageIntro,
  AdminPanel,
} from "@/app/components/admin/AdminShell";
import { getAdminLaunchControlData, type AdminLaunchMetric, type AdminLaunchTableRow } from "@/lib/adminLaunchControl";

export const dynamic = "force-dynamic";

function toneClassName(tone: AdminLaunchMetric["tone"] | AdminLaunchTableRow["tone"] = "neutral") {
  if (tone === "ok") {
    return "border-[rgba(22,101,52,0.24)] bg-[rgba(22,101,52,0.035)]";
  }

  if (tone === "warn") {
    return "border-[rgba(154,52,18,0.28)] bg-[rgba(154,52,18,0.045)]";
  }

  return "border-[var(--shell-border)] bg-white/75";
}

function MetricGrid({ cards }: { cards: AdminLaunchMetric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.key} className={`rounded-[22px] border p-4 ${toneClassName(card.tone)}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
            {card.label}
          </div>
          <div className="mt-2 text-[1.8rem] font-semibold tracking-tight text-[var(--shell-ink)] md:text-[2rem]">
            {card.value}
          </div>
          <div className="mt-2.5 text-sm leading-6 text-[var(--shell-muted)]">
            {card.detail}
          </div>
        </div>
      ))}
    </div>
  );
}

function LaunchTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: AdminLaunchTableRow[];
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--shell-border)]">
      <table className="w-full min-w-[42rem] border-collapse bg-white/80 text-left text-sm">
        <thead className="bg-[var(--shell-panel-soft)] text-[11px] uppercase tracking-[0.16em] text-[var(--shell-muted)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={`border-t ${toneClassName(row.tone)}`}>
              {row.cells.map((cell, index) => (
                <td key={`${row.key}-${index}`} className="px-4 py-3 align-top text-[var(--shell-muted)]">
                  {index === 0 ? (
                    <span className="font-semibold text-[var(--shell-ink)]">{cell}</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminLaunchPage() {
  const launch = await getAdminLaunchControlData();

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Launch control plane"
        description="Operator visibility for launch health, customer and membership state, billing reconciliation, demo-data readiness, local review auth, and release identity."
      />

      {launch.queryError ? (
        <section className="rounded-[22px] border border-[rgba(154,52,18,0.28)] bg-[rgba(154,52,18,0.045)] p-5">
          <div className="pat-label">Launch data error</div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            {launch.queryError}
          </p>
        </section>
      ) : null}

      <AdminPanel
        title="Customer and product footprint"
        description="Top-level launch counts across customer accounts, users, and products."
      >
        <MetricGrid cards={launch.summaryCards} />
      </AdminPanel>

      <AdminPanel
        title="Assessment and insight coverage"
        description="Coverage must stay high enough for PAT to avoid overclaiming generated insight readiness."
      >
        <div className="grid gap-5">
          <MetricGrid cards={launch.assessmentCards} />
          <MetricGrid cards={launch.insightCards} />
        </div>
      </AdminPanel>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel
          title="Membership plan and status distribution"
          description="Entitlements derive from membership and provider reconciliation state, not client-supplied params."
        >
          <LaunchTable
            headers={["Status", "Free", "Pro", "Elite", "Total"]}
            rows={launch.membershipDistributionRows}
          />
        </AdminPanel>

        <AdminPanel
          title="Billing reconciliation"
          description="Provider identifiers and reconciliation status only. Raw card data and webhook payloads are not exposed."
        >
          <MetricGrid cards={launch.billingCards} />
        </AdminPanel>
      </section>

      <AdminPanel
        title="Failed webhook events"
        description="Recent failed provider webhook events, shown without payload or payment secrets."
      >
        <LaunchTable
          headers={["Provider", "Event", "Status", "Error", "Created"]}
          rows={launch.failedWebhookRows}
        />
      </AdminPanel>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminPanel
          title="Local review and demo data"
          description={`Demo seed version: ${launch.demoSeedVersion}. Local review state is shown only as policy and seeded-account proof.`}
        >
          <div className="grid gap-5">
            <MetricGrid cards={launch.localReviewCards} />
            <div className="rounded-[20px] border border-[var(--shell-border)] bg-white/75 p-4 text-sm leading-6 text-[var(--shell-muted)]">
              <div className="font-semibold text-[var(--shell-ink)]">
                Demo ecosystem {launch.demoHealth.routeReady ? "route-ready" : "not route-ready"}
              </div>
              <div className="mt-2">
                {launch.demoHealth.vendorCount} vendors · {launch.demoHealth.productCount} products · {launch.demoHealth.firmCount} firms · {launch.demoHealth.firmVendorRelationshipCount} firm/vendor links.
              </div>
              <div className="mt-2">
                {launch.demoHealth.error ?? "Seeded data is connected for local review dashboards and insight paths."}
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Release identity"
          description="The public runtime fingerprint fields that must agree across build state, health payloads, operator status, and release validators."
        >
          <LaunchTable headers={["Field", "Value"]} rows={launch.releaseRows} />
          <div className="mt-5">
            <Link href="/release" className="pat-button-secondary">
              Open public build proof
            </Link>
          </div>
        </AdminPanel>
      </section>

      <AdminPanel
        title="Operator remediation"
        description="Links are limited to existing routes in this application."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {launch.remediationLinks.map((link) => (
            <AdminActionLink
              key={link.href}
              href={link.href}
              title={link.label}
              body={link.description}
            />
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
