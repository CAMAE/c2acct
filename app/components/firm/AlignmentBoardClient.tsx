"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { formatDelta, formatScoreValue } from "@/lib/formatDelta";
import type { AlignmentBoardData, BoardCandidate, BoardPiece } from "@/lib/alignmentBoard";

/**
 * Alignment Board v2 (Redlines R11-R14). The firm's stack renders as colorful
 * interlocking puzzle pieces; pick a stack piece to highlight, then pick a
 * candidate to swap — the two pieces visibly exchange places (click-swap v1)
 * and the top score banner recomputes live. A projection breakdown (R12) shows
 * which stack pieces improve/degrade, in the insight-bar visual language.
 *
 * Entitlement split unchanged: Elite sees named candidates + projected fit; Pro
 * sees them as "Secret Product N" mystery pieces (dashed silhouette, R14) with
 * a Reveal-with-Elite CTA. Stack pieces are always the firm's own, always named.
 */

const CONFIDENCE_LABEL: Record<BoardPiece["confidence"], string> = {
  no_signal: "Pending",
  sample_thin: "Sample-thin",
  emerging: "Building",
  grounded: "Grounded",
};

// Brand-adjacent palette; pieces cycle through it by position so the stack reads
// like a colorful assembled puzzle (same energy as the charts).
const PALETTE = ["#2f6df6", "#12a594", "#f2820c", "#7c5cff", "#e8517a", "#2bb673"];
const pieceColor = (index: number) => PALETTE[index % PALETTE.length]!;

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

  const candidateLabel = (candidate: BoardCandidate, index: number) =>
    entitled ? candidate.productName : `Secret Product ${index + 1}`;

  const baseline = data.currentAlignment;
  const swapCandidate = swapInId ? data.candidates.find((c) => c.productId === swapInId) ?? null : null;
  const swapPiece = swapOutId ? data.stack.find((p) => p.productId === swapOutId) ?? null : null;

  const projected = useMemo(() => {
    if (!swapOutId || !swapCandidate) return baseline;
    const scores = data.stack.map((piece) =>
      piece.productId === swapOutId ? swapCandidate.projectedScore ?? null : piece.scoreVsFirm
    );
    return mean(scores);
  }, [swapOutId, swapCandidate, baseline, data.stack]);

  const projectedDelta =
    projected !== null && baseline !== null && swapOutId && swapInId ? projected - baseline : null;

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
  const detailCandidateIndex =
    detail?.kind === "candidate" ? data.candidates.findIndex((c) => c.productId === detail.id) : -1;
  const detailCandidate = detailCandidateIndex >= 0 ? data.candidates[detailCandidateIndex] : null;

  const swapStaged = Boolean(swapOutId && swapInId && swapCandidate);

  return (
    <div className="space-y-8">
      <style>{`@keyframes patPieceIn{0%{opacity:0;transform:translateY(8px) scale(.92)}100%{opacity:1;transform:none}}`}</style>

      {/* Score banner */}
      <section className="pat-card p-8">
        <div className="pat-label">Alignment Sandbox</div>
        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
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
              <div>
                <div
                  className="pat-stat-number text-5xl text-[var(--brand-c2-blue)]"
                  style={{ animation: "patPieceIn .3s ease" }}
                >
                  {formatScoreValue(projected)}%
                </div>
                <div className="text-sm text-[var(--shell-muted)]">
                  projected after swap ({formatDelta(projectedDelta)})
                </div>
              </div>
            </>
          ) : null}
          {swapOutId || swapInId ? (
            <button type="button" className="pat-button-secondary ml-auto text-sm" onClick={resetSwap}>
              Reset swap
            </button>
          ) : null}
        </div>
        {data.confidence === "sample_thin" || data.confidence === "no_signal" ? (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
            Sample is thin, so this projection is directional — PAT won&rsquo;t fake precision on a
            small number of reviews. It sharpens as your firm reviews more of the stack.
          </p>
        ) : null}
      </section>

      {/* Stack — interlocking puzzle pieces */}
      <section>
        <div className="pat-label mb-3">Your stack — click a piece to lift it out</div>
        {data.stack.length === 0 ? (
          <div className="pat-card p-6 text-sm text-[var(--shell-muted)]">
            No reviewed products yet. Complete product reviews to place pieces on the board.
          </div>
        ) : (
          <div className="pat-card overflow-x-auto p-6">
            <div className="flex items-stretch gap-1.5">
              {data.stack.map((piece, index) => {
                const isSwapSlot = swapStaged && piece.productId === swapOutId;
                // When a swap is staged, this slot shows the incoming candidate.
                const shown = isSwapSlot && swapCandidate
                  ? { name: swapCandidate.productName, score: swapCandidate.projectedScore, from: piece.productName }
                  : { name: piece.productName, score: piece.scoreVsFirm, from: null as string | null };
                const selected = swapOutId === piece.productId && !swapStaged;
                return (
                  <PuzzlePiece
                    key={piece.productId}
                    index={index}
                    isLast={index === data.stack.length - 1}
                    color={pieceColor(index)}
                    selected={selected}
                    swapping={isSwapSlot}
                    onClick={() => pickPiece(piece)}
                    ariaLabel={`Stack piece ${shown.name}`}
                    testId="board-piece"
                    productName={piece.productName}
                    title={shown.name}
                    subtitle={shown.from ? `⇄ was ${shown.from}` : piece.vendorName}
                    scoreText={shown.score !== null ? `${formatScoreValue(shown.score)}%` : "—"}
                  />
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* R12 projection breakdown */}
      {swapStaged ? (
        <section className="pat-card p-6" data-testid="board-breakdown" style={{ animation: "patPieceIn .3s ease" }}>
          <div className="pat-label">What changes — stack breakdown</div>
          <p className="mt-2 text-sm text-[var(--shell-muted)]">
            Swapping <strong className="text-[var(--shell-ink)]">{swapPiece?.productName}</strong> for{" "}
            <strong className="text-[var(--shell-ink)]">
              {entitled ? swapCandidate?.productName : "the selected candidate"}
            </strong>
            . Only the lifted piece moves; the rest of your stack holds.
          </p>
          <ul className="mt-4 space-y-2.5">
            {data.stack.map((piece, index) => {
              const isSwap = piece.productId === swapOutId;
              const after = isSwap ? swapCandidate?.projectedScore ?? null : piece.scoreVsFirm;
              const before = piece.scoreVsFirm;
              const pieceDelta = isSwap && before !== null && after !== null ? after - before : null;
              return (
                <li key={piece.productId} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm text-[var(--shell-ink)]">
                    {isSwap ? (entitled ? swapCandidate?.productName : "Candidate") : piece.productName}
                  </span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, after ?? 0))}%`,
                        background: isSwap ? "var(--brand-c2-blue)" : pieceColor(index),
                        opacity: isSwap ? 1 : 0.55,
                      }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-[var(--shell-muted)]">
                    {after !== null ? `${formatScoreValue(after)}%` : "—"}
                    {pieceDelta !== null ? (
                      <span
                        className={pieceDelta >= 0 ? "text-[var(--shell-positive)]" : "text-[var(--brand-orange)]"}
                      >
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

      {/* Candidate rail — mystery pieces for Pro */}
      <section>
        <div className="pat-label mb-3">
          Candidates — {swapOutId ? "click one to swap it in" : "lift a stack piece first"}
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {data.candidates.map((candidate, index) => {
            const delta =
              candidate.projectedScore !== null && baseline !== null
                ? candidate.projectedScore - baseline
                : null;
            const isSwappedIn = swapStaged && candidate.productId === swapInId;
            const mystery = !entitled;
            return (
              <CandidatePiece
                key={candidate.productId}
                mystery={mystery}
                selected={swapInId === candidate.productId}
                returning={isSwappedIn}
                returningLabel={isSwappedIn && swapPiece ? swapPiece.productName : null}
                disabled={!swapOutId}
                onClick={() => pickCandidate(candidate)}
                testId="board-candidate"
                anonymized={mystery}
                title={candidateLabel(candidate, index)}
                subtitle={
                  isSwappedIn
                    ? "⇄ lifted from your stack"
                    : entitled
                      ? candidate.vendorName
                      : "Vendor hidden"
                }
                projectedText={`Projected ${formatDelta(delta)}`}
                confidence={CONFIDENCE_LABEL[candidate.confidence]}
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
          title={candidateLabel(detailCandidate, detailCandidateIndex)}
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
  index,
  isLast,
  color,
  selected,
  swapping,
  onClick,
  ariaLabel,
  testId,
  productName,
  title,
  subtitle,
  scoreText,
}: {
  index: number;
  isLast: boolean;
  color: string;
  selected: boolean;
  swapping: boolean;
  onClick: () => void;
  ariaLabel: string;
  testId: string;
  productName: string;
  title: string;
  subtitle: string;
  scoreText: string;
}) {
  void index;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      data-product-name={productName}
      className={`relative flex min-w-[9.5rem] shrink-0 flex-col justify-between rounded-2xl px-4 py-4 text-left text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 ${
        selected ? "z-10 -translate-y-1 ring-4 ring-white ring-offset-2 ring-offset-[var(--brand-c2-blue)]" : ""
      }`}
      style={{ background: color, animation: swapping ? "patPieceIn .35s ease" : undefined }}
    >
      {/* interlocking knob into the next piece */}
      {!isLast ? (
        <span
          aria-hidden="true"
          className="absolute right-0 top-1/2 z-10 h-5 w-5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-white/30"
          style={{ background: color }}
        />
      ) : null}
      <div className="text-sm font-semibold leading-tight">{title}</div>
      <div className="mt-1 text-[11px] text-white/80">{subtitle}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{scoreText}</div>
    </button>
  );
}

function CandidatePiece({
  mystery,
  selected,
  returning,
  returningLabel,
  disabled,
  onClick,
  testId,
  anonymized,
  title,
  subtitle,
  projectedText,
  confidence,
}: {
  mystery: boolean;
  selected: boolean;
  returning: boolean;
  returningLabel: string | null;
  disabled: boolean;
  onClick: () => void;
  testId: string;
  anonymized: boolean;
  title: string;
  subtitle: string;
  projectedText: string;
  confidence: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !returning}
      data-testid={testId}
      data-anonymized={anonymized ? "1" : "0"}
      className={`relative flex flex-col rounded-2xl px-4 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? "ring-2 ring-[var(--brand-c2-blue)]" : ""
      } ${
        returning
          ? "border-2 border-[var(--brand-c2-blue)] bg-[var(--shell-panel-soft)]"
          : mystery
            ? "border-2 border-dashed border-[var(--shell-border)] bg-[repeating-linear-gradient(135deg,var(--shell-panel-soft),var(--shell-panel-soft)_10px,rgba(6,54,116,0.04)_10px,rgba(6,54,116,0.04)_20px)]"
            : "border border-[var(--shell-border)] bg-white"
      }`}
      style={{ animation: returning ? "patPieceIn .35s ease" : undefined }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--shell-ink)]">
          {mystery && !returning ? <span aria-hidden="true">🧩 </span> : null}
          {returning && returningLabel ? returningLabel : title}
        </span>
        {mystery && !returning ? (
          <span aria-hidden="true" className="text-lg text-[var(--shell-muted)]">
            ?
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-[11px] text-[var(--shell-muted)]">{subtitle}</div>
      <div className="mt-3 text-sm text-[var(--shell-muted)]">
        {projectedText} · {confidence}
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
