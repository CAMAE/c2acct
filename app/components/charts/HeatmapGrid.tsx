/**
 * Heatmap grid (Elite Insights v2, V3 Alignment Gap Map). A reusable rows × cols
 * grid of tone-colored cells. For V3: rows = products, cols = modules/utilities,
 * tone = whether firms CONFIRM the vendor's story (green), read it LOWER (red /
 * orange), match it (neutral), or haven't reviewed it (none). Tone is decided by
 * the surface (with the divergence floor applied), never invented here.
 */

export type HeatTone = "confirm" | "dispute" | "neutral" | "none";

export type HeatCell = {
  key: string;
  tone: HeatTone;
  /** Cell text (e.g. a delta like "-12" or a score). */
  display?: string;
  /** Accessible/hover description. */
  title?: string;
};

export type HeatRow = { key: string; label: string; cells: HeatCell[] };

const TONE_CLASS: Record<HeatTone, string> = {
  confirm: "bg-[rgba(58,171,102,0.22)] text-[var(--shell-ink)]",
  dispute: "bg-[rgba(229,109,4,0.20)] text-[var(--brand-orange)]",
  neutral: "bg-[rgba(6,54,116,0.06)] text-[var(--shell-ink)]",
  none: "bg-white text-[var(--shell-muted)] border border-dashed border-[var(--shell-border)]",
};

export default function HeatmapGrid({
  columns,
  rows,
  title,
}: {
  columns: { key: string; label: string }[];
  rows: HeatRow[];
  title: string;
}) {
  return (
    <div className="overflow-x-auto" role="group" aria-label={title}>
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-[var(--shell-panel)] px-2 py-1 text-left font-medium text-[var(--shell-muted)]" />
            {columns.map((col) => (
              <th key={col.key} className="px-1 py-1 text-center font-medium text-[var(--shell-muted)]">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="sticky left-0 bg-[var(--shell-panel)] px-2 py-1 text-left font-medium text-[var(--shell-ink)] whitespace-nowrap">
                {row.label}
              </td>
              {row.cells.map((cell) => (
                <td key={cell.key} className="p-0">
                  <div
                    className={`flex h-9 min-w-[3rem] items-center justify-center rounded-[8px] px-1 text-center tabular-nums ${TONE_CLASS[cell.tone]}`}
                    title={cell.title}
                  >
                    {cell.display ?? ""}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-3 text-[0.7rem] text-[var(--shell-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded bg-[rgba(58,171,102,0.22)]" /> firms confirm your story
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded bg-[rgba(229,109,4,0.20)]" /> firms read you lower
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded border border-dashed border-[var(--shell-border)] bg-white" /> not yet reviewed
        </span>
      </div>
    </div>
  );
}
