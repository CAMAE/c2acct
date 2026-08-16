import type { EcosystemDetailData, FirmConfidenceCounts } from "@/lib/ecosystem";

// WS6.5 Block G — Day-27 P1a banned-vocab leak repair. Per WS5 word list:
// Full / Building / Limited / Initial / Pending.
// B8-2: one lexicon — Grounded / Early signal / No signal.
const CONFIDENCE_BUCKET_LABELS: Record<keyof FirmConfidenceCounts, string> = {
  grounded: "Grounded",
  emerging: "Early signal",
  sampleThin: "Early signal",
  earlySignal: "Early signal",
  noSignal: "No signal",
};

function formatConfidenceDistribution(counts: FirmConfidenceCounts): string {
  const total = (Object.values(counts) as number[]).reduce((sum, value) => sum + value, 0);
  if (total === 0) return "No firm signal yet";
  const parts: string[] = [];
  let isFirst = true;
  for (const [bucket, label] of Object.entries(CONFIDENCE_BUCKET_LABELS) as [
    keyof FirmConfidenceCounts,
    string,
  ][]) {
    const value = counts[bucket];
    if (value === 0) continue;
    if (isFirst) {
      parts.push(`${value} of ${total} invited firms ${label}`);
      isFirst = false;
    } else {
      parts.push(`${value} ${label}`);
    }
  }
  return parts.join(", ");
}

function formatRelativeTimestamp(iso: string | null): string {
  if (!iso) return "No firm activity yet";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "No firm activity yet";
  const days = Math.max(0, Math.round((Date.now() - then) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "Last activity today";
  if (days === 1) return "Last activity 1 day ago";
  if (days < 30) return `Last activity ${days} days ago`;
  const months = Math.round(days / 30);
  return `Last activity ${months} month${months === 1 ? "" : "s"} ago`;
}

export default function EcosystemHeader({ data }: { data: EcosystemDetailData }) {
  return (
    <section
      className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5"
      data-testid="ecosystem-detail-header"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-[var(--shell-ink)]">{data.vendorCompanyName}</div>
          <div className="mt-1 text-sm text-[var(--shell-muted)]">
            {data.firmCount} invited firm{data.firmCount === 1 ? "" : "s"} in this ecosystem
          </div>
        </div>
        <div className="text-sm text-[var(--shell-muted)]">{formatRelativeTimestamp(data.latestActivityAt)}</div>
      </div>
      <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
        {formatConfidenceDistribution(data.firmConfidenceCounts)}
      </div>
    </section>
  );
}
