export default function Outputs() {
  return (
    <section>
      <div className="mb-10">
        <h1 className="text-5xl font-semibold tracking-tight">Top Seven Outputs</h1>
        <p className="mt-3 max-w-2xl text-white/70">
          The seven institutional deliverables that define high-alignment firms.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: "Institutional Profile", desc: "Capability scoring + operational alignment snapshot." },
          { title: "Alignment Baseline", desc: "Where the firm is now â€” quantified." },
          { title: "Operating System Map", desc: "How work actually moves through the firm." },
          { title: "Automation Readiness", desc: "What can be delegated, what must stay human." },
          { title: "Risk & Control Posture", desc: "Controls, exposure, and governance maturity." },
          { title: "Implementation Roadmap", desc: "Sequenced steps to reach high alignment." },
          { title: "Executive Brief", desc: "Board-ready summary and next actions." },
        ].map((x) => (
          <div
            key={x.title}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
          >
            <div className="text-lg font-medium">{x.title}</div>
            <div className="mt-2 text-sm text-white/70">{x.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-white/70">
          Output framework interface coming next.
        </p>
      </div>
    </section>
  );
}

