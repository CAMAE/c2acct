export default function FirmBriefHelpContent() {
  return (
    <section className="pat-card p-8">
      <div className="pat-label">Firm brief · Help</div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
        How to read this brief
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
        The firm brief drills into a single firm&apos;s relationship with this
        vendor: where the firm aligns, where it diverges from peers, what the
        current stack looks like, what to plan over the next six quarters.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            Section-by-section
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            <span className="font-semibold">Operating alignment</span> — canonical
            firm score plus headline and peer comparison.{" "}
            <span className="font-semibold">Five-module radar</span> — where this
            firm sits vs the peer average across the five firm modules.{" "}
            <span className="font-semibold">Stack fit</span> — product-by-product
            alignment between firm-reviewed scores and vendor self-report.{" "}
            <span className="font-semibold">Six-quarter roadmap</span> — forward-
            looking actions across Q1 through Q6.{" "}
            <span className="font-semibold">Methodology</span> — data sources and
            sample sizes feeding this brief.
          </p>
        </div>

        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            Reading the deltas (firm-side)
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            On the firm brief, the delta on the radar is{" "}
            <span className="font-semibold">firm score minus peer average</span>.{" "}
            <span className="font-semibold text-green-600">Green</span> means this
            firm is above peers — doing well in that module.{" "}
            <span className="font-semibold text-[var(--brand-orange)]">Orange</span>{" "}
            means this firm is below peers — areas to improve. Matched ink means
            this firm tracks the network average for that module.
          </p>
        </div>

        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            Reading the stack-fit deltas
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            On Stack fit, the delta is{" "}
            <span className="font-semibold">vendor self-report minus this
            firm&apos;s review</span>.{" "}
            <span className="font-semibold text-[var(--brand-orange)]">Orange</span>{" "}
            means the vendor self-reported above what this firm experiences —
            the vendor over-claims for this firm.{" "}
            <span className="font-semibold text-green-600">Green</span> means this
            firm rates the vendor above the vendor&apos;s own self-report — the
            vendor is under-claiming for this firm.
          </p>
        </div>

        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            What is connected
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            The Stack fit table feeds the vendor brief&apos;s Section 4
            (Strengths / cautions) per-firm battlecard for this firm. The
            Six-quarter roadmap will pull from the vendor brief&apos;s Action
            Roadmap once the rebuild lands (AUDIT-WS11-001); for now the roadmap
            is populated by the deterministic builder in lib/firmBriefs.ts.
          </p>
        </div>
      </div>
    </section>
  );
}
