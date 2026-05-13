import type { ReactNode } from "react";
import type {
  VendorBriefData,
  VendorBriefDeltaRow,
  VendorBriefHeatmapCell,
  VendorBriefRoadmapItem,
} from "@/lib/briefs";

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
                &middot;
              </span>
              <span>
                <span className="font-semibold">
                  {productNames.get(cell.productId) ?? cell.productId}
                </span>
                <span className="text-[var(--shell-muted)]">
                  {" "}
                  &mdash; mid-band fit (score {cell.score ?? "&mdash;"})
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
            &middot;
          </span>
          <span>
            <span className="font-semibold">
              {productNames.get(cell.productId) ?? cell.productId}
            </span>
            <span className="text-[var(--shell-muted)]">
              {" "}
              &mdash; high-band fit (score {cell.score ?? "&mdash;"})
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
            &middot;
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

function QuestionsBlock({
  card,
  productNames,
  vendorName,
}: {
  card: FirmCardData;
  productNames: Map<string, string>;
  vendorName: string;
}) {
  const questions: ReactNode[] = [];

  for (const cell of card.highBandCells.slice(0, 2)) {
    const productName = productNames.get(cell.productId) ?? cell.productId;
    questions.push(
      <>
        Confirm {vendorName}&apos;s {productName} integration depth with your existing stack &mdash; high-band fit indicates strong baseline alignment.
      </>
    );
  }
  for (const row of card.hotDivergenceRows.slice(0, 2)) {
    const magnitude = row.delta === null ? "the observed gap" : `${Math.abs(row.delta)} points`;
    questions.push(
      <>
        Probe why {vendorName}&apos;s self-assessment on {row.productName} diverges from peer-firm reviews by {magnitude}.
      </>
    );
  }
  if (questions.length < MAX_QUESTIONS) {
    for (const action of card.disqualifierActions.slice(0, MAX_QUESTIONS - questions.length)) {
      questions.push(
        <>
          Validate {vendorName}&apos;s near-term commitment: &ldquo;{action.text}&rdquo; &mdash; this is a high-signal action shared by other firms in your network.
        </>
      );
    }
  }

  if (questions.length === 0) {
    return (
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        Questions populate as the firm&apos;s high-band or hot-divergence signals land.
      </p>
    );
  }

  const trimmed = questions.slice(0, MAX_QUESTIONS);
  return (
    <ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-ink)]">
      {trimmed.map((question, index) => (
        <li key={index} className="flex gap-3">
          <span
            className="w-5 shrink-0 select-none text-right font-semibold tabular-nums text-[var(--brand-c2-blue)]"
            aria-hidden="true"
          >
            {index + 1}.
          </span>
          <span>{question}</span>
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
            &middot;
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

function FirmCard({
  card,
  productNames,
  vendorName,
}: {
  card: FirmCardData;
  productNames: Map<string, string>;
  vendorName: string;
}) {
  if (!card.hasAnySignal) {
    return (
      <div
        className="py-6"
        data-testid="strengths-cautions-firm-card"
        data-firm-id={card.firmId}
        data-signal="empty"
      >
        <h3 className="text-lg font-semibold tracking-tight text-[var(--shell-ink)]">
          {card.firmName}
        </h3>
        <p className="mt-2 text-base font-semibold leading-snug text-[var(--shell-ink)]">
          {card.firmName} &mdash; capability responses pending.
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          Per-firm battlecard unlocks once {card.firmName} completes the round-one capability review.
        </p>
      </div>
    );
  }

  return (
    <div
      className="py-6"
      data-testid="strengths-cautions-firm-card"
      data-firm-id={card.firmId}
      data-signal="populated"
    >
      <h3 className="text-lg font-semibold tracking-tight text-[var(--shell-ink)]">
        {card.firmName}
      </h3>

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
          <QuestionsBlock card={card} productNames={productNames} vendorName={vendorName} />
        </div>

        <div data-testid="strengths-cautions-block" data-block="disqualifiers">
          <div className="pat-label text-[11px]">Quick disqualifiers</div>
          <DisqualifiersBlock card={card} />
        </div>
      </div>
    </div>
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

  return (
    <section
      id="section-5-strengths-cautions"
      className="scroll-mt-8 rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8"
      data-testid="per-firm-strengths-cautions"
    >
      <div className="pat-label">Section 5 &middot; Per-firm strengths / cautions</div>

      <h2
        className="mt-4 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)", lineHeight: 1.15 }}
      >
        {actionTitle}
      </h2>

      <p className="mt-3 text-sm text-[var(--shell-muted)]">
        Battlecard view per firm. Why fit &middot; where struggle &middot; questions to ask &middot; quick disqualifiers.
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
            />
          ))}
        </div>
      )}

      <div
        className="mt-10 border-t border-[var(--shell-border)] pt-5 text-xs leading-6 text-[var(--shell-muted)]"
        data-testid="strengths-cautions-methodology-footer"
      >
        Based on responses from {data.firmCount} {firmLabel} in your network &middot; last refreshed {refreshedDate} &middot; {totalCellCount} firm &times; product cell{totalCellCount === 1 ? "" : "s"} analyzed &middot; scoring methodology: see Section 3.
      </div>
    </section>
  );
}
