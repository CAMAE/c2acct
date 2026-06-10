export type ProgressMeterChip = {
  key: string;
  label: string;
  done: boolean;
};

type ProgressMeterProps = {
  completed: number;
  total: number;
  /** Unit noun for the readout, e.g. "modules" -> "3 of 5 modules". */
  unitLabel: string;
  /** Accessible description for the meter. */
  title: string;
  /** Unlock-requirement chips; incomplete ones render dashed. */
  chips?: ProgressMeterChip[];
  /** Muted context microcopy under the meter. */
  context?: string;
};

const SEGMENT_WIDTH = 100;
const SEGMENT_GAP = 6;

export default function ProgressMeter({ completed, total, unitLabel, title, chips, context }: ProgressMeterProps) {
  const safeTotal = Math.max(1, total);
  const safeCompleted = Math.max(0, Math.min(safeTotal, completed));
  const viewWidth = safeTotal * SEGMENT_WIDTH + (safeTotal - 1) * SEGMENT_GAP;

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-[var(--shell-ink)]">
          {safeCompleted} of {safeTotal}
        </span>
        <span className="text-sm text-[var(--shell-muted)]">{unitLabel}</span>
      </div>
      <svg
        width="100%"
        height="10"
        viewBox={`0 0 ${viewWidth} 10`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title}: ${safeCompleted} of ${safeTotal} ${unitLabel}`}
        className="mt-2 block"
      >
        <title>{`${title}: ${safeCompleted} of ${safeTotal} ${unitLabel}`}</title>
        {Array.from({ length: safeTotal }, (_, idx) => (
          <rect
            key={idx}
            x={idx * (SEGMENT_WIDTH + SEGMENT_GAP)}
            y="0"
            width={SEGMENT_WIDTH}
            height="10"
            rx="3"
            fill={idx < safeCompleted ? "var(--brand-c2-blue)" : "rgba(6, 54, 116, 0.10)"}
          />
        ))}
      </svg>
      {chips?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className={
                chip.done
                  ? "inline-flex items-center gap-1.5 rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] px-3 py-1.5 text-xs font-medium text-[var(--shell-ink)]"
                  : "inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--shell-border)] px-3 py-1.5 text-xs font-medium text-[var(--shell-muted)]"
              }
            >
              {chip.done ? (
                <span aria-hidden="true" className="text-[var(--shell-positive)]">
                  ✓
                </span>
              ) : null}
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
      {context ? <p className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">{context}</p> : null}
    </div>
  );
}
