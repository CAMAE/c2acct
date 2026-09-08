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
}: {
  rows: FollowUpAggregateRow[];
  firmCount: number;
  firmsWithSelections: number;
}) {
  const withSignal = rows.filter((row) => row.topOption);
  return (
    <section className="pat-card p-6" data-testid="followup-aggregate-panel">
      <div className="pat-label">Follow-up picks · ecosystem</div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">Top-picked option per question</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
        {firmsWithSelections} of {firmCount} firms have option-based follow-ups. n counts named options only;
        &ldquo;Not a significant issue here&rdquo; and &ldquo;Other&rdquo; are excluded and shown separately.
      </p>
      {withSignal.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-[var(--shell-muted)]">No option-based follow-ups in this ecosystem yet.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-[var(--shell-muted)]">
                <th className="py-2 pr-3 font-semibold">Question</th>
                <th className="py-2 pr-3 font-semibold">Top pick</th>
                <th className="py-2 pr-3 font-semibold">n</th>
                <th className="py-2 pr-3 font-semibold">Firms</th>
                <th className="py-2 font-semibold">Excluded</th>
              </tr>
            </thead>
            <tbody>
              {withSignal.map((row) => (
                <tr key={row.questionKey} className="border-t border-[var(--shell-border)] align-top" data-testid="followup-aggregate-row">
                  <td className="py-3 pr-3">
                    <div className="text-xs text-[var(--shell-muted)]">
                      {row.pillar} · Q{row.index}
                    </div>
                    <div className="mt-1 max-w-[28rem] leading-6 text-[var(--shell-ink)]">{row.stem}</div>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-[var(--shell-ink)]">{row.topOption?.label}</td>
                  <td className="py-3 pr-3 pat-stat-number">{row.topOption?.count}</td>
                  <td className="py-3 pr-3">
                    {row.firmsAnswered} · {row.includedPicks} picks
                  </td>
                  <td className="py-3 text-[var(--shell-muted)]">{row.excludedPicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
