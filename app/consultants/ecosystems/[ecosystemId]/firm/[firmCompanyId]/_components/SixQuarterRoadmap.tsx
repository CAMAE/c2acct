import EmphasisToggle from "@/app/components/consultants/briefEdits/EmphasisToggle";
import PhrasingVariantPicker from "@/app/components/consultants/briefEdits/PhrasingVariantPicker";
import ReorderHandle, {
  type ReorderItem,
} from "@/app/components/consultants/briefEdits/ReorderHandle";
import type {
  FirmBriefData,
  FirmBriefRoadmapAction,
  FirmBriefRoadmapQuarter,
} from "@/lib/firmBriefs";

const SECTION_KEY = "firm.six-quarter-roadmap" as const;
const EMPHASIS_TARGETS = ["trajectory", "current-quarter"];

const SOURCE_LABEL: Record<FirmBriefRoadmapAction["source"], string> = {
  "next-action": "Next action",
  "stack-gap": "Stack gap",
  "module-completion": "Module",
  "peer-gap": "Peer gap",
};

const SOURCE_CHIP_CLASS: Record<FirmBriefRoadmapAction["source"], string> = {
  "next-action": "bg-[var(--brand-c2-blue)] text-white",
  "stack-gap": "border border-[var(--brand-orange)] text-[var(--brand-orange)]",
  "module-completion":
    "border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] text-[var(--shell-ink)]",
  "peer-gap": "border border-[var(--shell-border)] text-[var(--shell-muted)]",
};

function ActionCard({ action }: { action: FirmBriefRoadmapAction }) {
  return (
    <div
      className="rounded-[12px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-2"
      data-testid="roadmap-action"
      data-source={action.source}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-[var(--shell-ink)]">{action.text}</div>
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${SOURCE_CHIP_CLASS[action.source]}`}
        >
          {SOURCE_LABEL[action.source]}
        </span>
      </div>
      {action.detail ? (
        <div className="mt-1 text-[11px] leading-5 text-[var(--shell-muted)]">
          {action.detail}
        </div>
      ) : null}
    </div>
  );
}

function actionIdFor(quarterKey: string, index: number): string {
  return `${quarterKey}__${index}`;
}

function QuarterColumn({
  quarter,
  isCurrentEmphasized,
  data,
}: {
  quarter: FirmBriefRoadmapQuarter;
  isCurrentEmphasized: boolean;
  data: FirmBriefData;
}) {
  const activeOrder = data.editChoices.ordering[SECTION_KEY];

  // Build stable per-action ids and filter the global active-order list
  // down to actions that belong to THIS quarter; the consultant's
  // ordering is global across the section, but each quarter renders
  // only its own slice.
  const quarterActionIds = quarter.actions.map((_, idx) =>
    actionIdFor(quarter.quarterKey, idx)
  );
  const quarterActionMap = new Map<string, FirmBriefRoadmapAction>(
    quarter.actions.map((action, idx) => [actionIdFor(quarter.quarterKey, idx), action])
  );
  const quarterActiveOrder = activeOrder?.filter((id) => quarterActionIds.includes(id));

  const reorderItems: ReorderItem[] = quarterActionIds.map((id) => {
    const action = quarterActionMap.get(id)!;
    return {
      id,
      label: action.text,
      content: <ActionCard action={action} />,
    };
  });

  return (
    <div
      className={`rounded-[18px] border ${
        quarter.isCurrent
          ? "border-[var(--brand-c2-blue)] bg-[var(--shell-panel-soft)]"
          : "border-[var(--shell-border)] bg-[var(--shell-panel-soft)]"
      } p-4`}
      data-testid="roadmap-quarter"
      data-quarter-key={quarter.quarterKey}
      data-is-current={quarter.isCurrent ? "1" : "0"}
      data-emphasis-id={quarter.isCurrent ? "current-quarter" : undefined}
      data-emphasis-active={
        quarter.isCurrent && isCurrentEmphasized ? "true" : "false"
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
          {quarter.quarterLabel}
          {quarter.isCurrent ? (
            <span className="ml-1 normal-case tracking-normal">· current</span>
          ) : null}
        </div>
        {quarter.projectedAlignment !== null ? (
          <div className="text-xs font-semibold text-[var(--shell-ink)]">
            Proj {quarter.projectedAlignment}
          </div>
        ) : null}
      </div>
      {quarter.actions.length === 0 ? (
        <div className="mt-3 text-xs text-[var(--shell-muted)]">No actions.</div>
      ) : (
        <div className="mt-3">
          <ReorderHandle
            briefKind="firm"
            briefId={data.firmCompanyId}
            ecosystemId={data.ecosystemId}
            sectionKey={SECTION_KEY}
            items={reorderItems}
            activeOrder={quarterActiveOrder}
          />
        </div>
      )}
    </div>
  );
}

export default function SixQuarterRoadmap({ data }: { data: FirmBriefData }) {
  const variants = data.editVariants[SECTION_KEY] ?? [];
  const activeVariantId = data.editChoices.variants[SECTION_KEY];
  const activeEmphasis = data.editChoices.emphasis[SECTION_KEY] ?? [];

  const trajectoryStart = data.firmAlignmentHeader.canonicalFirmScore;
  const trajectoryEnd =
    data.sixQuarterRoadmap.length > 0
      ? data.sixQuarterRoadmap[data.sixQuarterRoadmap.length - 1].projectedAlignment
      : null;

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="six-quarter-roadmap"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <div className="pat-label">Six-quarter roadmap</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Deterministic gap-closure sequencing
          </h2>
        </div>
        {trajectoryStart !== null && trajectoryEnd !== null ? (
          <div
            className="text-sm text-[var(--shell-muted)]"
            data-emphasis-id="trajectory"
            data-emphasis-active={activeEmphasis.includes("trajectory") ? "true" : "false"}
          >
            Trajectory:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{trajectoryStart}</span>
            <span aria-hidden="true"> → </span>
            <span className="font-semibold text-[var(--shell-ink)]">{trajectoryEnd}</span>
          </div>
        ) : null}
      </div>

      {variants.length > 0 ? (
        <div className="mb-4">
          <PhrasingVariantPicker
            briefKind="firm"
            briefId={data.firmCompanyId}
            ecosystemId={data.ecosystemId}
            sectionKey={SECTION_KEY}
            variants={variants}
            activeVariantId={activeVariantId}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {data.sixQuarterRoadmap.map((quarter) => (
          <QuarterColumn
            key={quarter.quarterKey}
            quarter={quarter}
            isCurrentEmphasized={activeEmphasis.includes("current-quarter")}
            data={data}
          />
        ))}
      </div>

      <div className="mt-4">
        <EmphasisToggle
          briefKind="firm"
          briefId={data.firmCompanyId}
          ecosystemId={data.ecosystemId}
          sectionKey={SECTION_KEY}
          targetElementIds={EMPHASIS_TARGETS}
          activeEmphasisIds={activeEmphasis}
        />
      </div>
    </section>
  );
}
