import Link from "next/link";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PortalAudienceEyebrow from "@/app/components/pat/PortalAudienceEyebrow";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import PageHead from "@/app/components/shell/PageHead";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import EcosystemListCard from "./_components/EcosystemListCard";
import { getEcosystemListForVendorCompanies } from "@/lib/ecosystem";
import { listEnterpriseChannels, portfolioRollup } from "@/lib/enterprise";
import { requireEnterpriseAccess } from "@/lib/enterpriseAccess";

export const dynamic = "force-dynamic";

/**
 * 3e (R51) — Enterprise portal v0 home: the portfolio roll-up (one row per owned
 * product), the channel list (market view per verticalId) and the owned
 * ecosystems with the same cards the consultant portal shows. Read-only.
 */
export default async function EnterprisePortalPage() {
  const state = await requireEnterpriseAccess();
  const [rollup, channels, ecosystems] = await Promise.all([
    portfolioRollup(state.enterprise.id),
    listEnterpriseChannels(state.enterprise.id),
    getEcosystemListForVendorCompanies(state.vendorCompanies.map((vendor) => vendor.id)),
  ]);
  const rows = rollup ?? [];

  return (
    <div className="space-y-8">
      {isNewFrontDoorEnabled() ? (
        // Box 3f item M: the shared page head on the enterprise portal too.
        <PageHead
          variant="portal"
          wordmark
          eyebrow="Enterprise portal"
          title={<PatAudienceTitle as="span" title="Your portfolio" audienceTerms={["portfolio"]} />}
          subline={
            <span data-testid="enterprise-portal-hero">
              {state.enterprise.name} · {state.vendorCompanies.length} vendor compan{state.vendorCompanies.length === 1 ? "y" : "ies"} ·{" "}
              {rows.length} product{rows.length === 1 ? "" : "s"} · {channels.length} channel{channels.length === 1 ? "" : "s"}
            </span>
          }
        />
      ) : (
      <section className="pat-card relative p-8" data-testid="enterprise-portal-hero">
        <PatLogoLockup mode="hero" tone="light" />
        <PortalAudienceEyebrow className="pat-label mt-6" label="Enterprise portal" audienceLabel="Enterprise" />
        <PatAudienceTitle
          as="h1"
          title="Your portfolio"
          audienceTerms={["portfolio"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--shell-muted)]">
          {state.enterprise.name} · {state.vendorCompanies.length} vendor compan{state.vendorCompanies.length === 1 ? "y" : "ies"} ·{" "}
          {rows.length} product{rows.length === 1 ? "" : "s"} · {channels.length} channel{channels.length === 1 ? "" : "s"}
        </p>
      </section>
      )}

      <section className="pat-card p-6" data-testid="enterprise-portfolio">
        <div className="pat-label">Portfolio roll-up</div>
        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          One row per owned product: its firm-reviewed score, how many firm reviews sit behind it, and how fresh the newest review is.
        </p>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--shell-muted)]">No products on the portfolio yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="pat-label border-b border-[var(--shell-border)]">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Product</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Vendor</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Channel</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Score</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">n</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Freshness</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.productId} className="border-b border-[var(--shell-border)] last:border-b-0" data-testid="enterprise-portfolio-row">
                    <td className="px-3 py-2 font-medium text-[var(--shell-ink)]">{row.productName}</td>
                    <td className="px-3 py-2 text-[var(--shell-muted)]">{row.vendorCompanyName}</td>
                    <td className="px-3 py-2 text-[var(--shell-muted)]">{row.verticalId}</td>
                    <td className="pat-mono px-3 py-2 text-right text-[var(--shell-ink)]">{row.score === null ? "—" : Math.round(row.score)}</td>
                    <td className="pat-mono px-3 py-2 text-right text-[var(--shell-ink)]">{row.n}</td>
                    <td className="pat-mono px-3 py-2 text-right text-[var(--shell-muted)]">
                      {row.freshnessDays === null ? "no reviews" : row.freshnessDays === 0 ? "today" : `${row.freshnessDays} d ago`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="pat-card p-6" data-testid="enterprise-channels">
        <div className="pat-label">Channels</div>
        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          The market view per channel ranks every product in that channel by firm-reviewed score, yours flagged.
        </p>
        <ul className="mt-4 flex flex-wrap gap-3">
          {channels.map((verticalId) => (
            <li key={verticalId}>
              <Link
                href={`/enterprise/channels/${encodeURIComponent(verticalId)}`}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)]"
              >
                {verticalId} <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4" data-testid="enterprise-ecosystems">
        <div className="pat-label">Your channels&apos; ecosystems</div>
        {ecosystems.length === 0 ? (
          <div className="rounded-3xl border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
            No ecosystems are attached to your vendor companies yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {ecosystems.map((card) => (
              <EcosystemListCard key={card.ecosystemId} data={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
