import type { FollowUpAggregateRow } from "@/lib/assessment/followUpEvidence";

/**
 * MC follow-on box — ecosystem aggregate: the top-picked option per follow-up
 * question with n, over each firm's latest final submission per module. Counts
 * come only from the tested exclusion helper: "Not a significant issue here" and
 * "Other" never count, and the excluded picks are shown as a number. No insight
 * copy — numbers and sample sizes only. Mounted only behind PAT_ENABLE_FOLLOWUP_MC.
 */
export default function FollowUpAggregatePanel({
  rows,
  firmCount,
  firmsWithSelections,
  eyebrow = "Follow-up picks · ecosystem",
  title = "Top-picked option per question",
  unit = { singular: "firm", plural: "firms" },
  testId = "followup-aggregate-panel",
}: {
  rows: FollowUpAggregateRow[];
  firmCount: number;
  firmsWithSelections: number;
  /** vendor-followup-mc box: the vendor mount passes its own title and counts products; the firm defaults are unchanged. */
  eyebrow?: string;
  title?: string;
  unit?: { singular: string; plural: string };
  testId?: string;
}) {
  const withSignal = rows.filter((row) => row.topOption);
  return (
    <section className="pat-card p-6" data-testid={testId}>
      <div className="pat-label">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
        {firmsWithSelections} of {firmCount} {unit.plural} have option-based follow-ups. n counts named options only;
        &ldquo;Not a significant issue here&rdquo; and &ldquo;Other&rdquo; are excluded and shown separately.
      </p>
      {unit.plural === "firms" ? (
        // box-c (R65, item 7b): a module at 10 firms next to modules at 18 is completion, not a defect; say so.
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]" data-testid="followup-picks-count-note">
          Firm counts differ by module where a firm has not completed that module.
        </p>
      ) : null}
      {withSignal.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-[var(--shell-muted)]">No option-based follow-ups in this ecosystem yet.</p>
      ) : (
        // Stacked rows, no table and no minimum width: the app shell's <main> is a
        // flex row, so any min-width here would propagate up and overflow a 390px
        // viewport.
        <ul className="mt-5 grid gap-3">
          {withSignal.map((row) => (
            <li
              key={row.questionKey}
              className="grid gap-2 rounded-[18px] border border-[var(--shell-border)] bg-white p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]"
              data-testid="followup-aggregate-row"
            >
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--shell-muted)]">
                  {row.pillar} · Q{row.index}
                </div>
                <div className="mt-1 text-sm leading-6 text-[var(--shell-ink)]">{row.stem}</div>
              </div>
              <div className="min-w-0 text-sm">
                <div className="font-semibold text-[var(--shell-ink)]">{row.topOption?.label}</div>
                {row.topOption?.consequence ? (
                  <div className="text-sm leading-6 text-[var(--shell-muted)]">{row.topOption.consequence}</div>
                ) : null}
                <div className="mt-1 text-[var(--shell-muted)]">
                  n = <span className="pat-stat-number text-[var(--shell-ink)]">{row.topOption?.count}</span> · {row.firmsAnswered}{" "}
                  {row.firmsAnswered === 1 ? unit.singular : unit.plural} · {row.includedPicks} picks · {row.excludedPicks} excluded
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
