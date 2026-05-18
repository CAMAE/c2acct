import type { EcosystemDetailData, EcosystemDetailFirmRow } from "@/lib/ecosystem";

/**
 * WS6.5 Block N — consultant engagement task card.
 *
 * Surfaces the bottom-quartile firms by module completion %. Each row
 * shows the firm name, current completion %, and a suggested goal line
 * formatted as "Get {Firm} from X% to 80% by 2026-06-01".
 *
 * Persistence deferred (AUDIT-WS6.5-N-001): goal text is read-only in
 * WS6.5 scope. Adding a writable goal field requires either a new
 * ConsultantFirmGoal Prisma model or a JSON column on
 * ConsultantAssignment — both are schema-touching and were halt-listed
 * by the WS6.5 prompt for this session.
 */

const GOAL_TARGET_PCT = 80;
const GOAL_DUE_DATE = "2026-06-01";
const MIN_CARD_ROWS = 2;

function bottomQuartileFirms(
  rows: readonly EcosystemDetailFirmRow[]
): EcosystemDetailFirmRow[] {
  // WS9-EMERGENCY: only surface firms that are actually below 100%
  // completion. Without this filter, a fully-engaged ecosystem still
  // renders 3-4 ceiling-bound firms under a "Firms below median engagement"
  // header — falsely flagging firms that are doing fine.
  const belowCeiling = rows.filter(
    (row) => row.moduleCompletionPercent !== null && row.moduleCompletionPercent < 100
  );
  if (belowCeiling.length === 0) return [];
  const ranked = [...belowCeiling].sort((a, b) => {
    const av = a.moduleCompletionPercent ?? -1;
    const bv = b.moduleCompletionPercent ?? -1;
    return av - bv;
  });
  const target = Math.max(MIN_CARD_ROWS, Math.floor(rows.length / 4));
  return ranked.slice(0, target);
}

function formatCompletion(pct: number | null): string {
  if (pct === null) return "—";
  return `${Math.round(pct)}%`;
}

function suggestedGoal(row: EcosystemDetailFirmRow): string {
  const current = row.moduleCompletionPercent === null
    ? "0%"
    : `${Math.round(row.moduleCompletionPercent)}%`;
  return `Get ${row.firmCompanyName} from ${current} to ${GOAL_TARGET_PCT}% by ${GOAL_DUE_DATE}`;
}

export default function LowestEngagementFirmsCard({
  data,
}: {
  data: EcosystemDetailData;
}) {
  if (data.firmGrid.length === 0) {
    return null;
  }
  const targetFirms = bottomQuartileFirms(data.firmGrid);
  if (targetFirms.length === 0) {
    // WS9-EMERGENCY: hide the card when every firm is at the ceiling.
    return null;
  }

  return (
    <section
      className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5"
      data-testid="lowest-engagement-firms-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="pat-label">Engagement task list</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Firms below median engagement
          </h2>
        </div>
        <div className="text-xs text-[var(--shell-muted)]">
          {targetFirms.length} of {data.firmGrid.length} firm{data.firmGrid.length === 1 ? "" : "s"} &middot; ranked by module completion
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        The lowest-engaged quartile of the ecosystem. Each row carries a suggested goal you can carry into a follow-up — closing the gap to the {GOAL_TARGET_PCT}% completion line by {GOAL_DUE_DATE}.
      </p>
      <ol
        className="mt-4 divide-y divide-[var(--shell-border)]"
        data-testid="lowest-engagement-firms-list"
      >
        {targetFirms.map((row) => (
          <li
            key={row.firmCompanyId}
            className="grid grid-cols-1 gap-2 py-3 md:grid-cols-[1.4fr_auto_2fr]"
            data-testid="lowest-engagement-firm-row"
            data-firm-id={row.firmCompanyId}
          >
            <div>
              <div className="text-sm font-semibold text-[var(--shell-ink)]">
                {row.firmCompanyName}
              </div>
              <div className="mt-1 text-xs text-[var(--shell-muted)]">
                <span className="pat-stat-number">{row.productReviewCount}</span> product review{row.productReviewCount === 1 ? "" : "s"} &middot; <span className="pat-stat-number">{row.thirtyDayActionCount}</span> thirty-day action{row.thirtyDayActionCount === 1 ? "" : "s"}
              </div>
            </div>
            <div
              className="pat-stat-number text-sm !text-[var(--brand-c2-blue)] md:text-right"
              data-testid="lowest-engagement-completion"
            >
              {formatCompletion(row.moduleCompletionPercent)}
            </div>
            <div
              className="rounded-md border border-dashed border-[var(--shell-border)] bg-[var(--shell-panel-soft)]/40 px-3 py-2 text-sm leading-6 text-[var(--shell-ink)]"
              data-testid="lowest-engagement-goal"
            >
              {suggestedGoal(row)}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 text-[11px] text-[var(--shell-muted)]">
        Goal text is suggested; persistence comes in a follow-up session.
      </div>
    </section>
  );
}
