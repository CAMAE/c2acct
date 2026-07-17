"use client";

import Link from "next/link";
import { useState } from "react";
import PatModeToggle from "@/app/components/pat/PatModeToggle";
import SalesFitRadar from "@/app/components/vendor/SalesFitRadar";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";
import { formatDelta, formatScoreValue } from "@/lib/formatDelta";
import { fitBarPct, fitHeatColor, fitTierKey, fitTierLabel, type FitTierKey } from "@/lib/fitHeat";
import type { EvidenceGrade, RankedFirm, SalesModuleGap, VendorBattleCardData } from "@/lib/battleCard";
import { CONFIDENCE_BAND_LABEL } from "@/lib/confidenceBands";

/**
 * Vendor BattleCard v3 (Redlines R15/R16 + P1 finishers). Consultant-brief
 * visual standard: a stat-lockup header + alignment-delta explainer; a fit-tier
 * pill toggle — exactly Strong / Good / Weak, no "All" (clearing the active pill
 * shows every firm) — that filters the ranked rows in place (rank order kept);
 * each row a colored fit bar + heat delta chip on the SHARED semantic scale.
 * Elite rows click into a consultant-brief detail card: a mini radar (firm's
 * alignment shape vs the vendor's product-strength ring), a per-module gap table
 * with evidence counts, the fit bar, and ranked next actions — all real data.
 * Pro sees "Secret Firm N" + Reveal.
 */

// B8-2: confidence renders from the ONE lexicon (Grounded / Early signal / No
// signal), never score-band words like "Building".
const CONFIDENCE_LABEL: Record<RankedFirm["confidence"], string> = CONFIDENCE_BAND_LABEL;

function firmLabel(firm: RankedFirm, entitled: boolean): string {
  return entitled ? firm.firmName : `Secret Firm ${firm.fitRank}`;
}

/** "" = no active tier → every firm shown (replaces the old "All" pill). */
type TierFilter = "" | FitTierKey;

export default function VendorBattleCardClient({
  data,
  entitled,
  membershipHref,
  heroChips,
}: {
  data: VendorBattleCardData;
  entitled: boolean;
  membershipHref: string;
  /** 14a/b/c hero chips slot (server-rendered, passed in). */
  heroChips?: React.ReactNode;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>("");

  const tierCounts = data.rankedFirms.reduce(
    (acc, firm) => {
      acc[fitTierKey(firm.alignmentDelta)] += 1;
      return acc;
    },
    { strong: 0, good: 0, weak: 0, pending: 0 } as Record<FitTierKey, number>
  );

  // Rank order is already sorted; filtering preserves it. No active tier = all.
  const visibleFirms =
    tierFilter === ""
      ? data.rankedFirms
      : data.rankedFirms.filter((firm) => fitTierKey(firm.alignmentDelta) === tierFilter);

  // Exactly three tiers — Strong / Good / Weak. Clicking the active pill clears
  // it back to "all firms" (which is why there is no "All" pill).
  const tierOptions = [
    { key: "strong", label: `Strong fit · ${tierCounts.strong}`, state: tierCounts.strong === 0 ? ("disabled" as const) : undefined },
    { key: "good", label: `Good fit · ${tierCounts.good}`, state: tierCounts.good === 0 ? ("disabled" as const) : undefined },
    { key: "weak", label: `Weak fit · ${tierCounts.weak}`, state: tierCounts.weak === 0 ? ("disabled" as const) : undefined },
  ];

  return (
    <div className="space-y-6">
      {/* Header: stat lockup + explainer (no collision) */}
      <section className="pat-card relative p-6 sm:p-8">
        {heroChips}
        <div className="pat-label">BattleCard</div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="pat-stat-number text-4xl sm:text-5xl">
              {formatScoreValue(data.vendorStrength)}
              {data.vendorStrength !== null ? "%" : ""}
            </div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">
              {data.vendorName} · product strength across your catalog
            </div>
            <div className="mt-2">
              <EvidenceProvenance
                grade={data.vendorStrengthGrade}
                firmReviewed={data.firmReviewedProductCount}
                selfReported={data.selfReportedOnlyProductCount}
              />
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

      {/* 14f — Prospect Intelligence explainer: where the firm list comes from and how it grows. */}
      <div>
        <div className="pat-label">Prospect Intelligence</div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--shell-muted)]">
          These are the firms in your ecosystem that have completed an alignment briefing, ranked by
          the headroom your product strength has over their current alignment. The list grows as more
          firms join your ecosystem and complete their briefings.
        </p>
      </div>

      {data.rankedFirms.length === 0 ? (
        <div className="pat-card p-6 text-sm text-[var(--shell-muted)]">
          No firms in your ecosystem have a briefing yet. Ranked fit appears as firms complete their
          alignment assessments.
        </div>
      ) : (
        <>
          {/* Fit-tier filter — Strong / Good / Weak; click active to clear to all */}
          <div className="flex flex-wrap items-center gap-3">
            <PatModeToggle
              activeKey={tierFilter}
              ariaLabel="Filter firms by fit tier"
              options={tierOptions}
              onChange={(key) => setTierFilter((current) => (current === key ? "" : (key as TierFilter)))}
            />
            <span className="text-xs text-[var(--shell-muted)]">
              {tierFilter === ""
                ? `All · ${data.rankedFirms.length} firm${data.rankedFirms.length === 1 ? "" : "s"}`
                : "Tap the active tier to show all"}
            </span>
          </div>

          {visibleFirms.length === 0 ? (
            <div className="pat-card p-6 text-sm text-[var(--shell-muted)]">
              No firms in this tier.
            </div>
          ) : (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleFirms.map((firm) => {
                const heat = fitHeatColor(firm.alignmentDelta);
                const expanded = detailId === firm.firmCompanyId;
                return (
                  <article
                    key={firm.firmCompanyId}
                    data-testid="battlecard-firm"
                    data-anonymized={entitled ? "0" : "1"}
                    data-firm-name={entitled ? firm.firmName : undefined}
                    data-expanded={expanded ? "1" : "0"}
                    className={`pat-card p-5 ${expanded ? "md:col-span-2 xl:col-span-3" : ""}`}
                  >
                    <button
                      type="button"
                      className="block w-full text-left"
                      aria-expanded={expanded}
                      onClick={() => setDetailId(expanded ? null : firm.firmCompanyId)}
                    >
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
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-c2-blue)]">
                        {expanded ? "Hide brief" : entitled ? "Open brief" : "Preview brief"}
                        <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
                      </span>
                    </button>
                    {/* Inline expansion (same law as insights): the clicked card grows
                        to a full-width own-row and renders the consultant brief in
                        place — never a detached panel at the page bottom. */}
                    {expanded ? (
                      <div className="mt-4 border-t border-[var(--shell-border)] pt-4" data-testid="battlecard-detail">
                        <BattleCardDetailBody
                          detail={firm}
                          data={data}
                          entitled={entitled}
                          membershipHref={membershipHref}
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      <OutputDisclaimer variant="note" />
    </div>
  );
}

/**
 * The consultant-brief body shown inline when a firm card is expanded. Header
 * (firm name + fit rank) lives on the card face; this is fit lockup + (Elite)
 * radar/gap table + next actions, or the Pro facts + Reveal CTA.
 */
function BattleCardDetailBody({
  detail,
  data,
  entitled,
  membershipHref,
}: {
  detail: RankedFirm;
  data: VendorBattleCardData;
  entitled: boolean;
  membershipHref: string;
}) {
  return (
    <>
      {/* Fit lockup */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: fitHeatColor(detail.alignmentDelta) }}>
            {fitTierLabel(detail.alignmentDelta)} · headroom over their alignment
          </span>
          <span className="pat-stat-number text-2xl" style={{ color: fitHeatColor(detail.alignmentDelta) }}>
            {formatDelta(detail.alignmentDelta)}
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]">
          <div className="h-full rounded-full" style={{ width: `${fitBarPct(detail.alignmentDelta)}%`, background: fitHeatColor(detail.alignmentDelta) }} />
        </div>
        <div className="mt-1.5 text-xs text-[var(--shell-muted)]">
          Their alignment {detail.firmAlignment !== null ? `${detail.firmAlignment}%` : "— (thin)"} · your product
          strength {data.vendorStrength !== null ? `${data.vendorStrength}%` : "—"} across{" "}
          {data.firmReviewedProductCount || data.selfReportedOnlyProductCount} product
          {(data.firmReviewedProductCount || data.selfReportedOnlyProductCount) === 1 ? "" : "s"}
        </div>
        <div className="mt-1.5">
          <EvidenceProvenance
            grade={data.vendorStrengthGrade}
            firmReviewed={data.firmReviewedProductCount}
            selfReported={data.selfReportedOnlyProductCount}
          />
        </div>
      </div>

      {entitled ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
          {/* Mini radar: firm shape vs your product-strength ring */}
          <div>
            <div className="pat-label mb-2">Alignment shape</div>
            <SalesFitRadar
              axes={detail.moduleShape.map((gap) => ({ title: gap.title, score: gap.score }))}
              vendorStrength={data.vendorStrength}
            />
          </div>

          {/* Per-module gap table with evidence counts */}
          <div>
            <div className="pat-label mb-2">Module gaps you could close</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[var(--shell-muted)]">
                  <th className="pb-1.5 font-semibold">Module</th>
                  <th className="pb-1.5 text-right font-semibold">Firm</th>
                  <th className="pb-1.5 text-right font-semibold">Headroom</th>
                  <th className="pb-1.5 text-right font-semibold">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {detail.moduleShape.map((gap) => (
                  <ModuleGapRow key={gap.key} gap={gap} />
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-[var(--shell-muted)]">
              Headroom = your overall product strength minus the firm&rsquo;s module score. Evidence
              is answered vs total assessment questions behind each module (&ldquo;scored&rdquo; = a
              completed module without per-question answers recorded).
            </p>
          </div>
        </div>
      ) : (
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <Fact label="Gap category" value={detail.gapArea} />
          <Fact label="Alignment delta" value={formatDelta(detail.alignmentDelta)} />
        </dl>
      )}

      {entitled ? (
        <div className="mt-6">
          <div className="pat-label mb-2">Suggested next actions</div>
          <ol className="space-y-2">
            {detail.nextActions.map((action, index) => (
              <li key={index} className="flex gap-2.5 text-sm leading-6 text-[var(--shell-ink)]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--shell-panel-soft)] text-[11px] font-semibold text-[var(--shell-muted)]">
                  {index + 1}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <Link className="pat-button-primary mt-5 inline-flex text-sm" href={membershipHref}>
          Reveal with Elite
        </Link>
      )}
    </>
  );
}

function ModuleGapRow({ gap }: { gap: SalesModuleGap }) {
  const headroomColor = gap.headroom === null ? "var(--shell-muted)" : fitHeatColor(gap.headroom);
  return (
    <tr className="border-t border-[var(--shell-border)]">
      <td className="py-2 pr-2 text-[var(--shell-ink)]">{gap.title}</td>
      <td className="py-2 text-right tabular-nums text-[var(--shell-ink)]">
        {gap.score !== null ? `${gap.score}%` : "—"}
      </td>
      <td className="py-2 text-right tabular-nums font-semibold" style={{ color: headroomColor }}>
        {gap.headroom !== null ? formatDelta(gap.headroom) : "—"}
      </td>
      <td className="py-2 text-right tabular-nums text-[var(--shell-muted)]">
        {gap.answeredCount > 0 ? (
          `${gap.answeredCount}/${gap.questionCount}`
        ) : gap.score !== null ? (
          <span title="Module scored; per-question answers not individually recorded">scored</span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

/**
 * Evidence-lineage provenance chip (P2-pre policy). firm_reviewed = neutral
 * "Firm-reviewed" tag; vendor_reported = the same red-caption treatment the
 * Sandbox uses for self-report, so a self-reported number never reads as
 * firm-verified. When firm-reviewed products carry the number but self-report-
 * only products exist, we disclose the excluded count (not blended in).
 */
function EvidenceProvenance({
  grade,
  firmReviewed,
  selfReported,
}: {
  grade: EvidenceGrade;
  firmReviewed: number;
  selfReported: number;
}) {
  if (grade === "vendor_reported") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-orange)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--brand-orange)]" />
        Vendor self-reported — no firm reviews yet; not firm-verified.
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-[var(--shell-muted)]">
      <span className="inline-flex items-center gap-1 font-medium text-[var(--shell-positive)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--shell-positive)]" />
        Firm-reviewed
      </span>
      · {firmReviewed} product{firmReviewed === 1 ? "" : "s"}
      {selfReported > 0
        ? ` · ${selfReported} self-reported-only product${selfReported === 1 ? "" : "s"} excluded`
        : ""}
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
