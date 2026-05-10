import Link from "next/link";
import type { EcosystemListCardData, FirmConfidenceCounts } from "@/lib/ecosystem";

const CONFIDENCE_BUCKET_LABELS: Record<keyof FirmConfidenceCounts, string> = {
  grounded: "grounded",
  emerging: "emerging",
  sampleThin: "sample-thin",
  earlySignal: "early-signal",
  noSignal: "no-signal",
};

function formatConfidenceDistribution(counts: FirmConfidenceCounts): string {
  const total = (Object.values(counts) as number[]).reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return "No firm signal yet";
  }
  const parts: string[] = [];
  let isFirst = true;
  for (const [bucket, label] of Object.entries(CONFIDENCE_BUCKET_LABELS) as [
    keyof FirmConfidenceCounts,
    string,
  ][]) {
    const value = counts[bucket];
    if (value === 0) continue;
    if (isFirst) {
      parts.push(`${value} of ${total} firms ${label}`);
      isFirst = false;
    } else {
      parts.push(`${value} ${label}`);
    }
  }
  return parts.join(", ");
}

function formatHotDivergences(count: number): string {
  if (count === 0) return "No hot divergences";
  return `${count} hot divergence${count === 1 ? "" : "s"}`;
}

function formatActions(count: number): string {
  return `${count} action${count === 1 ? "" : "s"}`;
}

function formatModuleRate(rate: number | null): string {
  if (rate === null) return "-- modules";
  return `${rate}% modules`;
}

function formatAvgScore(score: number | null): string {
  return score === null ? "--" : String(score);
}

export default function EcosystemListCard({ data }: { data: EcosystemListCardData }) {
  const distribution = formatConfidenceDistribution(data.firmConfidenceCounts);
  const moduleBarWidth = data.moduleCompletionRate ?? 0;

  return (
    <Link
      href={`/consultants/ecosystems/${data.ecosystemId}`}
      data-testid="ecosystem-list-card"
      data-ecosystem-id={data.ecosystemId}
      className="flex flex-col rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 transition hover:border-[rgba(6,54,116,0.32)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-[var(--shell-ink)]">{data.ecosystemName}</div>
          <div className="mt-1 text-sm text-[var(--shell-muted)]">
            {data.vendorCompanyName} · {data.firmCount} firm{data.firmCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-3">
        <span
          className="font-semibold tracking-tight text-[var(--shell-ink)]"
          style={{ fontSize: "var(--pat-hero-title-size)" }}
        >
          Avg {formatAvgScore(data.avgFirmAlignmentScore)}
        </span>
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{distribution}</div>

      <div className="mt-4">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-[var(--shell-accent)]"
            style={{ width: `${Math.max(0, Math.min(100, moduleBarWidth))}%` }}
          />
        </div>
        <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          {formatModuleRate(data.moduleCompletionRate)} · {formatActions(data.thirtyDayActionCount)}
        </div>
        <div className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
          {formatHotDivergences(data.activeDivergenceCount)}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end text-base text-[var(--shell-muted)]">
        <span aria-hidden="true">›</span>
      </div>
    </Link>
  );
}
