import { summarizeSubmissionScores } from "@/lib/scoring";
import type { DashboardSubmissionSnapshot } from "@/lib/patDashboard";

type Props = {
  submissions: DashboardSubmissionSnapshot[];
};

export default function SubmissionHistoryList({ submissions }: Props) {
  if (submissions.length === 0) {
    return <div className="text-sm text-[var(--shell-muted)]">No submission history yet.</div>;
  }

  return (
    <div className="grid gap-3">
      {submissions.map((submission) => {
        const scoreSummary = summarizeSubmissionScores(submission);
        const submittedAt = new Date(submission.createdAt);
        return (
          <div
            key={submission.id}
            className="rounded-[18px] border border-[var(--shell-border)] bg-white/65 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--shell-ink)]">{submission.moduleTitle}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                  {submission.moduleKey}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">
                  {scoreSummary.rawScorePct === null ? "--" : `${scoreSummary.rawScorePct}%`}
                </div>
                <div className="text-xs text-[var(--shell-muted)]">
                  {submittedAt.toLocaleDateString()} {submittedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--shell-muted)]">
              <span>Answered: {submission.answeredCount}</span>
              <span>Weighted avg: {scoreSummary.rawWeightedAvg === null ? "--" : scoreSummary.rawWeightedAvg.toFixed(2)}</span>
              <span>Signal integrity: {scoreSummary.signalIntegrityScore.toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
