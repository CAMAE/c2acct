"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import AlignmentRadar, { type RadarAxis } from "@/app/components/firm/AlignmentRadar";
import { formatDelta, formatScoreValue } from "@/lib/formatDelta";
import { fitHeatColor, fitTierLabel } from "@/lib/fitHeat";
import type { AlignmentBoardData, BoardCandidate, BoardPiece } from "@/lib/alignmentBoard";

/**
 * Alignment Sandbox v3 (Redlines R3-Board). Two changes from v2, nothing else:
 *  - Layout is contained + wrapping (R3.1): everything sits in the standard
 *    portal frame, stat lockup + radar side-by-side up top, stack and candidates
 *    as wrapping uniform grids, breakdown collapsed to the top movers. No
 *    horizontal scroll at 100% zoom.
 *  - Pieces are classic puzzle pieces (R3.3): rounded square with alternating
 *    tabs (outies) and blanks (innies) so the grid reads as interlocking;
 *    selected/lifted = fill change + lift shadow, not an outline box.
 * Radar behavior, Fit ranking, winner deltas, the R2 formatter, and the
 * Pro/Elite split + colors are unchanged.
 */

const CONFIDENCE_LABEL: Record<BoardPiece["confidence"], string> = {
  no_signal: "Pending",
  sample_thin: "Sample-thin",
  emerging: "Building",
  grounded: "Grounded",
};

const C2_BLUE = "#063674";
const STACK_FILL = "#ffffff";
const STACK_FILL_LIFTED = "#e9f0fb";

// ---- Classic puzzle-piece path (viewBox 200x150) ----
const VB_W = 200;
const VB_H = 150;
const TAB = 20; // tab/blank radius
const CORNER = 12;

type EdgeKind = "tab" | "blank" | "flat";
type PieceEdges = { top: EdgeKind; right: EdgeKind; bottom: EdgeKind; left: EdgeKind };

// Loose candidate pieces: self-contained checkerboard alternation (tabs stay
// inside the viewBox via inset). They read as puzzle pieces but never touch.
function looseEdges(index: number): PieceEdges {
  return index % 2 === 0
    ? { top: "tab", right: "blank", bottom: "tab", left: "blank" }
    : { top: "blank", right: "tab", bottom: "blank", left: "tab" };
}

// Stack tiles: complementary edges with neighbours so the grid assembles into a
// connected puzzle (this piece's tab shares its seam curve with the neighbour's
// blank). Boundary edges are flat. Row-major over `cols`.
function tileEdges(index: number, cols: number, count: number): PieceEdges {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const hasRight = col < cols - 1 && index + 1 < count;
  const hasLeft = col > 0;
  const hasBelow = index + cols < count;
  const hasAbove = row > 0;
  return {
    right: hasRight ? ((row + col) % 2 === 0 ? "tab" : "blank") : "flat",
    left: hasLeft ? ((row + col - 1) % 2 === 0 ? "blank" : "tab") : "flat",
    bottom: hasBelow ? ((row + col) % 2 === 0 ? "tab" : "blank") : "flat",
    top: hasAbove ? ((row - 1 + col) % 2 === 0 ? "blank" : "tab") : "flat",
  };
}

/** Columns for the connected stack — a clean strip/grid, never a ragged single. */
function stackColumns(count: number): number {
  if (count <= 5) return Math.max(1, count);
  if (count === 6) return 3;
  return 4;
}

function edgeSeg(x0: number, y0: number, x1: number, y1: number, kind: EdgeKind): string {
  if (kind === "flat") return `L${x1.toFixed(1)} ${y1.toFixed(1)}`;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const p1x = mx - ux * TAB;
  const p1y = my - uy * TAB;
  const p2x = mx + ux * TAB;
  const p2y = my + uy * TAB;
  const sweep = kind === "tab" ? 1 : 0; // clockwise traversal: tab bulges outward
  return `L${p1x.toFixed(1)} ${p1y.toFixed(1)} A${TAB} ${TAB} 0 0 ${sweep} ${p2x.toFixed(1)} ${p2y.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/**
 * inset 0 → body fills the viewBox and tabs overflow into neighbours (connected
 * stack tiles, rendered with overflow visible + gap-0). inset TAB → tabs stay
 * inside the viewBox (self-contained loose candidate pieces).
 */
function puzzlePath(edges: PieceEdges, inset: number): string {
  const l = inset;
  const t = inset;
  const r = VB_W - inset;
  const b = VB_H - inset;
  const c = CORNER;
  return [
    `M${l + c} ${t}`,
    edgeSeg(l + c, t, r - c, t, edges.top),
    `Q${r} ${t} ${r} ${t + c}`,
    edgeSeg(r, t + c, r, b - c, edges.right),
    `Q${r} ${b} ${r - c} ${b}`,
    edgeSeg(r - c, b, l + c, b, edges.bottom),
    `Q${l} ${b} ${l} ${b - c}`,
    edgeSeg(l, b - c, l, t + c, edges.left),
    `Q${l} ${t} ${l + c} ${t}`,
    "Z",
  ].join(" ");
}

function mean(scores: Array<number | null>): number | null {
  const known = scores.filter((s): s is number => s !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length);
}

type Selection = { kind: "piece"; id: string } | { kind: "candidate"; id: string } | null;

export default function AlignmentBoardClient({
  data,
  entitled,
  membershipHref,
}: {
  data: AlignmentBoardData;
  entitled: boolean;
  membershipHref: string;
}) {
  const [swapOutId, setSwapOutId] = useState<string | null>(null);
  const [swapInId, setSwapInId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Selection>(null);
  const [showAllMovers, setShowAllMovers] = useState(false);

  const candidateLabel = (candidate: BoardCandidate) =>
    entitled ? candidate.productName : `Secret Product ${candidate.fitRank}`;

  const baseline = data.currentAlignment;
  const swapCandidate = swapInId ? data.candidates.find((c) => c.productId === swapInId) ?? null : null;
  const swapPiece = swapOutId ? data.stack.find((p) => p.productId === swapOutId) ?? null : null;
  const swapStaged = Boolean(swapOutId && swapInId && swapCandidate);

  const projected = useMemo(() => {
    if (!swapOutId || !swapCandidate) return baseline;
    const scores = data.stack.map((piece) =>
      piece.productId === swapOutId ? swapCandidate.projectedScore ?? null : piece.scoreVsFirm
    );
    return mean(scores);
  }, [swapOutId, swapCandidate, baseline, data.stack]);

  const projectedDelta =
    projected !== null && baseline !== null && swapStaged ? projected - baseline : null;

  const radarAxes: RadarAxis[] = data.moduleShape.map((axis) => ({
    title: axis.title,
    current: axis.score,
    projected:
      swapStaged && projectedDelta !== null && axis.score !== null
        ? Math.max(0, Math.min(100, axis.score + projectedDelta))
        : axis.score,
  }));

  function pickPiece(piece: BoardPiece) {
    setSwapOutId((current) => (current === piece.productId ? null : piece.productId));
    setSwapInId(null);
    setDetail({ kind: "piece", id: piece.productId });
  }

  function pickCandidate(candidate: BoardCandidate) {
    setDetail({ kind: "candidate", id: candidate.productId });
    if (swapOutId) {
      setSwapInId((current) => (current === candidate.productId ? null : candidate.productId));
    }
  }

  function resetSwap() {
    setSwapOutId(null);
    setSwapInId(null);
  }

  const detailPiece =
    detail?.kind === "piece" ? data.stack.find((p) => p.productId === detail.id) ?? null : null;
  const detailCandidate =
    detail?.kind === "candidate" ? data.candidates.find((c) => c.productId === detail.id) ?? null : null;

  // Breakdown: swapped piece first (the only real mover), then the rest; collapse
  // to the top 6 by default with a "Show all" expander (R3.1).
  const breakdownPieces = [...data.stack].sort((a, b) => {
    if (a.productId === swapOutId) return -1;
    if (b.productId === swapOutId) return 1;
    return (b.scoreVsFirm ?? 0) - (a.scoreVsFirm ?? 0);
  });
  const visibleMovers = showAllMovers ? breakdownPieces : breakdownPieces.slice(0, 6);
  const stackCols = stackColumns(data.stack.length);


  return (
    <div className="space-y-6">
      <style>{`@keyframes patPieceIn{0%{opacity:0;transform:translateY(8px) scale(.94)}100%{opacity:1;transform:none}}`}</style>

      {/* Header: stat lockup (left) + radar (right) */}
      <section className="pat-card p-6 sm:p-8">
        <div className="pat-label">Alignment Sandbox</div>
        <div className="mt-4 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
              <div>
                <div className="pat-stat-number text-4xl sm:text-5xl">
                  {formatScoreValue(baseline)}
                  {baseline !== null ? "%" : ""}
                </div>
                <div className="text-sm text-[var(--shell-muted)]">
                  {data.firmName} · current alignment · {data.confidenceLabel}
                </div>
              </div>
              {swapStaged && projected !== null ? (
                <>
                  <div aria-hidden="true" className="pb-3 text-2xl text-[var(--shell-muted)]">
                    →
                  </div>
                  <div style={{ animation: "patPieceIn .3s ease" }}>
                    <div className="pat-stat-number text-4xl text-[var(--brand-orange)] sm:text-5xl">
                      {formatScoreValue(projected)}%
                    </div>
                    <div className="text-sm text-[var(--shell-muted)]">
                      projected after swap ({formatDelta(projectedDelta)})
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-[var(--shell-muted)]">
              Lift a piece from your stack, then drop in a Secret candidate to see your projected
              alignment shape move.{" "}
              {data.confidence === "sample_thin" || data.confidence === "no_signal"
                ? "Sample is thin, so projections are directional — PAT won't fake precision."
                : "Projections are directional, drawn from cross-firm benchmarks."}
            </p>
            {swapOutId || swapInId ? (
              <button type="button" className="pat-button-secondary mt-4 text-sm" onClick={resetSwap}>
                Reset swap
              </button>
            ) : null}
          </div>
          <div className="lg:justify-self-end">
            <AlignmentRadar axes={radarAxes} showProjected={swapStaged} />
          </div>
        </div>
      </section>

      {/* Stack — wrapping grid of puzzle pieces */}
      <section className="pat-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="pat-label">Your stack — click a piece to lift it out</div>
          {data.totalStackCount > data.stack.length ? (
            <span className="text-xs text-[var(--shell-muted)]">
              Showing your top {data.stack.length} of {data.totalStackCount} reviewed products
            </span>
          ) : null}
        </div>
        {data.stack.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--shell-muted)]">
            No reviewed products yet. Complete product reviews to place pieces on the board.
          </p>
        ) : (
          // Connected puzzle board: gap-0 + overflow-visible tabs so pieces
          // interlock into one assembled stack.
          <div
            className="mt-4 grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${stackCols}, minmax(0, 1fr))`,
              maxWidth: `${stackCols * 210}px`,
            }}
          >
            {data.stack.map((piece, index) => {
              const isSwapSlot = swapStaged && piece.productId === swapOutId;
              const shown = isSwapSlot && swapCandidate
                ? { name: candidateLabel(swapCandidate), score: swapCandidate.projectedScore, from: piece.productName, vendor: "swapped in" }
                : { name: piece.productName, score: piece.scoreVsFirm, from: null as string | null, vendor: piece.vendorName };
              const selected = swapOutId === piece.productId && !swapStaged;
              return (
                <PuzzlePiece
                  key={piece.productId}
                  edges={tileEdges(index, stackCols, data.stack.length)}
                  tile
                  zIndex={data.stack.length - index}
                  fill={isSwapSlot ? C2_BLUE : selected ? STACK_FILL_LIFTED : STACK_FILL}
                  stroke="var(--shell-border)"
                  lifted={selected || isSwapSlot}
                  textClass={isSwapSlot ? "text-white" : "text-[var(--shell-ink)]"}
                  mutedClass={isSwapSlot ? "text-white/75" : "text-[var(--shell-muted)]"}
                  onClick={() => pickPiece(piece)}
                  testId="board-piece"
                  dataProductName={piece.productName}
                  title={shown.name}
                  subtitle={shown.from ? `⇄ was ${shown.from}` : shown.vendor}
                  scoreText={shown.score !== null ? `${formatScoreValue(shown.score)}%` : "—"}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Breakdown */}
      {swapStaged ? (
        <section className="pat-card p-6" data-testid="board-breakdown">
          <div className="pat-label">What changes — top movers</div>
          <p className="mt-2 text-sm text-[var(--shell-muted)]">
            Swapping <strong className="text-[var(--shell-ink)]">{swapPiece?.productName}</strong> for{" "}
            <strong className="text-[var(--shell-ink)]">{swapCandidate ? candidateLabel(swapCandidate) : ""}</strong>
            . Only the lifted piece moves; the rest hold.
          </p>
          <ul className="mt-4 space-y-2.5">
            {visibleMovers.map((piece) => {
              const isSwap = piece.productId === swapOutId;
              const after = isSwap ? swapCandidate?.projectedScore ?? null : piece.scoreVsFirm;
              const before = piece.scoreVsFirm;
              const pieceDelta = isSwap && before !== null && after !== null ? after - before : null;
              return (
                <li key={piece.productId} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-[var(--shell-ink)]">
                    {isSwap && swapCandidate ? candidateLabel(swapCandidate) : piece.productName}
                  </span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, after ?? 0))}%`,
                        background: isSwap ? "var(--brand-orange)" : C2_BLUE,
                        opacity: isSwap ? 1 : 0.5,
                      }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-[var(--shell-muted)]">
                    {after !== null ? `${formatScoreValue(after)}%` : "—"}
                    {pieceDelta !== null ? (
                      <span className={pieceDelta >= 0 ? "text-[var(--shell-positive)]" : "text-[var(--brand-orange)]"}>
                        {" "}
                        {formatDelta(pieceDelta)}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          {breakdownPieces.length > 6 ? (
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-[var(--brand-c2-blue)] hover:underline"
              onClick={() => setShowAllMovers((v) => !v)}
            >
              {showAllMovers ? "Show fewer" : `Show all ${breakdownPieces.length}`}
            </button>
          ) : null}
        </section>
      ) : null}

      {/* Candidate rail — ranked wrapping grid */}
      <section className="pat-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="pat-label">
            Secret candidates — {swapOutId ? "click one to swap it in" : "lift a stack piece first"}
          </div>
          {!entitled && data.candidates[0] ? (
            <span className="text-xs text-[var(--shell-muted)]">
              Your Sandbox Fit #1 piece exists —{" "}
              <Link className="font-semibold text-[var(--brand-c2-blue)] hover:underline" href={membershipHref}>
                Reveal with Elite
              </Link>
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(168px,1fr))]">
          {data.candidates.map((candidate) => {
            const delta =
              candidate.projectedScore !== null && baseline !== null
                ? candidate.projectedScore - baseline
                : null;
            const isSwappedIn = swapStaged && candidate.productId === swapInId;
            const heat = fitHeatColor(delta);
            return (
              <PuzzlePiece
                key={candidate.productId}
                edges={looseEdges(candidate.fitRank)}
                zIndex={0}
                fill={isSwappedIn ? STACK_FILL : heat}
                stroke={isSwappedIn ? "var(--shell-border)" : heat}
                lifted={swapInId === candidate.productId}
                textClass={isSwappedIn ? "text-[var(--shell-ink)]" : "text-white"}
                mutedClass={isSwappedIn ? "text-[var(--shell-muted)]" : "text-white/80"}
                disabled={!swapOutId && !isSwappedIn}
                onClick={() => pickCandidate(candidate)}
                testId="board-candidate"
                dataAnonymized={entitled ? "0" : "1"}
                rank={candidate.fitRank}
                tierLabel={isSwappedIn ? undefined : fitTierLabel(delta)}
                title={isSwappedIn && swapPiece ? swapPiece.productName : candidateLabel(candidate)}
                subtitle={isSwappedIn ? "⇄ lifted from your stack" : entitled ? candidate.vendorName : "Vendor hidden"}
                scoreText={formatDelta(delta)}
              />
            );
          })}
        </div>
      </section>

      {/* Detail — full width beneath candidates */}
      {detailPiece ? (
        <DetailCard title={detailPiece.productName} onClose={() => setDetail(null)}>
          <Fact label="Product · vendor" value={`${detailPiece.productName} · ${detailPiece.vendorName}`} />
          <Fact label="Price band" value={detailPiece.priceBand} />
          <Fact
            label="Score vs. your firm"
            value={
              detailPiece.scoreVsFirm !== null
                ? `${formatScoreValue(detailPiece.scoreVsFirm)}% · ${CONFIDENCE_LABEL[detailPiece.confidence]}`
                : "Not yet reviewed"
            }
          />
          <Fact label="Top strength" value={detailPiece.topStrength} />
          <Fact label="Top gap" value={detailPiece.topGap} />
        </DetailCard>
      ) : null}

      {detailCandidate ? (
        <DetailCard
          title={`Sandbox Fit #${detailCandidate.fitRank} · ${candidateLabel(detailCandidate)}`}
          onClose={() => setDetail(null)}
          cta={
            !entitled ? (
              <Link className="pat-button-primary mt-5 inline-flex text-sm" href={membershipHref}>
                Reveal with Elite
              </Link>
            ) : null
          }
        >
          {entitled ? (
            <>
              <Fact label="Product · vendor" value={`${detailCandidate.productName} · ${detailCandidate.vendorName}`} />
              <Fact label="Price band" value={detailCandidate.priceBand} />
              <Fact
                label="Projected fit vs. your firm"
                value={
                  detailCandidate.projectedScore !== null
                    ? `${formatScoreValue(detailCandidate.projectedScore)}% · ${CONFIDENCE_LABEL[detailCandidate.confidence]}`
                    : "Insufficient signal"
                }
              />
            </>
          ) : (
            <>
              <Fact label="Sandbox Fit rank" value={`#${detailCandidate.fitRank} of ${data.candidates.length}`} />
              <Fact label="Category" value={detailCandidate.category ?? "—"} />
              <Fact
                label="Projected delta"
                value={
                  detailCandidate.projectedScore !== null && baseline !== null
                    ? formatDelta(detailCandidate.projectedScore - baseline)
                    : "—"
                }
              />
            </>
          )}
        </DetailCard>
      ) : null}
    </div>
  );
}

function PuzzlePiece({
  edges,
  tile = false,
  zIndex,
  fill,
  stroke,
  lifted,
  textClass,
  mutedClass,
  disabled,
  onClick,
  testId,
  dataProductName,
  dataAnonymized,
  rank,
  tierLabel,
  title,
  subtitle,
  scoreText,
}: {
  edges: PieceEdges;
  tile?: boolean;
  zIndex: number;
  fill: string;
  stroke: string;
  lifted: boolean;
  textClass: string;
  mutedClass: string;
  disabled?: boolean;
  onClick: () => void;
  testId: string;
  dataProductName?: string;
  dataAnonymized?: string;
  rank?: number;
  tierLabel?: string;
  title: string;
  subtitle: string;
  scoreText: string;
}) {
  // Stack tiles: no inset so tabs overflow into neighbours (connected board).
  // Loose candidates: inset so the piece is self-contained.
  const path = puzzlePath(edges, tile ? 0 : TAB);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      data-product-name={dataProductName}
      data-anonymized={dataAnonymized}
      className="relative block w-full text-left transition-transform duration-200 hover:-translate-y-[3px] disabled:cursor-not-allowed disabled:opacity-55"
      style={{
        aspectRatio: `${VB_W} / ${VB_H}`,
        zIndex: lifted ? 50 : zIndex,
        transform: lifted ? "translateY(-8px)" : undefined,
        filter: lifted ? "drop-shadow(0 12px 20px rgba(6,54,116,0.34))" : undefined,
      }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 h-full w-full"
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        <path d={path} fill={fill} stroke={stroke} strokeWidth={1.5} />
      </svg>
      {/* Centered text block; padding clears the tab/blank zones on every edge. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-[16%] py-[15%] text-center">
        {typeof rank === "number" ? (
          <div className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${mutedClass}`}>
            #{rank}
            {tierLabel ? ` · ${tierLabel}` : ""}
          </div>
        ) : null}
        <div className={`line-clamp-2 text-[13px] font-semibold leading-tight ${textClass}`}>{title}</div>
        <div className={`line-clamp-1 text-[10px] ${mutedClass}`}>{subtitle}</div>
        <div className={`mt-0.5 text-lg font-bold tabular-nums ${textClass}`}>{scoreText}</div>
      </div>
    </button>
  );
}

function DetailCard({
  title,
  onClose,
  children,
  cta,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  cta?: ReactNode;
}) {
  return (
    <section className="pat-card p-6" data-testid="board-detail">
      <div className="flex items-start justify-between">
        <div className="pat-label">{title}</div>
        <button type="button" className="text-sm text-[var(--shell-muted)]" onClick={onClose}>
          ✕
        </button>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
      {cta}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-[var(--shell-muted)]">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-[var(--shell-ink)]">{value}</dd>
    </div>
  );
}
