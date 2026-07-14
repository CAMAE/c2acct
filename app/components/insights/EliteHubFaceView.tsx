import type { EliteHubChip, EliteHubFace, EliteHubMicro } from "@/lib/eliteHubFace";

/**
 * Block 12g — the Elite hub face: ONE hero number, an optional colored chip and
 * an optional micro-visual for the second quantity, and a one-line sub. Replaces
 * the wordy compound metric + description on the entitled Elite hub cards.
 */

const HERO_TONE: Record<NonNullable<EliteHubFace["heroTone"]>, string> = {
  positive: "text-[var(--shell-positive)]",
  negative: "text-[var(--brand-orange)]",
  amber: "text-[var(--brand-orange)]",
};

const CHIP_TONE: Record<EliteHubChip["tone"], string> = {
  positive: "bg-[rgba(58,171,102,0.16)] text-[var(--shell-positive)]",
  amber: "bg-[rgba(229,109,4,0.14)] text-[var(--brand-orange)]",
  neutral: "bg-[rgba(6,54,116,0.06)] text-[var(--shell-ink)]",
};

function Micro({ micro }: { micro: EliteHubMicro }) {
  if (micro.kind === "percentile-band") {
    const pct = Math.max(0, Math.min(100, micro.percentile));
    return (
      <div className="mt-3" aria-hidden="true">
        <div className="relative h-2 w-full rounded-full bg-[rgba(6,54,116,0.08)]">
          {/* top-quartile zone */}
          <div className="absolute inset-y-0 right-0 w-1/4 rounded-r-full bg-[rgba(58,171,102,0.18)]" />
          {/* you marker */}
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--brand-c2-blue,#063674)]"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>
    );
  }
  if (micro.kind === "band-dots") {
    return (
      <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: micro.total }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${
              i < micro.filled ? "bg-[var(--shell-positive)]" : "bg-[rgba(6,54,116,0.14)]"
            }`}
          />
        ))}
      </div>
    );
  }
  // two-segment bar (confirmed vs read-lower)
  const total = micro.confirmed + micro.lower;
  const confirmedPct = total > 0 ? (micro.confirmed / total) * 100 : 0;
  return (
    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]" aria-hidden="true">
      <div className="h-full bg-[var(--shell-positive)]" style={{ width: `${confirmedPct}%` }} />
      <div className="h-full bg-[var(--brand-orange)]" style={{ width: `${100 - confirmedPct}%` }} />
    </div>
  );
}

export default function EliteHubFaceView({ face }: { face: EliteHubFace }) {
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={`text-3xl font-semibold leading-none tracking-tight tabular-nums ${
            face.heroTone ? HERO_TONE[face.heroTone] : "text-[var(--shell-ink)]"
          }`}
        >
          {face.hero}
        </span>
        {face.chip ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${CHIP_TONE[face.chip.tone]}`}>
            {face.chip.arrow ? <span aria-hidden="true">{face.chip.arrow === "up" ? "↗" : "↘"}</span> : null}
            {face.chip.label}
          </span>
        ) : null}
      </div>
      {face.micro ? <Micro micro={face.micro} /> : null}
      <p className="mt-2 text-xs text-[var(--shell-muted)]">{face.sub}</p>
    </div>
  );
}
