import { getScoreBand, TRACK_COLOR } from "@/lib/scoreBands";

/**
 * A single 0-100 score as a band-colored horizontal bar on a muted track — the
 * lightweight companion to ScoreLockup for catalog/summary cards. Colour comes
 * from the ONE band lexicon (getScoreBand), so a score reads the same hue here as
 * on the radar/heatmap. Null score renders an empty track (no signal yet).
 */
export default function ScoreBar({ score, title }: { score: number | null; title: string }) {
  const pct = score === null ? 0 : Math.max(4, Math.min(100, score));
  const color = score === null ? TRACK_COLOR : getScoreBand(score).colorVar;
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full"
      style={{ background: TRACK_COLOR }}
      role="img"
      aria-label={score === null ? `${title}: no score yet` : `${title}: ${Math.round(score)} of 100`}
    >
      {score === null ? null : <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />}
    </div>
  );
}
