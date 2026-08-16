import type { FirmBriefData } from "@/lib/firmBriefs";

function formatScore(value: number | null): string {
  return value === null ? "--" : String(value);
}

function formatRelativeTimestamp(iso: string | null): string {
  if (!iso) return "No firm activity yet";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "No firm activity yet";
  const days = Math.max(0, Math.round((Date.now() - then) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "Last refresh today";
  if (days === 1) return "Last refresh 1 day ago";
  if (days < 30) return `Last refresh ${days} days ago`;
  const months = Math.round(days / 30);
  return `Last refresh ${months} month${months === 1 ? "" : "s"} ago`;
}

function shortConfidence(label: string): string {
  // B8-2: one lexicon — Grounded / Early signal / No signal.
  if (label.includes("Grounded")) return "Grounded";
  if (label.includes("Early")) return "Early signal";
  return "No signal";
}

export default function FirmAlignmentHeader({ data }: { data: FirmBriefData }) {
  const header = data.firmAlignmentHeader;

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="firm-alignment-header"
    >
      <div className="pat-label">Operating alignment score</div>
      <div className="mt-3 flex flex-wrap items-end gap-6">
        <div>
          <div
            className="pat-stat-number tracking-tight"
            style={{ fontSize: "var(--pat-hero-title-size)" }}
          >
            {formatScore(header.canonicalFirmScore)}
          </div>
          <div className="mt-1 text-sm text-[var(--shell-muted)]">
            {shortConfidence(header.confidenceLabel)}
          </div>
        </div>
        <div className="flex-1 min-w-[16rem]">
          <h2 className="text-base font-semibold tracking-tight text-[var(--shell-ink)]">
            {header.headline}
          </h2>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            {header.confidenceCallout}
          </div>
          <div className="mt-1 text-xs text-[var(--shell-muted)]">
            {formatRelativeTimestamp(header.latestActivityAt)}
          </div>
        </div>
      </div>

      {header.peerLines.length > 0 ? (
        <div className="mt-5 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
            How you compare in this ecosystem
          </div>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[var(--shell-ink)]">
            {header.peerLines.map((line, idx) => (
              <li key={idx} data-testid="firm-alignment-peer-line">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
