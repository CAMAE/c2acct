import { getScoreBand } from "@/lib/scoreBands";

type ScoreLockupProps = {
  /** Eyebrow label above the number. */
  label: string;
  /** Score on the 0-100 scale; drives the band chip. Null renders an em dash. */
  score: number | null;
  /** Override the big number text (e.g. "3/5"). Defaults to the rounded score. */
  displayValue?: string;
  /** Suffix rendered after the number at a smaller size (e.g. "%"). */
  suffix?: string;
  /** Show the "74 · Established" band chip. Defaults to true when score is present. */
  showBand?: boolean;
  /** Signed change vs the previous reading, e.g. 3.5 renders "+3.5". */
  delta?: number | null;
  /** Muted context microcopy under the number. */
  context?: string;
};

export default function ScoreLockup({
  label,
  score,
  displayValue,
  suffix,
  showBand = true,
  delta,
  context,
}: ScoreLockupProps) {
  const band = typeof score === "number" ? getScoreBand(score) : null;
  const valueText = displayValue ?? (typeof score === "number" ? String(Math.round(score)) : "—");

  return (
    <div>
      <div className="pat-label">{label}</div>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <span className="text-[40px] font-semibold leading-none tracking-tight tabular-nums text-[var(--shell-ink)]">
          {valueText}
          {suffix ? <span className="text-[22px] font-semibold text-[var(--shell-muted)]">{suffix}</span> : null}
        </span>
        {showBand && band && typeof score === "number" ? (
          <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--shell-border)] px-2.5 py-1 text-xs font-semibold text-[var(--shell-ink)]">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: band.colorVar }}
            />
            {Math.round(score)} · {band.label}
          </span>
        ) : null}
        {typeof delta === "number" && delta !== 0 ? (
          <span
            className={`mb-1 text-sm font-semibold tabular-nums ${
              delta > 0 ? "text-[var(--shell-positive)]" : "text-[var(--brand-orange)]"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {Math.round(delta * 10) / 10}
          </span>
        ) : null}
      </div>
      {context ? <p className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">{context}</p> : null}
    </div>
  );
}
