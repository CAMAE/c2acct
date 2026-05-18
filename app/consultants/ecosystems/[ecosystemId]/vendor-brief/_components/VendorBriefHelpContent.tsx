export default function VendorBriefHelpContent() {
  return (
    <section className="pat-card p-8">
      <div className="pat-label">Vendor brief · Help</div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
        How to read this brief
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
        The vendor brief shows how a single vendor lines up across every firm in
        this ecosystem: where they over-claim, where they under-claim, which
        capabilities are battle-tested, which are gap-able.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            Section-by-section
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            <span className="font-semibold">Executive summary</span> — headline + body
            bullets framing the alignment story.{" "}
            <span className="font-semibold">Evaluation methodology</span> — how scores
            are computed, the 10-pt hot-divergence threshold, confidence bands.{" "}
            <span className="font-semibold">Positioning visual</span> — opens with a
            capability radar (orange polygon is what the vendor says about themselves,
            blue polygon is what firms say; where orange extends past blue, the vendor
            is over-claiming), followed by the per-product paired bars for the
            granular drill-down.{" "}
            <span className="font-semibold">Strengths / cautions</span> — per-firm
            battlecards.{" "}
            <span className="font-semibold">Product comparison</span> — the
            full scoreboard plus the per-firm coverage heatmap.{" "}
            <span className="font-semibold">Action roadmap</span> — vendor-actionable
            next steps grounded in the divergence data above. Each row names a
            specific product or capability gap and pairs it with a concrete next
            step (Schedule, Refresh, Stage). Use this as the talking-point list
            for the vendor&apos;s next operating review.
          </p>
        </div>

        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            Reading the deltas
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            <span className="font-semibold text-[var(--brand-orange)]">Orange</span>{" "}
            means the vendor self-reported above the firm-reviewed average — the
            vendor is over-claiming.{" "}
            <span className="font-semibold text-green-600">Green</span> means firms
            rate the vendor higher than the vendor&apos;s self-report — the vendor
            is under-claiming. Neutral ink means no directional signal yet.
          </p>
        </div>

        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            Hot divergence
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            A row is flagged hot when the gap between vendor self-report and
            firm-reviewed average is at least 10 points in either direction.
            Hot divergences are the highest-signal places to start a conversation
            — they usually point at a specific feature, a specific implementation
            gap, or a specific firm cohort.
          </p>
        </div>

        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            How the action roadmap reads
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Each action row is a vendor verb plus a specific data anchor (a
            weak module, a low-rated product, an ecosystem caveat). PAT
            aggregates per-firm action plans into a single Q1/Q2/Q3 board
            and surfaces signal strength based on how many firms triggered
            the same action. Read it as a talking-point queue for the
            vendor&apos;s next operating review, not as a PAT to-do list.
          </p>
        </div>
      </div>
    </section>
  );
}
