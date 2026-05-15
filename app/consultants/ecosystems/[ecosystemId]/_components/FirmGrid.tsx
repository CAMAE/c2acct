"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EcosystemDetailData, EcosystemDetailFirmRow } from "@/lib/ecosystem";

type SortKey =
  | "firmCompanyName"
  | "canonicalFirmScore"
  | "moduleCompletionPercent"
  | "productReviewCount"
  | "latestActivityAt";

type SortDir = "asc" | "desc";

function compareNullable<T extends number | string | null>(a: T, b: T, dir: SortDir): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (a < b) return dir === "asc" ? -1 : 1;
  if (a > b) return dir === "asc" ? 1 : -1;
  return 0;
}

function formatScore(value: number | null): string {
  return value === null ? "--" : String(value);
}

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

function shortConfidence(label: string): string {
  // Day-27 P1a/RK10: 4/22-banned terms (grounded, emerging, sample-thin,
  // early-signal) replaced with plain-language tiers reflecting submission
  // depth. The upstream confidenceLabel still uses the old vocabulary; this
  // helper maps to the consultant-facing language.
  if (label.includes("Grounded")) return "Full";
  if (label.includes("Emerging")) return "Building";
  if (label.includes("Sample-thin")) return "Limited";
  if (label.includes("Early")) return "Initial";
  return "Pending";
}

export default function FirmGrid({ data }: { data: EcosystemDetailData }) {
  const [sortKey, setSortKey] = useState<SortKey>("canonicalFirmScore");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    const arr = [...data.firmGrid];
    arr.sort((a, b) => compareNullable(a[sortKey], b[sortKey], sortDir));
    return arr;
  }, [data.firmGrid, sortKey, sortDir]);

  function toggleSort(key: SortKey, defaultDir: SortDir = "asc") {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(defaultDir);
    }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return <span aria-hidden="true">{sortDir === "asc" ? " ↑" : " ↓"}</span>;
  };

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
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Firms in ecosystem
        </h2>
        <div className="text-sm text-[var(--shell-muted)]">{data.firmGrid.length} firm{data.firmGrid.length === 1 ? "" : "s"}</div>
      </div>

      {/* WS2-C (manual-review items 13/14): 30-day actions column dropped
          from the per-firm row (the ecosystem-level HeadlineMetricsRow
          still surfaces the aggregate). Remaining 6 columns redistributed
          to fill the card width: Firm gets the auto-flexible remainder
          (~30%), each numeric column gets ~12%, Last activity gets ~12%. */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
              <th className="pb-2 pr-3 text-left">
                <button type="button" onClick={() => toggleSort("firmCompanyName", "asc")} className="font-inherit">
                  Firm{sortIndicator("firmCompanyName")}
                </button>
              </th>
              <th className="pb-2 pr-3 text-center">
                <button type="button" onClick={() => toggleSort("canonicalFirmScore", "asc")} className="font-inherit">
                  Score{sortIndicator("canonicalFirmScore")}
                </button>
              </th>
              <th className="pb-2 pr-3 text-center">Confidence</th>
              <th className="pb-2 pr-3 text-center">
                <button type="button" onClick={() => toggleSort("moduleCompletionPercent", "desc")} className="font-inherit">
                  Modules{sortIndicator("moduleCompletionPercent")}
                </button>
              </th>
              <th className="pb-2 pr-3 text-center">
                <button type="button" onClick={() => toggleSort("productReviewCount", "desc")} className="font-inherit">
                  Reviews{sortIndicator("productReviewCount")}
                </button>
              </th>
              <th className="pb-2 pr-3 text-left">
                <button type="button" onClick={() => toggleSort("latestActivityAt", "desc")} className="font-inherit">
                  Last activity{sortIndicator("latestActivityAt")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: EcosystemDetailFirmRow) => (
              <tr
                key={row.firmCompanyId}
                data-testid="firm-grid-row"
                data-firm-id={row.firmCompanyId}
                className="border-t border-[var(--shell-border)]"
              >
                <td className="py-2 pr-3 font-medium text-[var(--shell-ink)]">
                  <Link
                    href={`/consultants/ecosystems/${data.ecosystemId}/firm/${row.firmCompanyId}`}
                    className="hover:underline"
                  >
                    {row.firmCompanyName}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-center tabular-nums text-[var(--shell-ink)]">{formatScore(row.canonicalFirmScore)}</td>
                <td className="py-2 pr-3 text-center text-[var(--shell-muted)]">{shortConfidence(row.confidenceLabel)}</td>
                <td className="py-2 pr-3 text-center tabular-nums text-[var(--shell-ink)]">{formatPercent(row.moduleCompletionPercent)}</td>
                <td className="py-2 pr-3 text-center tabular-nums text-[var(--shell-ink)]">
                  {row.productReviewCount} / {row.productsAvailable}
                </td>
                <td className="py-2 pr-3 text-left text-[var(--shell-muted)]">{formatRelative(row.latestActivityAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
