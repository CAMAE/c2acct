import type { AgentHealth } from "@/lib/agents/adminConsole";

const DOT_CLASS: Record<AgentHealth, string> = {
  healthy: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  idle: "bg-[var(--shell-muted)]",
};

export function StatusDot({ health, label }: { health: AgentHealth; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASS[health]}`} aria-hidden />
      {label ? <span className="text-sm text-[var(--shell-muted)]">{label}</span> : null}
    </span>
  );
}

/** Inline SVG sparkline (~80x24) over up to 24 datapoints, stroked in shell ink. */
export function Sparkline({ data, width = 80, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (data.length === 0) {
    return <svg width={width} height={height} aria-hidden />;
  }
  const max = Math.max(1, ...data);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / max) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        className="stroke-[var(--shell-ink)]"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const STATUS_TONE: Record<string, string> = {
  completed: "text-green-700",
  running: "text-sky-700",
  awaiting_approval: "text-amber-700",
  failed: "text-red-700",
  timeout: "text-red-700",
  budget_exceeded: "text-red-700",
  circuit_open: "text-red-700",
  cancelled: "text-[var(--shell-muted)]",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "text-[var(--shell-ink)]";
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${tone}`}>{status}</span>
  );
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const deltaMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(deltaMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function untilTime(iso: string | null): string {
  if (!iso) return "—";
  const deltaMs = new Date(iso).getTime() - Date.now();
  if (deltaMs <= 0) return "due";
  const mins = Math.round(deltaMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${Math.round(hrs / 24)}d`;
}
