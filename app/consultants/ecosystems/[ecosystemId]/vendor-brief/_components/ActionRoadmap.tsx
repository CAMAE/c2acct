import type {
  VendorBriefData,
  VendorBriefRoadmapItem,
  VendorBriefSignalStrength,
} from "@/lib/briefs";

const SIGNAL_BADGE_CLASSES: Record<VendorBriefSignalStrength, string> = {
  high: "bg-[var(--brand-accent)] text-white",
  medium: "border border-[var(--brand-accent)] text-[var(--brand-accent)]",
  low: "border border-[var(--shell-border)] text-[var(--shell-muted)]",
};

function RoadmapPanel({
  title,
  items,
  totalFirms,
}: {
  title: string;
  items: VendorBriefRoadmapItem[];
  totalFirms: number;
}) {
  return (
    <div
      className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4"
      data-testid="roadmap-panel"
      data-window-title={title}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
        {title}
      </div>
      <div className="mt-2 text-sm font-semibold text-[var(--shell-ink)]">
        {items.length} action{items.length === 1 ? "" : "s"}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--shell-muted)]">
          No actions in this window.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li
              key={item.itemId}
              data-testid="roadmap-item"
              data-signal-strength={item.signalStrength}
              className="rounded-[14px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-medium text-[var(--shell-ink)]">
                  {item.text}
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${SIGNAL_BADGE_CLASSES[item.signalStrength]}`}
                >
                  {item.signalStrength}
                </span>
              </div>
              {item.detail ? (
                <div className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
                  {item.detail}
                </div>
              ) : null}
              <div className="mt-2 text-xs text-[var(--shell-muted)]">
                {item.affectedFirmIds.length} of {totalFirms} firm
                {totalFirms === 1 ? "" : "s"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ActionRoadmap({ data }: { data: VendorBriefData }) {
  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="action-roadmap"
    >
      <div className="mb-4">
        <div className="pat-label">Action roadmap</div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
          What this ecosystem is committing to next
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <RoadmapPanel title="30 days" items={data.actionRoadmap.thirtyDay} totalFirms={data.firmCount} />
        <RoadmapPanel title="60 days" items={data.actionRoadmap.sixtyDay} totalFirms={data.firmCount} />
        <RoadmapPanel title="90 days" items={data.actionRoadmap.ninetyDay} totalFirms={data.firmCount} />
      </div>
    </section>
  );
}
