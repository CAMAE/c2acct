import CardChip, { CardChipRow } from "@/app/components/cards/CardChip";
import FreshnessChip from "@/app/components/freshness/FreshnessChip";
import NudgeButtonMount from "@/app/components/notifications/NudgeButtonMount";
import type {
  ConsultantFreshnessBoard,
  ConsultantFirmFreshnessRow,
  ConsultantFirmFreshnessStatus,
} from "@/lib/consultantFreshness";

/**
 * 16e — consultant freshness board (P2-1). Per-consultant view of every firm they
 * advise: evidence freshness (canonical readFreshness) + next re-assessment due
 * (canonical cadence reader) + a one-click Pat-drafted nudge on the consultant's
 * behalf. No-guilt copy: state the benchmark consequence, let the consultant
 * decide. Freshness is a label, never a score multiplier.
 */

const STATUS_LABEL: Record<ConsultantFirmFreshnessStatus, string> = {
  never: "Never assessed",
  overdue: "Census overdue",
  "due-soon": "Due before cutoff",
  "on-track": "On track",
};

const STATUS_TONE: Record<ConsultantFirmFreshnessStatus, "neutral" | "positive" | "amber" | "muted"> = {
  never: "amber",
  overdue: "amber",
  "due-soon": "neutral",
  "on-track": "positive",
};

function consequenceLine(row: ConsultantFirmFreshnessRow): string {
  switch (row.status) {
    case "never":
      return "No full census on record yet — a first assessment establishes this firm's benchmark position.";
    case "overdue":
      return "Its census window has passed, so its evidence is falling behind the cohort it is measured against.";
    case "due-soon":
      return "Its census comes due before the cutoff — refreshing keeps its benchmark position comparable.";
    case "on-track":
      return "Its evidence is current for this cycle; no action needed now.";
  }
}

function FirmRow({ row }: { row: ConsultantFirmFreshnessRow }) {
  return (
    <div className="pat-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-[var(--shell-ink)]">{row.companyName}</div>
          {row.ecosystems.length > 0 ? (
            <p className="mt-1 text-xs leading-5 text-[var(--shell-muted)]">
              {row.ecosystems.join(" · ")}
            </p>
          ) : null}
        </div>
        <CardChip tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</CardChip>
      </div>

      <CardChipRow>
        {row.freshness ? (
          <FreshnessChip reading={row.freshness} showAge={false} />
        ) : (
          <CardChip tone="muted">No evidence yet</CardChip>
        )}
        <CardChip tone="muted">
          {row.freshness ? `Last census: ${row.freshness.asOfLabel}` : "Last census: none"}
        </CardChip>
        <CardChip tone="muted">
          {row.nextCensusDueLabel ? `Next due: ${row.nextCensusDueLabel}` : "Next due: after first census"}
        </CardChip>
      </CardChipRow>

      <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{consequenceLine(row)}</p>

      <div className="mt-4">
        <NudgeButtonMount companyId={row.companyId} audience="firm" label="Draft a reminder" />
        <p className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
          Pat drafts it for your review — nothing sends until you approve it in your nudge queue.
        </p>
      </div>
    </div>
  );
}

export default function FreshnessBoard({ board }: { board: ConsultantFreshnessBoard }) {
  const { summary, cutoffLabel, firms } = board;

  if (firms.length === 0) {
    return (
      <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
        No firms are assigned to you yet. Once your ecosystems include firms, their re-assessment freshness shows up here.
      </div>
    );
  }

  const headline =
    summary.needsAttention === 0
      ? `All ${summary.total} of your firms are current through ${cutoffLabel}.`
      : `${summary.needsAttention} of your ${summary.total} firms come due for re-assessment before ${cutoffLabel}.`;

  return (
    <div className="space-y-5">
      <section className="pat-card p-6" data-testid="consultant-freshness-summary">
        <div className="pat-label">Re-assessment freshness</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{headline}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
          Windows come from each firm&apos;s configured cadence (default: a full census every 12 months). Freshness
          is a label on the evidence date — it never changes a firm&apos;s score. Send a reminder when it helps; the
          decision to re-assess is the firm&apos;s.
        </p>
        <CardChipRow>
          {summary.overdue > 0 ? <CardChip tone="amber">{summary.overdue} overdue</CardChip> : null}
          {summary.dueSoon > 0 ? <CardChip tone="neutral">{summary.dueSoon} due before {cutoffLabel}</CardChip> : null}
          {summary.never > 0 ? <CardChip tone="amber">{summary.never} never assessed</CardChip> : null}
          {summary.onTrack > 0 ? <CardChip tone="positive">{summary.onTrack} on track</CardChip> : null}
        </CardChipRow>
      </section>

      <div className="space-y-3" data-testid="consultant-freshness-firms">
        {firms.map((row) => (
          <FirmRow key={row.companyId} row={row} />
        ))}
      </div>
    </div>
  );
}
