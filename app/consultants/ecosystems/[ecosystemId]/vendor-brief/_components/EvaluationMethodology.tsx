import type { VendorBriefData } from "@/lib/briefs";

function formatGeneratedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export default function EvaluationMethodology({ data }: { data: VendorBriefData }) {
  const firmLabel = data.firmCount === 1 ? "firm" : "firms";
  const refreshedDate = formatGeneratedDate(data.generatedAt);
  const productLabel = data.productCount === 1 ? "product" : "products";
  const responseCount = data.methodology.sampleSizes.reviewCount;
  const submissionCount = data.methodology.sampleSizes.submissionCount;

  return (
    <section
      id="section-2-methodology"
      className="scroll-mt-8 rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8"
      data-testid="evaluation-methodology"
    >
      <div className="pat-label">Section 2 · Evaluation methodology</div>

      <h2
        className="mt-4 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)", lineHeight: 1.15 }}
      >
        This brief evaluates {data.vendorCompanyName} across {data.productCount} {productLabel}, scored by {responseCount} firm response{responseCount === 1 ? "" : "s"} and weighted against vendor self-assessment.
      </h2>

      <p className="mt-3 text-sm text-[var(--shell-muted)]">
        Every score and every footer reference to &ldquo;see Section 2&rdquo; resolves to this block. The rubric below applies network-wide.
      </p>

      <div className="mt-8 divide-y divide-[var(--shell-border)]">
        <div className="py-6">
          <div className="pat-label text-[11px]">What we measure</div>
          <div className="mt-3 text-base leading-7 text-[var(--shell-ink)]">
            {data.productCount === 0 ? (
              <p className="text-[var(--shell-muted)]">
                {data.vendorCompanyName} has not yet published a product catalog for this ecosystem; the rubric activates once a catalog and at least one firm response are on file.
              </p>
            ) : (
              <>
                <p>
                  Each of the vendor&apos;s {data.productCount} {productLabel} is evaluated as a capability area. The capability areas in scope for this brief:
                </p>
                <ul
                  className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-ink)]"
                  data-testid="methodology-capability-list"
                >
                  {data.selfVsMarketDelta.map((row) => (
                    <li key={row.productId} className="flex gap-3">
                      <span
                        className="shrink-0 select-none text-[var(--brand-c2-blue)]"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <span>
                        <span className="font-semibold">{row.productName}</span>
                        <span className="text-[var(--shell-muted)]">
                          {" "}
                          &mdash; {row.firmReviewCount} firm review{row.firmReviewCount === 1 ? "" : "s"} on file
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="py-6">
          <div className="pat-label text-[11px]">How we score</div>
          <div className="mt-3 space-y-3 text-base leading-7 text-[var(--shell-ink)]">
            <p>
              Capability scores are normalized to a 0&ndash;100 scale. Vendor self-assessment is tracked separately and compared to the average of firm-reviewed scores for the same capability. The delta is rounded to whole points (vendor minus firm).
            </p>
            <p>
              A delta of <span className="font-semibold tabular-nums">&ge; 10 points</span> in either direction flags as a <span className="font-semibold text-[var(--brand-orange)]">hot divergence</span>. Below 10 points the delta is treated as conversation-grade noise. Bands for capability-cell color in Section 5: <span className="font-semibold">high &ge; 75</span>, <span className="font-semibold">mid 50&ndash;74</span>, <span className="font-semibold">low &lt; 50</span>, <span className="font-semibold">not yet reviewed</span> for null cells.
            </p>
            <p className="text-sm text-[var(--shell-muted)]">
              Confidence reflects how many firms have submitted responses for each capability. The Executive Summary in Section 1 surfaces the ecosystem-wide coverage. A brief built primarily from limited firm responses should be read as preliminary; expect resolution to sharpen as more firms respond.
            </p>
          </div>
        </div>

        <div className="py-6">
          <div className="pat-label text-[11px]">Who responded</div>
          <dl className="mt-3 grid grid-cols-1 gap-y-2 text-base leading-7 text-[var(--shell-ink)] md:grid-cols-[max-content_1fr] md:gap-x-6">
            <dt className="text-[var(--shell-muted)]">Firms in scope</dt>
            <dd className="font-semibold tabular-nums">{data.firmCount}</dd>
            <dt className="text-[var(--shell-muted)]">Firm-side submissions</dt>
            <dd className="font-semibold tabular-nums">{submissionCount}</dd>
            <dt className="text-[var(--shell-muted)]">Firm-side product reviews</dt>
            <dd className="font-semibold tabular-nums">{responseCount}</dd>
            <dt className="text-[var(--shell-muted)]">Vendor self-assessment</dt>
            <dd className="font-semibold">
              {data.productCount > 0 ? `${data.productCount} ${productLabel} on file` : "Awaiting vendor self-assessment"}
            </dd>
            <dt className="text-[var(--shell-muted)]">Brief last refreshed</dt>
            <dd className="font-semibold tabular-nums">{refreshedDate}</dd>
          </dl>
        </div>
      </div>

      <div
        className="mt-10 border-t border-[var(--shell-border)] pt-5 text-xs leading-6 text-[var(--shell-muted)]"
        data-testid="evaluation-methodology-methodology-footer"
      >
        This methodology applies to all sections in this brief · last revised on the canonical 5.7 audit baseline · based on responses from {data.firmCount} {firmLabel} in your network · feedback: file as a Day-N ticket.
      </div>
    </section>
  );
}
