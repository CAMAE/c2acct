"use client";

import Link from "next/link";
import { useState } from "react";
import PatModeToggle from "@/app/components/pat/PatModeToggle";
import { formatDelta, formatScoreValue } from "@/lib/formatDelta";
import { fitBarPct, fitHeatColor, fitTierKey, fitTierLabel, type FitTierKey } from "@/lib/fitHeat";
import type { RankedFirm, VendorSalesCardData } from "@/lib/salesCard";

/**
 * Vendor Sales Card v2 (Redlines R15/R16 + R-fixes). Consultant-brief visual
 * standard, inheriting the Alignment Board language: a stat-lockup header + an
 * alignment-delta explainer; a fit-tier pill toggle (All / Strong / Good / Weak)
 * that filters the ranked firm rows in place (rank order preserved); each row a
 * colored fit bar + a heat delta chip on the SHARED semantic scale (green =
 * strong, amber = middle, red = weak). Elite rows click into a detail card
 * (named firm, the module gap this vendor closes, suggested action); Pro sees
 * "Secret Firm N" + Reveal.
 */

const CONFIDENCE_LABEL: Record<RankedFirm["confidence"], string> = {
  no_signal: "Pending",
  sample_thin: "Sample-thin",
  emerging: "Building",
  grounded: "Grounded",
};

function firmLabel(firm: RankedFirm, entitled: boolean): string {
  return entitled ? firm.firmName : `Secret Firm ${firm.fitRank}`;
}

type TierFilter = "all" | FitTierKey;

export default function VendorSalesCardClient({
  data,
  entitled,
  membershipHref,
}: {
  data: VendorSalesCardData;
  entitled: boolean;
  membershipHref: string;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const detail = data.rankedFirms.find((firm) => firm.firmCompanyId === detailId) ?? null;

  const tierCounts = data.rankedFirms.reduce(
    (acc, firm) => {
      acc[fitTierKey(firm.alignmentDelta)] += 1;
      return acc;
    },
    { strong: 0, good: 0, weak: 0, pending: 0 } as Record<FitTierKey, number>
  );

  // Rank order is already sorted; filtering preserves it.
  const visibleFirms =
    tierFilter === "all"
      ? data.rankedFirms
      : data.rankedFirms.filter((firm) => fitTierKey(firm.alignmentDelta) === tierFilter);

  const tierOptions = [
    { key: "all", label: `All · ${data.rankedFirms.length}` },
    { key: "strong", label: `Strong fit · ${tierCounts.strong}`, state: tierCounts.strong === 0 ? ("disabled" as const) : undefined },
    { key: "good", label: `Good fit · ${tierCounts.good}`, state: tierCounts.good === 0 ? ("disabled" as const) : undefined },
    { key: "weak", label: `Weak fit · ${tierCounts.weak}`, state: tierCounts.weak === 0 ? ("disabled" as const) : undefined },
  ];

  return (
    <div className="space-y-6">
      {/* Header: stat lockup + explainer (no collision) */}
      <section className="pat-card p-6 sm:p-8">
        <div className="pat-label">Sales Card</div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="pat-stat-number text-4xl sm:text-5xl">
              {formatScoreValue(data.vendorStrength)}
              {data.vendorStrength !== null ? "%" : ""}
            </div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">
              {data.vendorName} · product strength across your catalog
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--shell-muted)]">
              <strong className="text-[var(--shell-ink)]">Alignment delta</strong> is how much your
              product strengths sit above a firm&rsquo;s current alignment — the headroom you could
              lift. Firms with the most headroom rank first; deltas stay directional while a
              firm&rsquo;s sample is thin.
            </p>
          </div>
          <div className="text-sm text-[var(--shell-muted)] lg:text-right">
            {data.rankedFirms.length} firm{data.rankedFirms.length === 1 ? "" : "s"} in your ecosystem
          </div>
        </div>
      </section>

      {data.rankedFirms.length === 0 ? (
        <div className="pat-card p-6 text-sm text-[var(--shell-muted)]">
          No firms in your ecosystem have a briefing yet. Ranked fit appears as firms complete their
          alignment assessments.
        </div>
      ) : (
        <>
          {/* Fit-tier filter — standard portal pill toggle */}
          <PatModeToggle
            activeKey={tierFilter}
            ariaLabel="Filter firms by fit tier"
            options={tierOptions}
            onChange={(key) => setTierFilter(key as TierFilter)}
          />

          {visibleFirms.length === 0 ? (
            <div className="pat-card p-6 text-sm text-[var(--shell-muted)]">
              No firms in this tier.
            </div>
          ) : (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleFirms.map((firm) => {
                const heat = fitHeatColor(firm.alignmentDelta);
                return (
                  <article
                    key={firm.firmCompanyId}
                    data-testid="sales-card-firm"
                    data-anonymized={entitled ? "0" : "1"}
                    data-firm-name={entitled ? firm.firmName : undefined}
                    className="pat-card p-5"
                  >
                    <button type="button" className="block w-full text-left" onClick={() => setDetailId(firm.firmCompanyId)}>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-semibold text-[var(--shell-ink)]">{firmLabel(firm, entitled)}</div>
                        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--shell-muted)]">
                          Fit #{firm.fitRank}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[var(--shell-muted)]">
                        {firm.gapArea} · {CONFIDENCE_LABEL[firm.confidence]}
                      </div>
                      <div className="mt-3.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: heat }}>
                            {fitTierLabel(firm.alignmentDelta)}
                          </span>
                          <span className="pat-stat-number text-lg" style={{ color: heat }}>
                            {formatDelta(firm.alignmentDelta)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]">
                          <div className="h-full rounded-full" style={{ width: `${fitBarPct(firm.alignmentDelta)}%`, background: heat }} />
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      {detail ? (
        <section className="pat-card p-6" data-testid="sales-card-detail">
          <div className="flex items-start justify-between">
            <div>
              <div className="pat-label">{firmLabel(detail, entitled)}</div>
              <div className="mt-1 text-xs text-[var(--shell-muted)]">
                Fit #{detail.fitRank} of {data.rankedFirms.length} · {CONFIDENCE_LABEL[detail.confidence]}
              </div>
            </div>
            <button type="button" className="text-sm text-[var(--shell-muted)]" onClick={() => setDetailId(null)}>
              ✕
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: fitHeatColor(detail.alignmentDelta) }}>
                {fitTierLabel(detail.alignmentDelta)}
              </span>
              <span className="pat-stat-number text-2xl" style={{ color: fitHeatColor(detail.alignmentDelta) }}>
                {formatDelta(detail.alignmentDelta)}
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]">
              <div className="h-full rounded-full" style={{ width: `${fitBarPct(detail.alignmentDelta)}%`, background: fitHeatColor(detail.alignmentDelta) }} />
            </div>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {entitled ? (
              <>
                <Fact
                  label="Where you close their gap"
                  value={detail.gapScore !== null ? `${detail.gapArea} — currently ${detail.gapScore}%` : detail.gapArea}
                />
                <Fact
                  label="Their current alignment"
                  value={detail.firmAlignment !== null ? `${detail.firmAlignment}%` : "Sample too thin"}
                />
                <div className="sm:col-span-2">
                  <Fact label="Suggested next action" value={detail.nextAction} />
                </div>
              </>
            ) : (
              <>
                <Fact label="Gap category" value={detail.gapArea} />
                <Fact label="Alignment delta" value={formatDelta(detail.alignmentDelta)} />
              </>
            )}
          </dl>
          {!entitled ? (
            <Link className="pat-button-primary mt-5 inline-flex text-sm" href={membershipHref}>
              Reveal with Elite
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-[var(--shell-muted)]">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-[var(--shell-ink)]">{value}</dd>
    </div>
  );
}
