"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AlignmentRadar, { type RadarAxis } from "@/app/components/firm/AlignmentRadar";
import { logSandboxSwap } from "@/app/firm/alignment-board/swapActions";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";
import { formatDelta, formatScoreValue } from "@/lib/formatDelta";
import { fitHeatColor, fitTierLabel } from "@/lib/fitHeat";
import { recomputeProjectedAlignment, type AlignmentBoardData, type BoardCandidate, type BoardPiece } from "@/lib/alignmentBoard";
import { splitCandidatesForSlot } from "@/lib/sandboxLanes";
import type { ProductFitDimensionScore } from "@/lib/productFitDimensions";
import { CONFIDENCE_BAND_LABEL } from "@/lib/confidenceBands";

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

// B8-2: confidence renders from the ONE lexicon (Grounded / Early signal / No
// signal), never score-band words like "Building".
const CONFIDENCE_LABEL: Record<BoardPiece["confidence"], string> = CONFIDENCE_BAND_LABEL;

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
  // Multi-piece swap: each lifted slot (the productId of a piece lifted OUT) maps
  // to the candidate productId chosen to fill it, or null = lifted, no candidate
  // yet. Up to MAX_LIFTS slots at once; `activeSlot` is the tab whose candidate
  // trays are showing. Insertion order of the record drives the tab order.
  const MAX_LIFTS = 3;
  const [swaps, setSwaps] = useState<Record<string, string | null>>({});
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [detail, setDetail] = useState<Selection>(null);
  const [showAllMovers, setShowAllMovers] = useState(false);

  const candidateLabel = (candidate: BoardCandidate) =>
    entitled ? candidate.productName : `Secret Product ${candidate.fitRank}`;

  const baseline = data.currentAlignment;
  // Both rails are swappable; look up across the ranked + not-yet-reviewed lists.
  const allCandidates = useMemo(
    () => [...data.candidates, ...data.unreviewedCandidates],
    [data.candidates, data.unreviewedCandidates]
  );
  const candidateById = useMemo(
    () => new Map(allCandidates.map((c) => [c.productId, c])),
    [allCandidates]
  );

  const liftedIds = Object.keys(swaps);
  const candidateForSlot = (outId: string): BoardCandidate | null => {
    const inId = swaps[outId];
    return inId ? candidateById.get(inId) ?? null : null;
  };
  const stagedEntries = liftedIds
    .map((outId) => ({ outId, candidate: candidateForSlot(outId) }))
    .filter((e): e is { outId: string; candidate: BoardCandidate } => e.candidate !== null);
  const swapStaged = stagedEntries.length > 0;
  const activePiece = activeSlot ? data.stack.find((p) => p.productId === activeSlot) ?? null : null;
  // Candidates already committed to OTHER slots can't be dropped again.
  const takenByOtherSlots = new Set(
    liftedIds.filter((id) => id !== activeSlot).map((id) => swaps[id]).filter((v): v is string => Boolean(v))
  );

  // Elite Insights v2 (V2 demand signal): log each unique staged swap once.
  const loggedSwaps = useRef<Set<string>>(new Set());
  const stagedKey = stagedEntries.map((e) => `${e.candidate.productId}::${e.outId}`).sort().join(",");
  useEffect(() => {
    for (const { outId, candidate } of stagedEntries) {
      const key = `${candidate.productId}::${outId}`;
      if (loggedSwaps.current.has(key)) continue;
      loggedSwaps.current.add(key);
      void logSandboxSwap({ productInId: candidate.productId, productOutId: outId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedKey]);

  // Projection is RECOMPUTED from the full resulting stack (never additive
  // per-swap deltas): each lifted-and-filled slot contributes its candidate's
  // projected score, every other piece its own score.
  const projected = useMemo(() => {
    if (!swapStaged) return baseline;
    const scores = data.stack.map((piece) => {
      const inId = swaps[piece.productId];
      if (inId) return candidateById.get(inId)?.projectedScore ?? null;
      return piece.scoreVsFirm;
    });
    return recomputeProjectedAlignment(scores);
  }, [swapStaged, data.stack, swaps, candidateById, baseline]);

  const projectedDelta =
    projected !== null && baseline !== null && swapStaged ? projected - baseline : null;

  // P0 radar — real per-dimension recompute over the full projected stack (every
  // filled slot swaps its piece for the candidate; the rest hold). No uniform
  // delta. Axes with no signal are flagged thin, never faked.
  const projectedStack = useMemo(
    () =>
      swapStaged
        ? data.stack.map((piece) => candidateForSlot(piece.productId) ?? piece)
        : data.stack,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [swapStaged, data.stack, stagedKey]
  );
  const radarAxes: RadarAxis[] = useMemo(() => {
    return data.dimensionAxes.map((axis, index) => {
      const meanAt = (products: Array<{ dimensionScores: ProductFitDimensionScore[] }>) => {
        let sum = 0;
        let count = 0;
        let sample = 0;
        for (const product of products) {
          const dimension = product.dimensionScores[index];
          if (dimension && dimension.score !== null) {
            sum += dimension.score;
            count += 1;
            sample += dimension.sampleSize;
          }
        }
        return { score: count > 0 ? Math.round(sum / count) : null, sample };
      };
      const current = meanAt(data.stack);
      const projectedAxis = swapStaged ? meanAt(projectedStack) : current;
      const thin =
        current.score === null ||
        current.sample < 2 ||
        (swapStaged && projectedAxis.score === null);
      return { title: axis.title, current: current.score, projected: projectedAxis.score, thin };
    });
  }, [data.stack, data.dimensionAxes, swapStaged, projectedStack]);

  const radarEvidenceNote = useMemo(() => {
    if (!swapStaged) return null;
    const grades = stagedEntries.map((e) => e.candidate.evidenceBasis);
    if (grades.some((g) => g === "vendor_reported")) {
      return "A staged candidate's projected axes use vendor self-reported evidence — no firm review of it yet.";
    }
    if (grades.some((g) => g === "none")) {
      return "A staged candidate has no per-dimension evidence yet; that slot's projection reflects only lifting your current piece.";
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapStaged, stagedKey]);

  function pickPiece(piece: BoardPiece) {
    const wasLifted = piece.productId in swaps;
    if (wasLifted) {
      setSwaps((prev) => {
        const next = { ...prev };
        delete next[piece.productId];
        return next;
      });
      setActiveSlot((a) => (a === piece.productId ? null : a));
    } else if (liftedIds.length < MAX_LIFTS) {
      setSwaps((prev) => ({ ...prev, [piece.productId]: null }));
      setActiveSlot(piece.productId);
    }
    setDetail({ kind: "piece", id: piece.productId });
  }

  function pickCandidate(candidate: BoardCandidate) {
    setDetail({ kind: "candidate", id: candidate.productId });
    if (!activeSlot || takenByOtherSlots.has(candidate.productId)) return;
    setSwaps((prev) => ({
      ...prev,
      [activeSlot]: prev[activeSlot] === candidate.productId ? null : candidate.productId,
    }));
  }

  function resetSwap() {
    setSwaps({});
    setActiveSlot(null);
  }

  const detailPiece =
    detail?.kind === "piece" ? data.stack.find((p) => p.productId === detail.id) ?? null : null;
  const detailCandidate =
    detail?.kind === "candidate" ? allCandidates.find((c) => c.productId === detail.id) ?? null : null;

  // Breakdown: the swapped (filled) slots first — the real movers — then the rest;
  // collapse to the top 6 by default with a "Show all" expander (R3.1).
  const stagedOutIds = new Set(stagedEntries.map((e) => e.outId));
  const breakdownPieces = [...data.stack].sort((a, b) => {
    const aStaged = stagedOutIds.has(a.productId);
    const bStaged = stagedOutIds.has(b.productId);
    if (aStaged !== bStaged) return aStaged ? -1 : 1;
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
                  {data.firmName} · stack alignment · from stored product-review evidence
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
            {liftedIds.length > 0 ? (
              <button type="button" className="pat-button-secondary mt-4 text-sm" onClick={resetSwap}>
                Reset all
              </button>
            ) : null}
          </div>
          <div className="lg:justify-self-end">
            <AlignmentRadar axes={radarAxes} showProjected={swapStaged} evidenceNote={radarEvidenceNote} />
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
              const slotCandidate = candidateForSlot(piece.productId);
              const isSwapSlot = slotCandidate !== null; // lifted AND filled
              const isLifted = piece.productId in swaps; // lifted (filled or empty)
              const selected = isLifted && !isSwapSlot; // lifted, awaiting a candidate
              const shown = isSwapSlot && slotCandidate
                ? { name: candidateLabel(slotCandidate), score: slotCandidate.projectedScore, from: piece.productName, vendor: "swapped in" }
                : { name: piece.productName, score: piece.scoreVsFirm, from: null as string | null, vendor: piece.vendorName };
              return (
                <PuzzlePiece
                  key={piece.productId}
                  edges={tileEdges(index, stackCols, data.stack.length)}
                  tile
                  zIndex={data.stack.length - index}
                  fill={isSwapSlot ? C2_BLUE : selected ? STACK_FILL_LIFTED : STACK_FILL}
                  stroke={activeSlot === piece.productId ? "var(--brand-orange)" : "var(--shell-border)"}
                  lifted={isLifted}
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
            {stagedEntries.length === 1 ? (
              <>
                Swapping{" "}
                <strong className="text-[var(--shell-ink)]">
                  {data.stack.find((p) => p.productId === stagedEntries[0]!.outId)?.productName}
                </strong>{" "}
                for{" "}
                <strong className="text-[var(--shell-ink)]">
                  {candidateLabel(stagedEntries[0]!.candidate)}
                </strong>
                . Only the lifted piece moves; the rest hold.
              </>
            ) : (
              <>
                Swapping <strong className="text-[var(--shell-ink)]">{stagedEntries.length} pieces</strong> at
                once. The projected alignment is recomputed from the full resulting stack — only the lifted
                slots move, the rest hold.
              </>
            )}
          </p>
          <ul className="mt-4 space-y-2.5">
            {visibleMovers.map((piece) => {
              const slotCand = candidateForSlot(piece.productId);
              const isSwap = slotCand !== null;
              const after = isSwap ? slotCand!.projectedScore ?? null : piece.scoreVsFirm;
              const before = piece.scoreVsFirm;
              const pieceDelta = isSwap && before !== null && after !== null ? after - before : null;
              return (
                <li key={piece.productId} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-[var(--shell-ink)]">
                    {isSwap && slotCand ? candidateLabel(slotCand) : piece.productName}
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

      {/* Ranked candidate rail — FIRM-REVIEWED only (P2-pre) */}
      <section className="pat-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="pat-label">
            {entitled ? "Ranked candidates" : "Secret candidates"} · {activeSlot ? "click one to fill this slot" : "lift a stack piece first"}
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

        {/* Slot tabs — one per lifted piece (up to 3). Picking a tab targets that
            emptied slot; its own candidate lanes render below. */}
        {liftedIds.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2" data-testid="board-slot-tabs">
            {liftedIds.map((outId) => {
              const p = data.stack.find((x) => x.productId === outId);
              const filled = candidateForSlot(outId) !== null;
              const isActive = activeSlot === outId;
              return (
                <button
                  key={outId}
                  type="button"
                  onClick={() => setActiveSlot(outId)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    isActive
                      ? "border-[var(--brand-orange)] bg-[rgba(229,109,4,0.08)] text-[var(--shell-ink)]"
                      : "border-[var(--shell-border)] text-[var(--shell-muted)]"
                  }`}
                >
                  Slot: {p ? (entitled ? p.productName : p.productName) : outId}
                  {filled ? " ✓" : ""}
                </button>
              );
            })}
            <span className="self-center text-xs text-[var(--shell-muted)]">
              {liftedIds.length} of {MAX_LIFTS} slots lifted
            </span>
          </div>
        ) : null}

        {data.candidates.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--shell-muted)]">
            No firm-reviewed candidates yet — see the not-yet-reviewed set below.
          </p>
        ) : activePiece ? (
          // Utility lanes for the active slot: "Fits this slot" (shares ≥1
          // utilityKey, ranked by slot-fit delta) then whole-firm (never hidden).
          (() => {
            const { fitsSlot, wholeFirm } = splitCandidatesForSlot(activePiece, data.candidates);
            const fitsIds = new Set(fitsSlot.map((c) => c.productId));
            const rest = wholeFirm.filter((c) => !fitsIds.has(c.productId));
            const renderLane = (list: readonly BoardCandidate[]) => (
              <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(168px,1fr))]">
                {list.map((candidate) => (
                  <CandidatePiece
                    key={candidate.productId}
                    candidate={candidate}
                    baseline={baseline}
                    activeSlotId={activeSlot}
                    chosenInId={activeSlot ? swaps[activeSlot] ?? null : null}
                    takenElsewhere={takenByOtherSlots.has(candidate.productId)}
                    activePieceName={activePiece.productName}
                    entitled={entitled}
                    candidateLabel={candidateLabel}
                    onPick={pickCandidate}
                  />
                ))}
              </div>
            );
            return (
              <>
                {fitsSlot.length > 0 ? (
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--shell-ink)]">
                      Fits this slot · shares a job with {entitled ? activePiece.productName : "your lifted piece"}
                    </div>
                    {renderLane(fitsSlot)}
                  </div>
                ) : null}
                <div className="mt-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--shell-muted)]">
                    {fitsSlot.length > 0 ? "Whole firm · every candidate" : "Whole firm · no utility-match candidate"}
                  </div>
                  {renderLane(rest)}
                </div>
              </>
            );
          })()
        ) : (
          <>
            <p className="mt-3 text-xs text-[var(--shell-muted)]">
              Ranked by projected fit — every rank is backed by real firm reviews.
            </p>
            <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(168px,1fr))]">
              {data.candidates.map((candidate) => (
                <CandidatePiece
                  key={candidate.productId}
                  candidate={candidate}
                  baseline={baseline}
                  activeSlotId={activeSlot}
                  chosenInId={null}
                  takenElsewhere={false}
                  activePieceName={null}
                  entitled={entitled}
                  candidateLabel={candidateLabel}
                  onPick={pickCandidate}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* "Not yet firm-reviewed" section — VENDOR-REPORTED only, floored (P2-pre) */}
      {data.unreviewedCandidates.length > 0 ? (
        <section className="pat-card border-dashed border-[var(--brand-orange)]/40 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="pat-label text-[var(--brand-orange)]">Not yet firm-reviewed</div>
            <span className="text-xs text-[var(--brand-orange)]">
              Vendor self-reported · needs firm reviews to enter ranked fits
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--shell-muted)]">
            Swappable to explore, but the projection is the vendor&rsquo;s own claim — not firm-verified,
            so these carry wider confidence bands and never rank against the fits above.
          </p>
          <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(168px,1fr))]">
            {data.unreviewedCandidates.map((candidate) => (
              <CandidatePiece
                key={candidate.productId}
                candidate={candidate}
                baseline={baseline}
                activeSlotId={activeSlot}
                chosenInId={activeSlot ? swaps[activeSlot] ?? null : null}
                takenElsewhere={takenByOtherSlots.has(candidate.productId)}
                activePieceName={activePiece?.productName ?? null}
                entitled={entitled}
                candidateLabel={candidateLabel}
                onPick={pickCandidate}
                unreviewed
              />
            ))}
          </div>
        </section>
      ) : null}

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
          title={
            detailCandidate.grade === "vendor_reported"
              ? `Not yet firm-reviewed · ${candidateLabel(detailCandidate)}`
              : `Sandbox Fit #${detailCandidate.fitRank} · ${candidateLabel(detailCandidate)}`
          }
          onClose={() => setDetail(null)}
          cta={
            !entitled ? (
              <Link className="pat-button-primary mt-5 inline-flex text-sm" href={membershipHref}>
                Reveal with Elite
              </Link>
            ) : null
          }
        >
          {detailCandidate.grade === "vendor_reported" ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-orange)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--brand-orange)]" />
                Vendor self-reported — no firm reviews yet; needs firm reviews to enter the ranked fits.
              </span>
            </div>
          ) : null}
          {entitled ? (
            <>
              <Fact label="Product · vendor" value={`${detailCandidate.productName} · ${detailCandidate.vendorName}`} />
              <Fact label="Price band" value={detailCandidate.priceBand} />
              <Fact
                label={detailCandidate.grade === "vendor_reported" ? "Vendor self-reported fit" : "Projected fit vs. your firm"}
                value={
                  detailCandidate.projectedScore !== null
                    ? `${formatScoreValue(detailCandidate.projectedScore)}% · ${CONFIDENCE_LABEL[detailCandidate.confidence]}`
                    : "Insufficient signal"
                }
              />
            </>
          ) : (
            <>
              <Fact
                label={detailCandidate.grade === "vendor_reported" ? "Status" : "Sandbox Fit rank"}
                value={
                  detailCandidate.grade === "vendor_reported"
                    ? "Not yet firm-reviewed"
                    : `#${detailCandidate.fitRank} of ${data.candidates.length}`
                }
              />
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
      <OutputDisclaimer variant="note" />
    </div>
  );
}

/**
 * One candidate puzzle piece — shared by the ranked (firm-reviewed) rail and the
 * "Not yet firm-reviewed" (vendor-reported) section. `unreviewed` marks the
 * vendor-reported treatment: a dashed orange outline and a "self-reported" tier
 * label instead of a fit tier, so the grade reads at a glance.
 */
function CandidatePiece({
  candidate,
  baseline,
  activeSlotId,
  chosenInId,
  takenElsewhere,
  activePieceName,
  entitled,
  candidateLabel,
  onPick,
  unreviewed = false,
}: {
  candidate: BoardCandidate;
  baseline: number | null;
  /** The lifted slot currently being filled, or null (nothing lifted). */
  activeSlotId: string | null;
  /** The candidate productId chosen for the active slot, or null. */
  chosenInId: string | null;
  /** True when this candidate is already committed to a DIFFERENT slot. */
  takenElsewhere: boolean;
  /** The lifted piece's name (for the swapped-in title). */
  activePieceName: string | null;
  entitled: boolean;
  candidateLabel: (candidate: BoardCandidate) => string;
  onPick: (candidate: BoardCandidate) => void;
  unreviewed?: boolean;
}) {
  const delta =
    candidate.projectedScore !== null && baseline !== null ? candidate.projectedScore - baseline : null;
  const isSwappedIn = chosenInId === candidate.productId;
  const heat = fitHeatColor(delta);
  // Can't pick without a lifted slot, and can't double-book a candidate.
  const disabled = (!activeSlotId || takenElsewhere) && !isSwappedIn;
  return (
    <PuzzlePiece
      edges={looseEdges(candidate.fitRank)}
      zIndex={0}
      fill={isSwappedIn ? STACK_FILL : unreviewed ? "#f7efe6" : heat}
      stroke={isSwappedIn ? "var(--shell-border)" : unreviewed ? "var(--brand-orange)" : heat}
      strokeDashed={unreviewed && !isSwappedIn}
      lifted={isSwappedIn}
      textClass={isSwappedIn || unreviewed ? "text-[var(--shell-ink)]" : "text-white"}
      mutedClass={isSwappedIn || unreviewed ? "text-[var(--shell-muted)]" : "text-white/80"}
      disabled={disabled}
      onClick={() => onPick(candidate)}
      testId="board-candidate"
      dataAnonymized={entitled ? "0" : "1"}
      dataGrade={candidate.grade}
      rank={candidate.fitRank}
      tierLabel={
        isSwappedIn
          ? undefined
          : takenElsewhere
            ? "In another slot"
            : unreviewed
              ? "Self-reported"
              : fitTierLabel(delta)
      }
      title={isSwappedIn && activePieceName ? activePieceName : candidateLabel(candidate)}
      subtitle={isSwappedIn ? "⇄ lifted from your stack" : entitled ? candidate.vendorName : "Vendor hidden"}
      scoreText={formatDelta(delta)}
    />
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
  dataGrade,
  rank,
  tierLabel,
  title,
  subtitle,
  scoreText,
  strokeDashed = false,
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
  dataGrade?: string;
  rank?: number;
  tierLabel?: string;
  title: string;
  subtitle: string;
  scoreText: string;
  strokeDashed?: boolean;
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
      data-grade={dataGrade}
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
        <path
          d={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
          strokeDasharray={strokeDashed ? "5 4" : undefined}
        />
      </svg>
      {/* Centered text block; padding clears the tab/blank zones on every edge.
          overflow-hidden + per-line clamps keep long labels (e.g. the
          "Self-reported" tier tag, B7-3) inside the piece border. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 overflow-hidden px-[16%] py-[15%] text-center">
        {typeof rank === "number" ? (
          <div className={`w-full truncate text-[9px] font-semibold uppercase tracking-[0.1em] ${mutedClass}`}>
            #{rank}
            {tierLabel ? ` · ${tierLabel}` : ""}
          </div>
        ) : null}
        <div className={`line-clamp-2 max-w-full text-[13px] font-semibold leading-tight ${textClass}`}>{title}</div>
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
