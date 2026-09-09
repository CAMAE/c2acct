import Link from "next/link";
import type { ConsultantWeek } from "@/lib/consultantWeek";

/** Depth box 4: NEXT BRIEFING + "this week" on the guide home (Ecosystems panel). */
export default function ConsultantWeekCards({ week }: { week: ConsultantWeek }) {
  const { nextBriefing, thisWeek } = week;
  return (
    <section className="grid gap-5 md:grid-cols-2" data-testid="consultant-week-cards">
      <div className="pat-card p-6">
        <div className="pat-label">Next briefing</div>
        {nextBriefing ? (
          <>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{nextBriefing.vendorName}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--shell-muted)]">
              <span>
                <span className="pat-mono text-[var(--shell-ink)]">{nextBriefing.dateLabel}</span> · quarterly benchmark cut
              </span>
              <span>
                <span className="pat-mono text-[var(--shell-ink)]">{nextBriefing.firmCount}</span> firm
                {nextBriefing.firmCount === 1 ? "" : "s"} in {nextBriefing.ecosystemName}
              </span>
            </div>
            <Link href="/consultants?panel=freshness" className="pat-button-secondary mt-4 inline-flex">
              Check freshness before the cut
            </Link>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">No ecosystem is assigned to you yet, so no briefing is scheduled.</p>
        )}
      </div>
      <div className="pat-card p-6">
        <div className="pat-label">This week</div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <div className="pat-stat-number text-3xl text-[var(--shell-ink)]">{thisWeek.assessmentsSubmitted}</div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">assessment modules submitted</div>
          </div>
          <div>
            <div className="pat-stat-number text-3xl text-[var(--shell-ink)]">{thisWeek.insightsRefreshed}</div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">firm insights refreshed</div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--shell-muted)]">
          Since {thisWeek.sinceLabel}, across {thisWeek.firmsInScope} firm{thisWeek.firmsInScope === 1 ? "" : "s"} you reach.
        </p>
      </div>
    </section>
  );
}
