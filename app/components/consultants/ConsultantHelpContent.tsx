export default function ConsultantHelpContent() {
  return (
    <section className="pat-card p-8">
      <div className="pat-label">Consultant portal · Help</div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
        How to use this portal
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
        The consultant portal surfaces alignment patterns across the ecosystems you
        have been assigned to. Use it to review vendor and firm briefings, spot
        divergences worth flagging, and draft the next conversation with either side.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            What is an ecosystem?
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            A vendor plus the firms that have reviewed that vendor&apos;s products in
            PAT. Each card on the Ecosystems panel rolls up coverage, alignment scores,
            module completion, and active divergences for one ecosystem.
          </p>
        </div>

        <div className="pat-soft-panel p-5">
          <h3 className="text-base font-semibold text-[var(--shell-ink)]">
            Vendor brief vs firm brief
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            The vendor brief looks across the whole ecosystem: capability comparison,
            per-firm strengths and cautions, positioning visual. The firm brief drills
            into one firm: operating alignment score, stack fit per product,
            six-quarter roadmap.
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
            Need more?
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Reach out to your PAT operator. Anything that looks like a bug — stale
            data, a delta you can&apos;t explain, a firm that should be in scope
            but isn&apos;t — is worth flagging directly.
          </p>
        </div>
      </div>
    </section>
  );
}
