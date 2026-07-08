"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDelta } from "@/lib/formatDelta";
import type { RankedFirm, VendorSalesCardData } from "@/lib/salesCard";

/**
 * Vendor Sales Card v1 (Block F). Ranked cards of the firms in the vendor's
 * ecosystem, each a single Bullet-Theory claim (fit rank + alignment delta),
 * one evidence line (the gap this vendor closes), one action. Clicking opens a
 * five-fact detail card.
 *
 * Entitlement split (mirrors the Alignment Board): `entitled` (Elite) reveals
 * real firm names + full detail; Pro sees the same ranking as "Secret Firm N",
 * gap category + delta only, and a Reveal-with-Elite CTA. Every firm shown is
 * already inside the vendor's own ecosystem — the identity paywall is the only
 * difference, not the data boundary.
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

function deltaText(delta: number | null): string {
  return formatDelta(delta);
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

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Sales Card</div>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <div className="pat-stat-number text-5xl">
              {data.vendorStrength ?? "—"}
              {data.vendorStrength !== null ? "%" : ""}
            </div>
            <div className="text-sm text-[var(--shell-muted)]">
              {data.vendorName} · product strength across your catalog
            </div>
          </div>
          <div className="text-sm text-[var(--shell-muted)]">
            {data.rankedFirms.length} firm{data.rankedFirms.length === 1 ? "" : "s"} in your ecosystem, ranked by fit
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
          Firms where your product strengths could most close a current gap come first. Deltas are
          directional while a firm&rsquo;s assessment is thin — never faked precision.
        </p>
      </section>

      {data.rankedFirms.length === 0 ? (
        <div className="pat-card p-6 text-sm text-[var(--shell-muted)]">
          No firms in your ecosystem have a briefing yet. Ranked fit appears as firms complete their
          alignment assessments.
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.rankedFirms.map((firm) => (
            <article
              key={firm.firmCompanyId}
              data-testid="sales-card-firm"
              data-anonymized={entitled ? "0" : "1"}
              data-firm-name={entitled ? firm.firmName : undefined}
              className="pat-card p-5"
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => setDetailId(firm.firmCompanyId)}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-semibold text-[var(--shell-ink)]">
                    {firmLabel(firm, entitled)}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--shell-muted)]">
                    Fit #{firm.fitRank}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[var(--shell-muted)]">
                  {firm.gapArea}
                  {" · "}
                  {CONFIDENCE_LABEL[firm.confidence]}
                </div>
                <div className="mt-3 text-sm text-[var(--shell-muted)]">
                  Alignment delta{" "}
                  <span className="pat-stat-number text-lg text-[var(--brand-c2-blue)]">
                    {deltaText(firm.alignmentDelta)}
                  </span>
                </div>
              </button>
            </article>
          ))}
        </section>
      )}

      {detail ? (
        <section className="pat-card p-6" data-testid="sales-card-detail">
          <div className="flex items-start justify-between">
            <div className="pat-label">{firmLabel(detail, entitled)}</div>
            <button
              type="button"
              className="text-sm text-[var(--shell-muted)]"
              onClick={() => setDetailId(null)}
            >
              ✕
            </button>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {entitled ? (
              <>
                <Fact label="Firm" value={detail.firmName} />
                <Fact label="Fit rank" value={`#${detail.fitRank} of ${data.rankedFirms.length}`} />
                <Fact
                  label="Alignment delta"
                  value={`${deltaText(detail.alignmentDelta)} · ${CONFIDENCE_LABEL[detail.confidence]}`}
                />
                <Fact
                  label="Where you close their gap"
                  value={
                    detail.gapScore !== null ? `${detail.gapArea} at ${detail.gapScore}%` : detail.gapArea
                  }
                />
                <Fact label="Suggested next action" value={detail.nextAction} />
              </>
            ) : (
              <>
                <Fact label="Gap category" value={detail.gapArea} />
                <Fact label="Alignment delta" value={deltaText(detail.alignmentDelta)} />
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
