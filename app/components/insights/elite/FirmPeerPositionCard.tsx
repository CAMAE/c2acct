import PercentileBand from "@/app/components/charts/PercentileBand";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import { describePercentile, type FirmPeerPosition } from "@/lib/eliteInsightsV2";

const VERDICT_CHIP: Record<FirmPeerPosition["reportCard"][number]["verdict"], { label: string; cls: string }> = {
  ahead: { label: "ahead of peers", cls: "bg-[rgba(22,163,74,0.1)] text-[var(--shell-positive)]" },
  "on par": { label: "on par", cls: "bg-[rgba(6,54,116,0.06)] text-[var(--shell-ink)]" },
  behind: { label: "behind peers", cls: "bg-[rgba(229,109,4,0.1)] text-[var(--brand-orange)]" },
  withheld: { label: "withheld", cls: "bg-[rgba(6,54,116,0.04)] text-[var(--shell-muted)]" },
};

export default function FirmPeerPositionCard({ data }: { data: FirmPeerPosition }) {
  if (!data.available) {
    return <EliteEmptyState message={data.emptyReason ?? "Peer position is not available yet."} />;
  }

  return (
    <>
      <section className="pat-card p-6">
        {data.overall ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-4xl font-semibold tabular-nums text-[var(--shell-ink)]">
              {describePercentile(data.overall.percentile, data.overall.n).split(" ")[0]}
            </span>
            <span className="text-sm text-[var(--shell-muted)]">
              percentile · you rank <span className="font-semibold text-[var(--shell-ink)]">{data.overall.rankFromTop}</span> of{" "}
              {data.overall.n} peer firms (alignment index {data.overall.score})
            </span>
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-[var(--shell-border)] px-4 py-2.5 text-sm text-[var(--shell-muted)]">
            {data.emptyReason}
          </div>
        )}
        <p className="mt-2 text-xs text-[var(--shell-muted)]">
          Cross-firm aggregate — a percentile, not a ranking of named firms. Cuts below the minimum-n safe harbor are
          withheld.
        </p>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Where you sit in each module</div>
        <div className="mt-4">
          <PercentileBand rows={data.rows} title="Per-module percentile position vs peer firms" />
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Report card</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--shell-muted)]">
                <th className="py-2 pr-3 font-medium">Module</th>
                <th className="py-2 px-3 font-medium tabular-nums">You</th>
                <th className="py-2 px-3 font-medium tabular-nums">Peer middle 50%</th>
                <th className="py-2 pl-3 font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {data.reportCard.map((row) => (
                <tr key={row.key} className="border-t border-[var(--shell-border)]">
                  <td className="py-2 pr-3 text-[var(--shell-ink)]">{row.label}</td>
                  <td className="py-2 px-3 tabular-nums text-[var(--shell-ink)]">{row.you ?? "—"}</td>
                  <td className="py-2 px-3 tabular-nums text-[var(--shell-muted)]">
                    {typeof row.peerLow === "number" && typeof row.peerHigh === "number"
                      ? `${Math.round(row.peerLow)}–${Math.round(row.peerHigh)}`
                      : "withheld"}
                  </td>
                  <td className="py-2 pl-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${VERDICT_CHIP[row.verdict].cls}`}>
                      {VERDICT_CHIP[row.verdict].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
