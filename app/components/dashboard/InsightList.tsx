type UnlockedInsight = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
  unlockReason: string;
  evidence?: {
    requiredBadgeIds: string[];
    earnedBadgeIds: string[];
    missingBadgeIds: string[];
  };
};

type Props = {
  insights: UnlockedInsight[];
  emptyCopy: string;
};

export default function InsightList({ insights, emptyCopy }: Props) {
  if (insights.length === 0) {
    return <div className="text-sm leading-6 text-[var(--shell-muted)]">{emptyCopy}</div>;
  }

  return (
    <div className="grid gap-4">
      {insights.map((insight) => (
        <article key={insight.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/65 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                Tier {insight.tier} insight
              </div>
              <h3 className="mt-2 text-lg font-semibold text-[var(--shell-ink)]">{insight.title}</h3>
            </div>
            <div className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
              {insight.unlockReason.replaceAll("_", " ")}
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--shell-muted)]">{insight.body}</p>
          {insight.evidence?.earnedBadgeIds?.length ? (
            <div className="mt-3 text-xs text-[var(--shell-muted)]">
              Unlock evidence: {insight.evidence.earnedBadgeIds.length} required badge rule
              {insight.evidence.earnedBadgeIds.length === 1 ? "" : "s"} satisfied.
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
