import EmphasisToggle from "@/app/components/consultants/briefEdits/EmphasisToggle";
import PhrasingVariantPicker from "@/app/components/consultants/briefEdits/PhrasingVariantPicker";
import ReorderHandle, {
  type ReorderItem,
} from "@/app/components/consultants/briefEdits/ReorderHandle";
import type {
  VendorBriefData,
  VendorBriefRoadmapItem,
  VendorBriefSignalStrength,
} from "@/lib/briefs";

const SECTION_KEY = "vendor.action-roadmap" as const;
const EMPHASIS_TARGETS = ["bullet-commitment", "thirty-day", "sixty-day", "ninety-day"];

const SIGNAL_BADGE_CLASSES: Record<VendorBriefSignalStrength, string> = {
  high: "bg-[var(--brand-accent)] text-white",
  medium: "border border-[var(--brand-accent)] text-[var(--brand-accent)]",
  low: "border border-[var(--shell-border)] text-[var(--shell-muted)]",
};

function RoadmapItemCard({
  item,
  totalFirms,
}: {
  item: VendorBriefRoadmapItem;
  totalFirms: number;
}) {
  return (
    <div
      data-testid="roadmap-item"
      data-signal-strength={item.signalStrength}
      className="rounded-[14px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-[var(--shell-ink)]">{item.text}</div>
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
    </div>
  );
}

function RoadmapPanel({
  title,
  emphasisId,
  items,
  totalFirms,
  isEmphasized,
  reorderable,
  data,
}: {
  title: string;
  emphasisId: string;
  items: VendorBriefRoadmapItem[];
  totalFirms: number;
  isEmphasized: boolean;
  reorderable: boolean;
  data: VendorBriefData;
}) {
  const activeOrder = data.editChoices.ordering[SECTION_KEY];

  const reorderItems: ReorderItem[] = items.map((item) => ({
    id: item.itemId,
    label: item.text,
    content: <RoadmapItemCard item={item} totalFirms={totalFirms} />,
  }));

  return (
    <div
      className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4"
      data-testid="roadmap-panel"
      data-window-title={title}
      data-emphasis-id={emphasisId}
      data-emphasis-active={isEmphasized ? "true" : "false"}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
        {title}
      </div>
      <div className="mt-2 text-sm font-semibold text-[var(--shell-ink)]">
        {items.length} action{items.length === 1 ? "" : "s"}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--shell-muted)]">No actions in this window.</p>
      ) : reorderable ? (
        <div className="mt-3">
          <ReorderHandle
            briefKind="vendor"
            briefId={data.vendorCompanyId}
            ecosystemId={data.ecosystemId}
            sectionKey={SECTION_KEY}
            items={reorderItems}
            activeOrder={activeOrder}
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.itemId}>
              <RoadmapItemCard item={item} totalFirms={totalFirms} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ActionRoadmap({ data }: { data: VendorBriefData }) {
  const variants = data.editVariants[SECTION_KEY] ?? [];
  const activeVariantId = data.editChoices.variants[SECTION_KEY];
  const activeEmphasis = data.editChoices.emphasis[SECTION_KEY] ?? [];

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

      {variants.length > 0 ? (
        <div className="mb-4">
          <PhrasingVariantPicker
            briefKind="vendor"
            briefId={data.vendorCompanyId}
            ecosystemId={data.ecosystemId}
            sectionKey={SECTION_KEY}
            variants={variants}
            activeVariantId={activeVariantId}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <RoadmapPanel
          title="30 days"
          emphasisId="thirty-day"
          items={data.actionRoadmap.thirtyDay}
          totalFirms={data.firmCount}
          isEmphasized={activeEmphasis.includes("thirty-day")}
          reorderable={true}
          data={data}
        />
        <RoadmapPanel
          title="60 days"
          emphasisId="sixty-day"
          items={data.actionRoadmap.sixtyDay}
          totalFirms={data.firmCount}
          isEmphasized={activeEmphasis.includes("sixty-day")}
          reorderable={false}
          data={data}
        />
        <RoadmapPanel
          title="90 days"
          emphasisId="ninety-day"
          items={data.actionRoadmap.ninetyDay}
          totalFirms={data.firmCount}
          isEmphasized={activeEmphasis.includes("ninety-day")}
          reorderable={false}
          data={data}
        />
      </div>

      <div className="mt-4">
        <EmphasisToggle
          briefKind="vendor"
          briefId={data.vendorCompanyId}
          ecosystemId={data.ecosystemId}
          sectionKey={SECTION_KEY}
          targetElementIds={EMPHASIS_TARGETS}
          activeEmphasisIds={activeEmphasis}
        />
      </div>
    </section>
  );
}
