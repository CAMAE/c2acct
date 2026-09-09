/**
 * Depth box 8 (2026-09-09, flag-on): the right-rail preview on onboarding and
 * account creation — "what you will have in 20 minutes": the alignment radar,
 * blank at the start, filling one axis per completed step.
 */
const AXES = ["Strategy", "Operations", "Automation", "Integration", "Governance"] as const;
const CENTER = { x: 120, y: 118 };
const R = 82;

function point(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / AXES.length;
  return { x: CENTER.x + radius * Math.cos(angle), y: CENTER.y + radius * Math.sin(angle) };
}

export default function OnboardingPreviewRail({
  completed,
  total,
  steps,
}: {
  completed: number;
  total: number;
  steps: readonly string[];
}) {
  const filledAxes = Math.max(0, Math.min(AXES.length, Math.round((completed / Math.max(total, 1)) * AXES.length)));
  const shape = AXES.map((_, index) => point(index, index < filledAxes ? R * 0.78 : R * 0.12));
  return (
    <aside className="pat-card p-6 lg:sticky lg:top-24 lg:self-start" aria-label="What you will have in 20 minutes" data-testid="onboarding-preview-rail">
      <div className="pat-label">In 20 minutes you will have</div>
      <svg viewBox="0 0 240 240" className="mx-auto mt-4 block h-auto w-full max-w-[240px]" role="img" aria-label={`Alignment radar preview, ${filledAxes} of ${AXES.length} axes filled`}>
        <g stroke="#d9e0ea" fill="none" strokeWidth="1">
          {[1, 0.66, 0.33].map((scale) => (
            <polygon key={scale} points={AXES.map((_, index) => `${point(index, R * scale).x},${point(index, R * scale).y}`).join(" ")} />
          ))}
          {AXES.map((_, index) => (
            <path key={index} d={`M${CENTER.x},${CENTER.y} L${point(index, R).x},${point(index, R).y}`} />
          ))}
        </g>
        <polygon
          points={shape.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="rgba(6,54,116,0.10)"
          stroke="var(--brand-c2-blue)"
          strokeWidth="2"
          strokeLinejoin="round"
          opacity={filledAxes === 0 ? 0.35 : 1}
        />
        <g fontSize="11" fill="var(--shell-muted)" fontWeight="700" textAnchor="middle">
          {AXES.map((label, index) => {
            const p = point(index, R + 22);
            return (
              <text key={label} x={p.x} y={p.y + 4}>
                {label}
              </text>
            );
          })}
        </g>
      </svg>
      <ol className="mt-4 grid gap-2 text-sm">
        {steps.map((step, index) => {
          const done = index < completed;
          return (
            <li key={step} className="flex items-center gap-2 text-[var(--shell-muted)]">
              <span
                aria-hidden="true"
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  done ? "border-[var(--brand-c2-blue)] bg-[var(--brand-c2-blue)] text-white" : "border-[var(--shell-border)]"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className={done ? "text-[var(--shell-ink)]" : ""}>{step}</span>
            </li>
          );
        })}
      </ol>
      <p className="pat-meta mt-4 text-[var(--shell-muted)]">
        Your first five-module assessment fills all five axes; each module takes about four minutes.
      </p>
    </aside>
  );
}
