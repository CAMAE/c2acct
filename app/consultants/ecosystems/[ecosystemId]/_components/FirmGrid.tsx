"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EcosystemDetailData, EcosystemDetailFirmRow } from "@/lib/ecosystem";
import { TRACK_COLOR, getScoreBand } from "@/lib/scoreBands";

type SortDir = "asc" | "desc";

function formatPercent(value: number | null): string {
  return value === null ? "--" : `${value}%`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "--";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "--";
  const days = Math.max(0, Math.round((Date.now() - then) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

// 15e — a full assessment older than this reads as stale for the consultant.
const ASSESSMENT_STALE_DAYS = 90;

/** 15e — read-only assessment freshness: absolute date + a staleness verdict.
 *  Display only — no nudging (that is Block 16, post-launch). */
function assessmentFreshness(
  iso: string | null,
  fullyAssessed: boolean
): { label: string; flag: "none" | "stale" | "never" } {
  if (!fullyAssessed || !iso) return { label: "no full assessment yet", flag: "never" };
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return { label: "no full assessment yet", flag: "never" };
  const date = new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const days = Math.max(0, Math.round((Date.now() - then) / (24 * 60 * 60 * 1000)));
  return { label: date, flag: days >= ASSESSMENT_STALE_DAYS ? "stale" : "none" };
}

function shortConfidence(label: string): string {
  // Day-27 P1a/RK10: 4/22-banned terms (grounded, emerging, sample-thin,
  // early-signal) replaced with plain-language tiers reflecting submission
  // depth. The upstream confidenceLabel still uses the old vocabulary; this
  // helper maps to the consultant-facing language.
  // B8-2: one lexicon — Grounded / Early signal / No signal.
  if (label.includes("Grounded")) return "Grounded";
  if (label.includes("Early")) return "Early signal";
  return "No signal";
}

/**
 * League-table view: firms ranked by alignment index as horizontal bars so
 * the consultant sees who needs attention at a glance. Lowest-first by
 * default (needs-attention order); unscored firms always sink to the bottom.
 */
export default function FirmGrid({ data }: { data: EcosystemDetailData }) {
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    const scored = data.firmGrid.filter((row) => row.canonicalFirmScore !== null);
    const unscored = data.firmGrid.filter((row) => row.canonicalFirmScore === null);
    scored.sort((a, b) =>
      sortDir === "asc"
        ? (a.canonicalFirmScore ?? 0) - (b.canonicalFirmScore ?? 0)
        : (b.canonicalFirmScore ?? 0) - (a.canonicalFirmScore ?? 0)
    );
    return [...scored, ...unscored];
  }, [data.firmGrid, sortDir]);

  if (data.firmGrid.length === 0) {
    return (
      <section
        className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5"
        data-testid="ecosystem-detail-firm-grid"
      >
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Firms in ecosystem
        </h2>
        <p className="mt-3 text-sm text-[var(--shell-muted)]">No firms in this ecosystem yet.</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5"
      data-testid="ecosystem-detail-firm-grid"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Firm briefings &middot; <span className="pat-stat-number">{data.firmGrid.length}</span> firm{data.firmGrid.length === 1 ? "" : "s"}
        </h2>
        <button
          type="button"
          onClick={() => setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))}
          className="text-sm text-[var(--shell-muted)] underline-offset-2 hover:underline"
        >
          {sortDir === "asc" ? "Needs attention first ↑" : "Strongest first ↓"}
        </button>
      </div>

      <ol className="space-y-3">
        {rows.map((row: EcosystemDetailFirmRow, index) => {
          const score = row.canonicalFirmScore;
          const band = score === null ? null : getScoreBand(score);
          const freshness = assessmentFreshness(row.lastFullAssessmentAt, row.fullyAssessed);
          return (
            <li
              key={row.firmCompanyId}
              data-testid="firm-grid-row"
              data-firm-id={row.firmCompanyId}
              className="border-t border-[var(--shell-border)] pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="w-6 shrink-0 text-xs tabular-nums text-[var(--shell-muted)]">
                    {index + 1}
                  </span>
                  <Link
                    href={`/consultants/ecosystems/${data.ecosystemId}/firm/${row.firmCompanyId}`}
                    className="-mx-2 inline-flex min-w-0 items-center gap-1 truncate rounded-md px-2 py-1 text-sm font-medium text-[var(--brand-c2-blue)] hover:bg-[rgba(6,54,116,0.06)] hover:underline"
                    data-testid="firm-grid-firm-link"
                  >
                    <span className="truncate">{row.firmCompanyName}</span>
                    <span aria-hidden="true" className="text-xs">›</span>
                  </Link>
                </div>
                <span className="pat-stat-number shrink-0 text-sm">
                  {score === null ? "--" : score}
                </span>
              </div>
              <div className="mt-1.5 pl-6">
                <svg
                  width="100%"
                  height="10"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="block"
                >
                  <rect x="0" y="0" width="100" height="10" rx="3" fill={TRACK_COLOR} />
                  {score !== null && band ? (
                    <rect
                      x="0"
                      y="0"
                      width={Math.max(0, Math.min(100, score)).toFixed(1)}
                      height="10"
                      rx="3"
                      fill={band.colorVar}
                    />
                  ) : null}
                </svg>
              </div>
              <div className="mt-1.5 pl-6 text-xs leading-5 text-[var(--shell-muted)]">
                {shortConfidence(row.confidenceLabel)} confidence · {formatPercent(row.moduleCompletionPercent)} modules ·{" "}
                <span className="tabular-nums">
                  {row.productReviewCount}/{row.productsAvailable}
                </span>{" "}
                reviews · {formatRelative(row.latestActivityAt)}
              </div>
              {/* 15e — read-only last-full-assessment date + staleness flag */}
              <div className="mt-1 flex flex-wrap items-center gap-2 pl-6 text-xs leading-5 text-[var(--shell-muted)]">
                <span>Last full assessment: {freshness.label}</span>
                {freshness.flag === "stale" ? (
                  <span className="rounded-full bg-[rgba(229,109,4,0.1)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--brand-orange)]">
                    Stale · {ASSESSMENT_STALE_DAYS}d+
                  </span>
                ) : freshness.flag === "never" ? (
                  <span className="rounded-full bg-[rgba(6,54,116,0.06)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--shell-muted)]">
                    Incomplete
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
