"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import AlignmentRadar, { type RadarAxis } from "@/app/components/firm/AlignmentRadar";
import { formatDelta, formatScoreValue } from "@/lib/formatDelta";
import type { AlignmentBoardData, BoardCandidate, BoardPiece } from "@/lib/alignmentBoard";

/**
 * Alignment Sandbox v2 (Redlines R2-Board). Real jigsaw-outline pieces in the
 * established card palette: stack pieces are light with the standard card border
 * (selected = c2-blue ring); Secret/candidate pieces are c2-blue with light text
 * and a "Sandbox Fit #N" rank. Pick a stack piece, then a candidate, and the two
 * exchange places — the score banner, the two-polygon positioning radar
 * (current vs projected, live), and the per-piece breakdown all recompute.
 *
 * Entitlement: Elite sees candidate names; Pro sees "Secret Product N" + the
 * Reveal-with-Elite tease ("your #1 piece exists"). Stack pieces are the firm's
 * own reviewed products, always named.
 */

const CONFIDENCE_LABEL: Record<BoardPiece["confidence"], string> = {
  no_signal: "Pending",
  sample_thin: "Sample-thin",
  emerging: "Building",
  grounded: "Grounded",
};

// Jigsaw geometry — left notch + right knob so pieces interlock along a row.
const PIECE_W = 196;
const PIECE_H = 150;
const TAB = 26;
const C2_BLUE = "#063674";

function piecePath(w = PIECE_W, h = PIECE_H, tab = TAB): string {
  const midTop = h * 0.5 - tab * 0.6;
  const midBot = h * 0.5 + tab * 0.6;
  return [
    "M8 0",
    `L${w - 8} 0`,
    `Q${w} 0 ${w} 8`,
    `L${w} ${midTop}`,
    `C${w + tab} ${midTop} ${w + tab} ${midBot} ${w} ${midBot}`, // right knob (convex, +x)
    `L${w} ${h - 8}`,
    `Q${w} ${h} ${w - 8} ${h}`,
    `L8 ${h}`,
    `Q0 ${h} 0 ${h - 8}`,
    `L0 ${midBot}`,
    `C${tab} ${midBot} ${tab} ${midTop} 0 ${midTop}`, // left notch (concave, +x)
    "L0 8",
    "Q0 0 8 0",
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

  // Radar: current module shape + a directional projected shape (each axis nudged
  // by the overall projected delta, clamped) that redraws live on swap.
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

  const topCandidate = data.candidates[0] ?? null;

  return (
    <div className="space-y-8">
      <style>{`@keyframes patPieceIn{0%{opacity:0;transform:translateY(8px) scale(.94)}100%{opacity:1;transform:none}}`}</style>

      {/* Stat lockup + radar */}
      <section className="pat-card p-8">
        <div className="pat-label">Alignment Sandbox</div>
        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div>
                <div className="pat-stat-number text-5xl">
                  {formatScoreValue(baseline)}
                  {baseline !== null ? "%" : ""}
                </div>
                <div className="text-sm text-[var(--shell-muted)]">
                  {data.firmName} · current alignment · {data.confidenceLabel}
                </div>
              </div>
              {swapStaged && projected !== null ? (
                <>
                  <div aria-hidden="true" className="pb-3 text-3xl text-[var(--shell-muted)]">
                    →
                  </div>
                  <div style={{ animation: "patPieceIn .3s ease" }}>
                    <div className="pat-stat-number text-5xl text-[var(--brand-orange)]">
                      {formatScoreValue(projected)}%
                    </div>
                    <div className="text-sm text-[var(--shell-muted)]">
                      projected after swap ({formatDelta(projectedDelta)})
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <p className="mt-5 max-w-md text-sm leading-6 text-[var(--shell-muted)]">
              Lift a piece from your stack, then drop in a Secret candidate to see your projected
              alignment shape move. {data.confidence === "sample_thin" || data.confidence === "no_signal"
                ? "Sample is thin, so projections are directional — PAT won't fake precision."
                : "Projections are directional, drawn from cross-firm benchmarks."}
            </p>
            {swapOutId || swapInId ? (
              <button type="button" className="pat-button-secondary mt-4 text-sm" onClick={resetSwap}>
                Reset swap
              </button>
            ) : null}
          </div>
          <AlignmentRadar axes={radarAxes} showProjected={swapStaged} />
        </div>
      </section>

      {/* Stack — interlocking jigsaw pieces */}
      <section>
        <div className="pat-label mb-3">Your stack — click a piece to lift it out</div>
        {data.stack.length === 0 ? (
          <div className="pat-card p-6 text-sm text-[var(--shell-muted)]">
            No reviewed products yet. Complete product reviews to place pieces on the board.
          </div>
        ) : (
          <div className="pat-card overflow-x-auto p-6">
            <div className="flex items-stretch pl-1">
              {data.stack.map((piece, index) => {
                const isSwapSlot = swapStaged && piece.productId === swapOutId;
                const shown = isSwapSlot && swapCandidate
                  ? { name: candidateLabel(swapCandidate), score: swapCandidate.projectedScore, from: piece.productName, vendor: "swapped in" }
                  : { name: piece.productName, score: piece.scoreVsFirm, from: null as string | null, vendor: piece.vendorName };
                const selected = swapOutId === piece.productId && !swapStaged;
                return (
                  <JigsawPiece
                    key={piece.productId}
                    index={index}
                    fill={isSwapSlot ? C2_BLUE : "#ffffff"}
                    stroke={selected ? C2_BLUE : "var(--shell-border)"}
                    strokeWidth={selected ? 3 : 1.5}
                    textClass={isSwapSlot ? "text-white" : "text-[var(--shell-ink)]"}
                    mutedClass={isSwapSlot ? "text-white/75" : "text-[var(--shell-muted)]"}
                    animate={isSwapSlot}
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
          </div>
        )}
      </section>

      {/* Breakdown */}
      {swapStaged ? (
        <section className="pat-card p-6" data-testid="board-breakdown" style={{ animation: "patPieceIn .3s ease" }}>
          <div className="pat-label">What changes — stack breakdown</div>
          <p className="mt-2 text-sm text-[var(--shell-muted)]">
            Swapping <strong className="text-[var(--shell-ink)]">{swapPiece?.productName}</strong> for{" "}
            <strong className="text-[var(--shell-ink)]">{swapCandidate ? candidateLabel(swapCandidate) : ""}</strong>
            . Only the lifted piece moves; the rest of your stack holds.
          </p>
          <ul className="mt-4 space-y-2.5">
            {data.stack.map((piece) => {
              const isSwap = piece.productId === swapOutId;
              const after = isSwap ? swapCandidate?.projectedScore ?? null : piece.scoreVsFirm;
              const before = piece.scoreVsFirm;
              const pieceDelta = isSwap && before !== null && after !== null ? after - before : null;
              return (
                <li key={piece.productId} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm text-[var(--shell-ink)]">
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
                  <span className="w-24 shrink-0 text-right text-xs text-[var(--shell-muted)]">
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
        </section>
      ) : null}

      {/* Candidate rail — ranked Secret pieces */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div className="pat-label">
            Secret candidates — {swapOutId ? "click one to swap it in" : "lift a stack piece first"}
          </div>
          {!entitled && topCandidate ? (
            <span className="text-xs text-[var(--shell-muted)]">
              Your Sandbox Fit #1 piece exists —{" "}
              <Link className="font-semibold text-[var(--brand-c2-blue)] hover:underline" href={membershipHref}>
                Reveal with Elite
              </Link>
            </span>
          ) : null}
        </div>
        <div className="grid gap-x-1 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.candidates.map((candidate) => {
            const delta =
              candidate.projectedScore !== null && baseline !== null
                ? candidate.projectedScore - baseline
                : null;
            const isSwappedIn = swapStaged && candidate.productId === swapInId;
            return (
              <JigsawPiece
                key={candidate.productId}
                index={0}
                fill={isSwappedIn ? "#ffffff" : C2_BLUE}
                stroke={swapInId === candidate.productId ? "var(--brand-orange)" : C2_BLUE}
                strokeWidth={swapInId === candidate.productId ? 3 : 1.5}
                textClass={isSwappedIn ? "text-[var(--shell-ink)]" : "text-white"}
                mutedClass={isSwappedIn ? "text-[var(--shell-muted)]" : "text-white/75"}
                animate={isSwappedIn}
                disabled={!swapOutId && !isSwappedIn}
                onClick={() => pickCandidate(candidate)}
                testId="board-candidate"
                dataAnonymized={entitled ? "0" : "1"}
                rank={candidate.fitRank}
                title={isSwappedIn && swapPiece ? swapPiece.productName : candidateLabel(candidate)}
                subtitle={isSwappedIn ? "⇄ lifted from your stack" : entitled ? candidate.vendorName : "Vendor hidden"}
                scoreText={`${formatDelta(delta)}`}
              />
            );
          })}
        </div>
      </section>

      {/* Detail card */}
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

function JigsawPiece({
  index,
  fill,
  stroke,
  strokeWidth,
  textClass,
  mutedClass,
  animate,
  disabled,
  onClick,
  testId,
  dataProductName,
  dataAnonymized,
  rank,
  title,
  subtitle,
  scoreText,
}: {
  index: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textClass: string;
  mutedClass: string;
  animate: boolean;
  disabled?: boolean;
  onClick: () => void;
  testId: string;
  dataProductName?: string;
  dataAnonymized?: string;
  rank?: number;
  title: string;
  subtitle: string;
  scoreText: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      data-product-name={dataProductName}
      data-anonymized={dataAnonymized}
      className="relative shrink-0 text-left transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
      style={{
        width: PIECE_W + TAB,
        height: PIECE_H,
        marginLeft: index > 0 ? -TAB : 0,
        zIndex: 40 - index,
        animation: animate ? "patPieceIn .35s ease" : undefined,
      }}
    >
      <svg
        viewBox={`0 0 ${PIECE_W + TAB} ${PIECE_H}`}
        width={PIECE_W + TAB}
        height={PIECE_H}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <path d={piecePath()} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      </svg>
      <div className="relative z-10 flex h-full flex-col justify-between py-4 pl-6 pr-10">
        <div>
          {typeof rank === "number" ? (
            <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${mutedClass}`}>
              Sandbox Fit #{rank}
            </div>
          ) : null}
          <div className={`mt-0.5 text-sm font-semibold leading-tight ${textClass}`}>{title}</div>
          <div className={`mt-1 text-[11px] ${mutedClass}`}>{subtitle}</div>
        </div>
        <div className={`text-xl font-bold tabular-nums ${textClass}`}>{scoreText}</div>
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
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">{children}</dl>
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
