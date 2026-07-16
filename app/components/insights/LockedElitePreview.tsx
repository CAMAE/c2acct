import Link from "next/link";

/**
 * B8-8: ONE honest locked-Elite preview. These surfaces are LIVE for Elite
 * members — so the state is "Live with Elite membership", never "Coming soon".
 * It shows the real v2 surface name and a real chart STRUCTURE with the values
 * blurred out (structure honest, numbers withheld), plus the upgrade CTA. Used
 * on firm + vendor, list + detail. Where a surface has no Elite layer at all,
 * callers render NO Elite toggle instead of this.
 */

export type LockedElitePreviewProps = {
  /** The v2 surface name (from FIRM_ELITE_V2_META / VENDOR_ELITE_V2_META). */
  title: string;
  /** One-line description of what the Elite surface delivers. */
  description: string;
  /** Which chart structure to silhouette behind the blur. */
  shape?: "bars" | "line" | "distribution";
  /** Upgrade destination. */
  upgradeHref: string;
  ctaLabel?: string;
};

function ChartSilhouette({ shape }: { shape: "bars" | "line" | "distribution" }) {
  const accent = "var(--shell-accent, #063874)";
  if (shape === "line") {
    return (
      <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
        <polyline
          points="4,74 40,60 76,64 112,40 148,30 192,16"
          fill="none"
          stroke={accent}
          strokeWidth="3"
          opacity="0.5"
        />
        {[74, 60, 64, 40, 30, 16].map((y, i) => (
          <circle key={i} cx={4 + i * 37.6} cy={y} r="3.5" fill={accent} opacity="0.55" />
        ))}
      </svg>
    );
  }
  if (shape === "distribution") {
    return (
      <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
        <path
          d="M4 82 C 60 82, 70 14, 100 14 C 130 14, 140 82, 196 82"
          fill={accent}
          opacity="0.16"
        />
        <line x1="132" y1="18" x2="132" y2="82" stroke={accent} strokeWidth="3" opacity="0.55" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true">
      {[52, 70, 40, 82, 60, 74].map((h, i) => (
        <rect key={i} x={8 + i * 32} y={86 - h} width="20" height={h} rx="3" fill={accent} opacity="0.42" />
      ))}
    </svg>
  );
}

export default function LockedElitePreview({
  title,
  description,
  shape = "bars",
  upgradeHref,
  ctaLabel = "Live with Elite membership",
}: LockedElitePreviewProps) {
  return (
    <section className="pat-card p-6" data-testid="locked-elite-preview">
      <div className="flex items-start justify-between gap-4">
        <div className="text-lg font-semibold text-[var(--shell-ink)]">{title}</div>
        <span className="rounded-full bg-[rgba(6,54,116,0.08)] px-3 py-1 text-xs font-semibold text-[var(--shell-accent)]">
          Elite
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{description}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--shell-muted)]">
        Built on firm-reviewed evidence, not self-report — Elite membership brings it live.
      </p>

      <div className="relative mt-4 overflow-hidden rounded-[14px] border border-[var(--shell-border)] bg-[var(--shell-panel)]">
        {/* Real chart STRUCTURE, values withheld behind a blur. */}
        <div className="h-32 w-full p-3" style={{ filter: "blur(6px)" }} aria-hidden="true">
          <ChartSilhouette shape={shape} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(255,255,255,0.35)]">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--shell-accent)]">
            {ctaLabel}
          </span>
        </div>
      </div>

      <Link
        href={upgradeHref}
        className="pat-button-primary mt-4 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold"
      >
        {ctaLabel}
      </Link>
    </section>
  );
}
