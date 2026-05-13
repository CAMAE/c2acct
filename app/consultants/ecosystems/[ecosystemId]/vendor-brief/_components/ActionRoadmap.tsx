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

const SIGNAL_LABEL: Record<VendorBriefSignalStrength, string> = {
  high: "High signal",
  medium: "Medium signal",
  low: "Low signal",
};

const SIGNAL_COLOR: Record<VendorBriefSignalStrength, string> = {
  high: "text-[var(--brand-c2-blue)]",
  medium: "text-[var(--shell-ink)]",
  low: "text-[var(--shell-muted)]",
};

function formatGeneratedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

function roadmapActionTitle(
  vendorName: string,
  total: number,
  q1Count: number,
  q2Count: number
): string {
  if (total === 0) {
    return `No commitments surfaced from current briefings — actions populate once firms complete capability responses.`;
  }
  const nearTerm = q1Count + q2Count;
  if (nearTerm >= 3) {
    return `${nearTerm} moves ${vendorName} can make in the next two quarters to close its top capability gaps.`;
  }
  if (nearTerm > 0) {
    return `${nearTerm} near-term move${nearTerm === 1 ? "" : "s"} for ${vendorName} across Q1–Q2, with deeper work scheduled into Q3.`;
  }
  return `${total} commitment${total === 1 ? "" : "s"} queued for ${vendorName} across Q3 once the near-term board clears.`;
}

function RoadmapItem({
  item,
  totalFirms,
}: {
  item: VendorBriefRoadmapItem;
  totalFirms: number;
}) {
  const firmFraction =
    totalFirms > 0
      ? `${item.affectedFirmIds.length} of ${totalFirms} firm${totalFirms === 1 ? "" : "s"}`
      : "—";
  return (
    <div data-testid="roadmap-item" data-signal-strength={item.signalStrength} className="py-4">
      <div className="text-base font-semibold leading-snug text-[var(--shell-ink)]">
        {item.text}
      </div>
      {item.detail ? (
        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{item.detail}</p>
      ) : null}
      <div className="mt-2 text-xs text-[var(--shell-muted)]">
        <span className={`font-semibold uppercase tracking-[0.14em] ${SIGNAL_COLOR[item.signalStrength]}`}>
          {SIGNAL_LABEL[item.signalStrength]}
        </span>
        <span className="mx-2 text-[var(--shell-border)]">·</span>
        {firmFraction}
      </div>
    </div>
  );
}

function AwaitingItem({ firmsNeeded }: { firmsNeeded: number }) {
  return (
    <div data-testid="roadmap-item" data-signal-strength="awaiting" className="py-4">
      <div className="text-base font-semibold leading-snug text-[var(--shell-ink)]">
        Awaiting capability response from {firmsNeeded} more firm{firmsNeeded === 1 ? "" : "s"} to surface peer-grounded actions.
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        The action roadmap pads with this honest credibility frame rather than padding with low-signal generics. Submissions raise the surface count.
      </p>
    </div>
  );
}

function Quarter({
  label,
  emphasisId,
  items,
  totalFirms,
  isEmphasized,
  reorderable,
  data,
  fallbackText,
}: {
  label: string;
  emphasisId: string;
  items: VendorBriefRoadmapItem[];
  totalFirms: number;
  isEmphasized: boolean;
  reorderable: boolean;
  data: VendorBriefData;
  fallbackText: string;
}) {
  const activeOrder = data.editChoices.ordering[SECTION_KEY];
  const reorderItems: ReorderItem[] = items.map((item) => ({
    id: item.itemId,
    label: item.text,
    content: <RoadmapItem item={item} totalFirms={totalFirms} />,
  }));

  return (
    <div
      data-testid="roadmap-panel"
      data-window-title={label}
      data-emphasis-id={emphasisId}
      data-emphasis-active={isEmphasized ? "true" : "false"}
      className="pt-6"
    >
      <div className="pat-label text-[11px]">{label}</div>
      <div className="mt-3 text-sm font-medium text-[var(--shell-ink)]">
        {items.length === 0
          ? fallbackText
          : `${items.length} action${items.length === 1 ? "" : "s"}`}
      </div>
      {items.length === 0 ? null : reorderable ? (
        <div className="mt-2 divide-y divide-[var(--shell-border)]">
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
        <div className="divide-y divide-[var(--shell-border)]">
          {items.map((item) => (
            <RoadmapItem key={item.itemId} item={item} totalFirms={totalFirms} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActionRoadmap({ data }: { data: VendorBriefData }) {
  const variants = data.editVariants[SECTION_KEY] ?? [];
  const activeVariantId = data.editChoices.variants[SECTION_KEY];
  const activeEmphasis = data.editChoices.emphasis[SECTION_KEY] ?? [];
  const firmLabel = data.firmCount === 1 ? "firm" : "firms";
  const refreshedDate = formatGeneratedDate(data.generatedAt);

  const q1 = data.actionRoadmap.thirtyDay;
  const q2 = data.actionRoadmap.sixtyDay;
  const q3 = data.actionRoadmap.ninetyDay;
  const totalActions = q1.length + q2.length + q3.length;
  const padWithAwaiting = totalActions < 2;
  const firmsNeeded = Math.max(2 - data.firmCount, 1);

  const actionTitle = roadmapActionTitle(
    data.vendorCompanyName,
    totalActions,
    q1.length,
    q2.length
  );

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8"
      data-testid="action-roadmap"
    >
      <div className="pat-label">Section 7 · Action roadmap</div>

      <h2
        className="mt-4 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)", lineHeight: 1.15 }}
      >
        {actionTitle}
      </h2>

      <p className="mt-3 text-sm text-[var(--shell-muted)]">
        Quarterly cadence; near-term commitments at the top. 30/60/90-day sub-rhythm preserved inside each quarter for the existing template outputs.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        <Quarter
          label="Q1 · near-term (≤30 days)"
          emphasisId="thirty-day"
          items={q1}
          totalFirms={data.firmCount}
          isEmphasized={activeEmphasis.includes("thirty-day")}
          reorderable={true}
          data={data}
          fallbackText="No Q1 commitments surfaced."
        />
        <Quarter
          label="Q2 · next quarter (≤60 days)"
          emphasisId="sixty-day"
          items={q2}
          totalFirms={data.firmCount}
          isEmphasized={activeEmphasis.includes("sixty-day")}
          reorderable={false}
          data={data}
          fallbackText="No Q2 commitments surfaced."
        />
        <Quarter
          label="Q3 · long-range (≤90 days)"
          emphasisId="ninety-day"
          items={q3}
          totalFirms={data.firmCount}
          isEmphasized={activeEmphasis.includes("ninety-day")}
          reorderable={false}
          data={data}
          fallbackText="No Q3 commitments surfaced."
        />
        <div className="pt-6" data-testid="roadmap-panel" data-window-title="Q4 · post-pilot">
          <div className="pat-label text-[11px]">Q4 · post-pilot</div>
          <div className="mt-3 text-sm font-medium text-[var(--shell-ink)]">
            Unlocks after the June 1 pilot cohort completes round-one capability responses.
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Q4 actions surface from cross-firm pattern recognition that requires more submissions than today&apos;s sample carries.
          </p>
        </div>
      </div>

      {padWithAwaiting && totalActions > 0 ? (
        <div className="mt-4 border-t border-dashed border-[var(--shell-border)] pt-4">
          <AwaitingItem firmsNeeded={firmsNeeded} />
        </div>
      ) : null}

      <div
        className="mt-10 border-t border-[var(--shell-border)] pt-5 text-xs leading-6 text-[var(--shell-muted)]"
        data-testid="action-roadmap-methodology-footer"
      >
        Based on responses from {data.firmCount} {firmLabel} in your network · last refreshed {refreshedDate} · {totalActions} commitment{totalActions === 1 ? "" : "s"} aggregated across Q1–Q3 · signal strength reflects firm-count consensus · scoring methodology: see Section 3 (lands Day 22).
      </div>

      {variants.length > 0 || EMPHASIS_TARGETS.length > 0 ? (
        <div className="mt-4 space-y-3 border-t border-dashed border-[var(--shell-border)] pt-4">
          <div className="pat-label text-[10px]">Editorial controls</div>
          {variants.length > 0 ? (
            <PhrasingVariantPicker
              briefKind="vendor"
              briefId={data.vendorCompanyId}
              ecosystemId={data.ecosystemId}
              sectionKey={SECTION_KEY}
              variants={variants}
              activeVariantId={activeVariantId}
            />
          ) : null}
          <EmphasisToggle
            briefKind="vendor"
            briefId={data.vendorCompanyId}
            ecosystemId={data.ecosystemId}
            sectionKey={SECTION_KEY}
            targetElementIds={EMPHASIS_TARGETS}
            activeEmphasisIds={activeEmphasis}
          />
        </div>
      ) : null}
    </section>
  );
}
