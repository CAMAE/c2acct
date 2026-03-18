export default function BadgeExplainerPage() {
  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">Badge explainer</div>
        <h1 className="mt-3 text-4xl font-semibold">Tier 1 Unlock Semantics</h1>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/75">
        Badges are the current unlock boundary. Tier 1 remains the live unlock lane. Tier 2 is intentionally marked coming soon, not implied as already earned. Unlock evidence is backed by badge awards plus provenance records where the engine supports them.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">What unlocks now</div>
          <div className="mt-2 text-sm text-white/70">
            Self-submission badge awards and sponsor-visible observed-signal evidence where the product-intelligence lane supports it.
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">What does not unlock now</div>
          <div className="mt-2 text-sm text-white/70">
            Tier 2 content, accreditation credits, or external-review authority beyond the current observed-signal lane.
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">Tier 1</div>
          <div className="mt-2 text-sm text-white/70">Live unlock lane for current firm and product-intelligence surfaces.</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">Tier 2</div>
          <div className="mt-2 text-sm text-white/70">Coming soon. Not represented as unlocked or production-ready in the current build.</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">Entry points</div>
          <div className="mt-2 text-sm text-white/70">Use the firm, vendor, and user insight hubs to inspect where Tier 1 evidence actually opens access.</div>
        </div>
      </div>
    </section>
  );
}
