"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDelta, formatScoreValue } from "@/lib/formatDelta";
import type { RankedFirm, VendorSalesCardData } from "@/lib/salesCard";

/**
 * Vendor Sales Card v2 (Redlines R15/R16). Redrawn to the consultant-brief
 * visual standard and inheriting the Alignment Board's language: a stat-lockup
 * header (product strength + a fit-tier summary, no collision), an alignment-
 * delta explainer, and ranked firm rows as colored fit bars with a warm→cool
 * heat delta chip (warmest = strongest fit — the same heat as the board's Secret
 * candidates). Elite rows click into a detail card (named firm, the module gap
 * this vendor closes, suggested action); Pro sees "Secret Firm N" + Reveal.
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

function fitTierLabel(delta: number | null): string {
  if (delta === null) return "Pending";
  if (delta >= 12) return "Strong fit";
  if (delta >= 0) return "Good fit";
  return "Weak fit";
}

// Warm (strong fit) → amber → cool (weak/negative), matching the board heat.
const HEAT_STOPS: Array<[number, number, number]> = [
  [181, 69, 27],
  [196, 122, 44],
  [91, 107, 133],
];
function heatColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (HEAT_STOPS.length - 1);
  const i = Math.min(HEAT_STOPS.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = HEAT_STOPS[i]!;
  const b = HEAT_STOPS[i + 1]!;
  const mix = (x: number, y: number) => Math.round(x + (y - x) * f);
  return `rgb(${mix(a[0], b[0])}, ${mix(a[1], b[1])}, ${mix(a[2], b[2])})`;
}

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
  const detail = data.rankedFirms.find((firm) => firm.firmCompanyId === detailId) ?? null;

  const deltas = data.rankedFirms
    .map((firm) => firm.alignmentDelta)
    .filter((d): d is number => d !== null);
  const maxDelta = deltas.length ? Math.max(...deltas) : 0;
  const minDelta = deltas.length ? Math.min(...deltas) : 0;
  // t: 0 = strongest fit (warmest), 1 = weakest.
  const heatT = (delta: number | null): number => {
    if (delta === null || maxDelta === minDelta) return 0;
    return (maxDelta - delta) / (maxDelta - minDelta);
  };
  const heatFor = (delta: number | null): string => (delta === null ? "#5b6b85" : heatColor(heatT(delta)));
  // Bar width: fuller for stronger fit; keep a visible sliver for the weakest.
  const barPct = (delta: number | null): number => {
    if (delta === null) return 6;
    return 6 + (1 - heatT(delta)) * 94;
  };

  const tierCounts = data.rankedFirms.reduce(
    (acc, firm) => {
      const label = fitTierLabel(firm.alignmentDelta);
      if (label === "Strong fit") acc.strong += 1;
      else if (label === "Good fit") acc.good += 1;
      else if (label === "Weak fit") acc.weak += 1;
      return acc;
    },
    { strong: 0, good: 0, weak: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header: stat lockup + fit-tier summary (no collision) */}
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
          <div className="lg:text-right">
            <div className="text-sm text-[var(--shell-muted)]">
              {data.rankedFirms.length} firm{data.rankedFirms.length === 1 ? "" : "s"} in your ecosystem
            </div>
            <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
              <TierChip color={heatColor(0)} label="Strong fit" count={tierCounts.strong} />
              <TierChip color={heatColor(0.5)} label="Good fit" count={tierCounts.good} />
              <TierChip color={heatColor(1)} label="Weak fit" count={tierCounts.weak} />
            </div>
          </div>
        </div>
      </section>

      {data.rankedFirms.length === 0 ? (
        <div className="pat-card p-6 text-sm text-[var(--shell-muted)]">
          No firms in your ecosystem have a briefing yet. Ranked fit appears as firms complete their
          alignment assessments.
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.rankedFirms.map((firm) => {
            const heat = heatFor(firm.alignmentDelta);
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
                  {/* Colored fit bar + heat delta chip */}
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
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barPct(firm.alignmentDelta)}%`, background: heat }}
                      />
                    </div>
                  </div>
                </button>
              </article>
            );
          })}
        </section>
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

          {/* Fit strength bar */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: heatFor(detail.alignmentDelta) }}>
                {fitTierLabel(detail.alignmentDelta)}
              </span>
              <span className="pat-stat-number text-2xl" style={{ color: heatFor(detail.alignmentDelta) }}>
                {formatDelta(detail.alignmentDelta)}
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${barPct(detail.alignmentDelta)}%`, background: heatFor(detail.alignmentDelta) }}
              />
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

function TierChip({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--shell-border)] px-2.5 py-1 text-xs font-semibold text-[var(--shell-ink)]">
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {count} {label}
    </span>
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
