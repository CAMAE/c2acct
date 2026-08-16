import type {
  VendorBriefData,
  VendorBriefDeltaRow,
  VendorBriefHeatmapCell,
  VendorBriefRoadmapItem,
} from "@/lib/briefs";
import {
  selectQuestions,
  type QuestionScopeCell,
} from "@/lib/perFirmQuestionLibrary";

function formatGeneratedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

const MAX_BULLETS_PER_BLOCK = 3;
const MAX_QUESTIONS = 4;
const MAX_DISQUALIFIERS = 2;

type FirmCardData = {
  firmId: string;
  firmName: string;
  highBandCells: VendorBriefHeatmapCell[];
  midBandCells: VendorBriefHeatmapCell[];
  lowBandCells: VendorBriefHeatmapCell[];
  hotDivergenceRows: VendorBriefDeltaRow[];
  disqualifierActions: VendorBriefRoadmapItem[];
  hasAnySignal: boolean;
};

function buildFirmCardData(
  firm: { id: string; name: string },
  data: VendorBriefData
): FirmCardData {
  const cellsForFirm = data.perFirmHeatmap.cells.filter(
    (cell) => cell.firmCompanyId === firm.id
  );
  const highBandCells = cellsForFirm.filter((cell) => cell.band === "high");
  const midBandCells = cellsForFirm.filter((cell) => cell.band === "mid");
  const lowBandCells = cellsForFirm.filter((cell) => cell.band === "low");

  // Hot divergence cross-reference: a row is "affecting this firm" if the firm
  // has any cell on file for that product (i.e., this firm reviewed it and the
  // ecosystem-wide vendor-vs-firm-avg comparison is hot).
  const firmReviewedProductIds = new Set(
    cellsForFirm.filter((cell) => cell.score !== null).map((cell) => cell.productId)
  );
  const hotDivergenceRows = data.selfVsMarketDelta.filter(
    (row) => row.isHotDivergence && firmReviewedProductIds.has(row.productId)
  );

  // Quick disqualifiers: high-signal Q1 + Q2 (thirtyDay + sixtyDay) actions
  // where this firm is on the affected list.
  const nearTermActions = [
    ...data.actionRoadmap.thirtyDay,
    ...data.actionRoadmap.sixtyDay,
  ];
  const disqualifierActions = nearTermActions.filter(
    (action) =>
      action.signalStrength === "high" && action.affectedFirmIds.includes(firm.id)
  );

  const hasAnySignal =
    highBandCells.length > 0 ||
    midBandCells.length > 0 ||
    lowBandCells.length > 0 ||
    hotDivergenceRows.length > 0 ||
    disqualifierActions.length > 0;

  return {
    firmId: firm.id,
    firmName: firm.name,
    highBandCells,
    midBandCells,
    lowBandCells,
    hotDivergenceRows,
    disqualifierActions,
    hasAnySignal,
  };
}

function actionTitleFromData(
  data: VendorBriefData,
  firmCards: FirmCardData[]
): string {
  if (firmCards.length === 0 || firmCards.every((card) => !card.hasAnySignal)) {
    return `Awaiting capability response from firms to surface per-firm battlecards.`;
  }
  const hotDivergenceFirmCount = firmCards.filter(
    (card) => card.hotDivergenceRows.length > 0
  ).length;
  if (hotDivergenceFirmCount > 0) {
    return `Per-firm fit varies — ${hotDivergenceFirmCount} firm${hotDivergenceFirmCount === 1 ? "" : "s"} see${hotDivergenceFirmCount === 1 ? "s" : ""} hot divergences against ${data.vendorCompanyName}'s self-assessment.`;
  }
  return `${data.firmCount} firm${data.firmCount === 1 ? "" : "s"} show consistent ${data.vendorCompanyName} fit patterns across the catalog.`;
}

function productNameLookup(data: VendorBriefData): Map<string, string> {
  return new Map(data.perFirmHeatmap.products.map((p) => [p.id, p.name]));
}

function WhyFitsBlock({
  card,
  productNames,
}: {
  card: FirmCardData;
  productNames: Map<string, string>;
}) {
  if (card.highBandCells.length === 0 && card.midBandCells.length === 0) {
    return (
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        No high- or mid-band products on file for this firm yet — fit will emerge as capability scores land.
      </p>
    );
  }
  if (card.highBandCells.length === 0) {
    const midBullets = card.midBandCells.slice(0, MAX_BULLETS_PER_BLOCK);
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          No high-band products yet &mdash; fit is emerging at the mid-band.
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-ink)]">
          {midBullets.map((cell) => (
            <li key={`${cell.firmCompanyId}:${cell.productId}`} className="flex gap-3">
              <span
                className="shrink-0 select-none text-[var(--brand-c2-blue)]"
                aria-hidden="true"
              >
                ·
              </span>
              <span>
                <span className="font-semibold">
                  {productNames.get(cell.productId) ?? cell.productId}
                </span>
                <span className="text-[var(--shell-muted)]">
                  {" "}
                  &mdash; mid-band fit (score {cell.score ?? "—"})
                </span>
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }
  const bullets = card.highBandCells.slice(0, MAX_BULLETS_PER_BLOCK);
  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-ink)]">
      {bullets.map((cell) => (
        <li key={`${cell.firmCompanyId}:${cell.productId}`} className="flex gap-3">
          <span
            className="shrink-0 select-none text-[var(--brand-c2-blue)]"
            aria-hidden="true"
          >
            ·
          </span>
          <span>
            <span className="font-semibold">
              {productNames.get(cell.productId) ?? cell.productId}
            </span>
            <span className="text-[var(--shell-muted)]">
              {" "}
              &mdash; high-band fit (score {cell.score ?? "—"})
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function StrugglesBlock({
  card,
  productNames,
}: {
  card: FirmCardData;
  productNames: Map<string, string>;
}) {
  type StruggleBullet = { key: string; productName: string; label: string };
  const bullets: StruggleBullet[] = [];

  for (const cell of card.lowBandCells) {
    bullets.push({
      key: `low:${cell.productId}`,
      productName: productNames.get(cell.productId) ?? cell.productId,
      label: `low-band score (${cell.score ?? "—"})`,
    });
  }
  for (const row of card.hotDivergenceRows) {
    const sign = row.delta !== null && row.delta > 0 ? "vendor above firm" : "firm above vendor";
    bullets.push({
      key: `hot:${row.productId}`,
      productName: row.productName,
      label: `hot divergence (${sign} by ${row.delta === null ? "?" : Math.abs(row.delta)})`,
    });
  }

  if (bullets.length === 0) {
    return (
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        No low-band products or hot divergences on file for this firm yet.
      </p>
    );
  }

  const seen = new Set<string>();
  const trimmed = bullets
    .filter((b) => {
      const key = `${b.productName}::${b.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_BULLETS_PER_BLOCK);

  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-ink)]">
      {trimmed.map((bullet) => (
        <li key={bullet.key} className="flex gap-3">
          <span
            className="shrink-0 select-none text-[var(--brand-orange)]"
            aria-hidden="true"
          >
            ·
          </span>
          <span>
            <span className="font-semibold">{bullet.productName}</span>
            <span className="text-[var(--shell-muted)]">
              {" "}
              &mdash; {bullet.label}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function buildScopeCellsForCard(
  card: FirmCardData,
  data: VendorBriefData,
  productNames: Map<string, string>
): QuestionScopeCell[] {
  const deltaByProductId = new Map<string, VendorBriefDeltaRow>();
  for (const row of data.selfVsMarketDelta) {
    deltaByProductId.set(row.productId, row);
  }
  const out: QuestionScopeCell[] = [];
  const seen = new Set<string>();
  const ranked: VendorBriefHeatmapCell[] = [
    ...card.hotDivergenceRows
      .map((row) =>
        card.highBandCells
          .concat(card.midBandCells, card.lowBandCells)
          .find((cell) => cell.productId === row.productId)
      )
      .filter((cell): cell is VendorBriefHeatmapCell => Boolean(cell)),
    ...card.highBandCells,
    ...card.midBandCells,
    ...card.lowBandCells,
  ];
  for (const cell of ranked) {
    if (seen.has(cell.productId)) continue;
    if (cell.score === null) continue;
    seen.add(cell.productId);
    const deltaRow = deltaByProductId.get(cell.productId) ?? null;
    out.push({
      productId: cell.productId,
      productName: productNames.get(cell.productId) ?? cell.productId,
      capabilityArea: productNames.get(cell.productId) ?? cell.productId,
      firmScore: cell.score,
      vendorScore: deltaRow?.vendorSelfReported ?? null,
      delta: deltaRow?.delta ?? null,
    });
  }
  return out;
}

function QuestionsBlock({
  card,
  productNames,
  vendorName,
  data,
}: {
  card: FirmCardData;
  productNames: Map<string, string>;
  vendorName: string;
  data: VendorBriefData;
}) {
  const scopeCells = buildScopeCellsForCard(card, data, productNames);
  const candidates = selectQuestions(
    scopeCells,
    { vendorName, firmName: card.firmName },
    MAX_QUESTIONS
  );

  if (candidates.length === 0) {
    return (
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        Questions populate as the firm&apos;s high-band or hot-divergence signals land.
      </p>
    );
  }

  return (
    <ol
      className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-ink)]"
      data-testid="strengths-cautions-questions-list"
    >
      {candidates.map((candidate, index) => (
        <li
          key={candidate.template.id}
          className="flex gap-3"
          data-testid="strengths-cautions-question"
          data-template-id={candidate.template.id}
          data-product-id={candidate.cell.productId}
        >
          <span
            className="w-5 shrink-0 select-none text-right font-semibold tabular-nums text-[var(--brand-c2-blue)]"
            aria-hidden="true"
          >
            {index + 1}.
          </span>
          <span>{candidate.rendered}</span>
        </li>
      ))}
    </ol>
  );
}

function DisqualifiersBlock({ card }: { card: FirmCardData }) {
  if (card.disqualifierActions.length === 0) {
    return (
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        No category-level disqualifiers surface for this firm.
      </p>
    );
  }
  const bullets = card.disqualifierActions.slice(0, MAX_DISQUALIFIERS);
  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-ink)]">
      {bullets.map((action) => (
        <li key={action.itemId} className="flex gap-3">
          <span
            className="shrink-0 select-none text-[var(--brand-orange)]"
            aria-hidden="true"
          >
            ·
          </span>
          <span>
            <span className="font-semibold">{action.text}</span>
            {action.detail ? (
              <span className="text-[var(--shell-muted)]"> &mdash; {action.detail}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function firmCardSummaryLine(card: FirmCardData): string {
  if (!card.hasAnySignal) {
    return "Capability responses pending";
  }
  const hot = card.hotDivergenceRows.length;
  const strengths = card.highBandCells.length;
  const cautions = card.lowBandCells.length;
  if (hot > 0) {
    return `${hot} hot divergence${hot === 1 ? "" : "s"} · ${strengths} strength${strengths === 1 ? "" : "s"}`;
  }
  return `${strengths} strength${strengths === 1 ? "" : "s"} · ${cautions} caution${cautions === 1 ? "" : "s"}`;
}

function FirmCard({
  card,
  productNames,
  vendorName,
  data,
  defaultOpen,
}: {
  card: FirmCardData;
  productNames: Map<string, string>;
  vendorName: string;
  data: VendorBriefData;
  defaultOpen: boolean;
}) {
  const summaryLine = firmCardSummaryLine(card);
  // WS8: HTML <details>/<summary>. Zero JS, server-render-friendly,
  // keyboard-navigable. Top-3 by hotDivergenceRows.length render open
  // (defaultOpen=true); the rest collapse closed.
  return (
    <details
      open={defaultOpen}
      data-testid="strengths-cautions-firm-card"
      data-firm-id={card.firmId}
      data-signal={card.hasAnySignal ? "populated" : "empty"}
      data-default-open={defaultOpen ? "true" : "false"}
      className="group py-6 [&[open]>summary>.chevron]:rotate-90"
    >
      <summary
        className="flex cursor-pointer items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden"
        data-testid="strengths-cautions-firm-summary"
      >
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--shell-ink)]">
            {card.firmName}
          </h3>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">{summaryLine}</p>
        </div>
        <span
          className="chevron shrink-0 text-[var(--shell-muted)] transition-transform"
          aria-hidden="true"
        >
          &#9656;
        </span>
      </summary>

      {card.hasAnySignal ? (
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <div data-testid="strengths-cautions-block" data-block="why-fits">
            <div className="pat-label text-[11px]">Why this vendor fits this firm</div>
            <WhyFitsBlock card={card} productNames={productNames} />
          </div>

          <div data-testid="strengths-cautions-block" data-block="where-struggles">
            <div className="pat-label text-[11px]">Where it struggles for this firm</div>
            <StrugglesBlock card={card} productNames={productNames} />
          </div>

          <div data-testid="strengths-cautions-block" data-block="questions">
            <div className="pat-label text-[11px]">Questions to ask in evaluation</div>
            <QuestionsBlock card={card} productNames={productNames} vendorName={vendorName} data={data} />
          </div>

          <div data-testid="strengths-cautions-block" data-block="disqualifiers">
            <div className="pat-label text-[11px]">Quick disqualifiers</div>
            <DisqualifiersBlock card={card} />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-base font-semibold leading-snug text-[var(--shell-ink)]">
            {card.firmName} &mdash; capability responses pending.
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Per-firm battlecard unlocks once {card.firmName} completes the round-one capability review.
          </p>
        </div>
      )}
    </details>
  );
}

export default function PerFirmStrengthsCautions({
  data,
}: {
  data: VendorBriefData;
}) {
  const firmLabel = data.firmCount === 1 ? "firm" : "firms";
  const refreshedDate = formatGeneratedDate(data.generatedAt);
  const productNames = productNameLookup(data);
  const totalCellCount = data.perFirmHeatmap.cells.length;
  const firmCards = data.perFirmHeatmap.firms.map((firm) =>
    buildFirmCardData(firm, data)
  );
  const actionTitle = actionTitleFromData(data, firmCards);

  // WS8: auto-expand the top-3 firms by hot-divergence count. JS stable
  // sort falls through to insertion order on ties (effectively
  // alphabetical via the upstream firms axis), which is acceptable.
  const autoExpandFirmIds = new Set(
    [...firmCards]
      .sort((a, b) => b.hotDivergenceRows.length - a.hotDivergenceRows.length)
      .slice(0, 3)
      .map((card) => card.firmId)
  );

  return (
    <section
      id="section-4-strengths-cautions"
      className="scroll-mt-8 rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8"
      data-testid="per-firm-strengths-cautions"
    >
      <div className="pat-label">Section 4 · Per-firm strengths / cautions</div>

      <h2
        className="mt-4 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)", lineHeight: 1.15 }}
      >
        {actionTitle}
      </h2>

      <p className="mt-3 text-sm text-[var(--shell-muted)]">
        Battlecard view per firm. Why fit · where struggle · questions to ask · quick disqualifiers.
      </p>

      {firmCards.length === 0 ? (
        <div className="mt-8 border-t border-dashed border-[var(--shell-border)] pt-6">
          <div
            className="text-base font-semibold leading-snug text-[var(--shell-ink)]"
            data-testid="strengths-cautions-empty"
          >
            Awaiting firm assignments to populate per-firm battlecards.
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            This section populates once at least one firm is on file for this ecosystem.
          </p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-[var(--shell-border)]">
          {firmCards.map((card) => (
            <FirmCard
              key={card.firmId}
              card={card}
              productNames={productNames}
              vendorName={data.vendorCompanyName}
              data={data}
              defaultOpen={autoExpandFirmIds.has(card.firmId)}
            />
          ))}
        </div>
      )}

      <div
        className="mt-10 border-t border-[var(--shell-border)] pt-5 text-xs leading-6 text-[var(--shell-muted)]"
        data-testid="strengths-cautions-methodology-footer"
      >
        Based on responses from {data.firmCount} {firmLabel} in your network · last refreshed {refreshedDate} · {totalCellCount} firm &times; product cell{totalCellCount === 1 ? "" : "s"} analyzed · scoring methodology: see Section 2 above.
      </div>
    </section>
  );
}
