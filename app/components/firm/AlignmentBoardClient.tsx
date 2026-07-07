"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AlignmentBoardData, BoardCandidate, BoardPiece } from "@/lib/alignmentBoard";

/**
 * Alignment Board v1 (Block D). Grid of stack pieces + a candidate rail; picking
 * a piece and a candidate stages a swap and recomputes projected firm alignment
 * live (pure mean, mirrors lib/alignmentBoard.recomputeProjectedAlignment).
 * Clicking any tile opens a five-fact detail card.
 *
 * Entitlement split: `entitled` (Elite) sees real candidate names + projected
 * fit; Pro sees the same board with candidates anonymized as "Secret Product N",
 * detail limited to category + projected delta, and a Reveal-with-Elite CTA. The
 * firm's own stack pieces are always named — only candidates are the paywall.
 */

const CONFIDENCE_LABEL: Record<BoardPiece["confidence"], string> = {
  no_signal: "Pending",
  sample_thin: "Sample-thin",
  emerging: "Building",
  grounded: "Grounded",
};

function mean(scores: Array<number | null>): number | null {
  const known = scores.filter((s): s is number => s !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length);
}

type Selection =
  | { kind: "piece"; id: string }
  | { kind: "candidate"; id: string }
  | null;

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

  const projected = useMemo(() => {
    if (!swapOutId || !swapInId) return baseline;
    const candidate = data.candidates.find((c) => c.productId === swapInId);
    const scores = data.stack.map((piece) =>
      piece.productId === swapOutId ? candidate?.projectedScore ?? null : piece.scoreVsFirm
    );
    return mean(scores);
  }, [swapOutId, swapInId, baseline, data.stack, data.candidates]);

  const projectedDelta =
    projected !== null && baseline !== null && swapOutId && swapInId ? projected - baseline : null;

  const detailPiece =
    detail?.kind === "piece" ? data.stack.find((p) => p.productId === detail.id) ?? null : null;
  const detailCandidateIndex =
    detail?.kind === "candidate" ? data.candidates.findIndex((c) => c.productId === detail.id) : -1;
  const detailCandidate = detailCandidateIndex >= 0 ? data.candidates[detailCandidateIndex] : null;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Alignment Board</div>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <div className="pat-stat-number text-5xl">{baseline ?? "—"}{baseline !== null ? "%" : ""}</div>
            <div className="text-sm text-[var(--shell-muted)]">
              {data.firmName} · current alignment · {data.confidenceLabel}
            </div>
          </div>
          {projectedDelta !== null ? (
            <div>
              <div className="pat-stat-number text-5xl text-[var(--brand-c2-blue)]">
                {projected}%
              </div>
              <div className="text-sm text-[var(--shell-muted)]">
                projected after swap ({projectedDelta >= 0 ? "+" : ""}
                {projectedDelta})
              </div>
            </div>
          ) : null}
          {swapOutId || swapInId ? (
            <button
              type="button"
              className="pat-button-secondary text-sm"
              onClick={() => {
                setSwapOutId(null);
                setSwapInId(null);
              }}
            >
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

      {/* Current stack */}
      <section>
        <div className="pat-label mb-3">Your stack — pick a piece to swap out</div>
        {data.stack.length === 0 ? (
          <div className="pat-card p-6 text-sm text-[var(--shell-muted)]">
            No reviewed products yet. Complete product reviews to place pieces on the board.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.stack.map((piece) => {
              const selected = swapOutId === piece.productId;
              return (
                <article
                  key={piece.productId}
                  data-testid="board-piece"
                  data-product-name={piece.productName}
                  className={`pat-card p-5 ${selected ? "border-[var(--brand-c2-blue)] shadow-[0_0_0_1px_var(--brand-c2-blue)]" : ""}`}
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => setDetail({ kind: "piece", id: piece.productId })}
                  >
                    <div className="font-semibold text-[var(--shell-ink)]">{piece.productName}</div>
                    <div className="text-xs text-[var(--shell-muted)]">
                      {piece.vendorName}
                      {piece.category ? ` · ${piece.category}` : ""}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="pat-stat-number text-2xl">
                        {piece.scoreVsFirm ?? "—"}
                        {piece.scoreVsFirm !== null ? "%" : ""}
                      </span>
                      <span className="text-xs text-[var(--shell-muted)]">
                        {CONFIDENCE_LABEL[piece.confidence]}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="mt-4 text-sm font-semibold text-[var(--brand-c2-blue)]"
                    onClick={() => setSwapOutId(selected ? null : piece.productId)}
                  >
                    {selected ? "✓ Swapping out" : "Swap out"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Candidate rail */}
      <section>
        <div className="pat-label mb-3">
          Candidates — {swapOutId ? "pick one to swap in" : "pick a piece above first"}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.candidates.map((candidate, index) => {
            const selected = swapInId === candidate.productId;
            const delta =
              candidate.projectedScore !== null && baseline !== null
                ? candidate.projectedScore - baseline
                : null;
            return (
              <article
                key={candidate.productId}
                data-testid="board-candidate"
                data-anonymized={entitled ? "0" : "1"}
                className={`pat-card p-5 ${selected ? "border-[var(--brand-c2-blue)] shadow-[0_0_0_1px_var(--brand-c2-blue)]" : ""}`}
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setDetail({ kind: "candidate", id: candidate.productId })}
                >
                  <div className="font-semibold text-[var(--shell-ink)]">
                    {candidateLabel(candidate, index)}
                  </div>
                  <div className="text-xs text-[var(--shell-muted)]">
                    {entitled ? candidate.vendorName : "Vendor hidden"}
                    {candidate.category ? ` · ${candidate.category}` : ""}
                  </div>
                  <div className="mt-3 text-sm text-[var(--shell-muted)]">
                    Projected alignment {delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta}`}
                  </div>
                </button>
                <button
                  type="button"
                  disabled={!swapOutId}
                  className="mt-4 text-sm font-semibold text-[var(--brand-c2-blue)] disabled:opacity-40"
                  onClick={() => setSwapInId(selected ? null : candidate.productId)}
                >
                  {selected ? "✓ Swapping in" : "Swap in"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Detail card */}
      {detailPiece ? (
        <section className="pat-card p-6" data-testid="board-detail">
          <div className="flex items-start justify-between">
            <div className="pat-label">{detailPiece.productName}</div>
            <button type="button" className="text-sm text-[var(--shell-muted)]" onClick={() => setDetail(null)}>
              ✕
            </button>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Fact label="Product · vendor" value={`${detailPiece.productName} · ${detailPiece.vendorName}`} />
            <Fact label="Price band" value={detailPiece.priceBand} />
            <Fact
              label="Score vs. your firm"
              value={detailPiece.scoreVsFirm !== null ? `${detailPiece.scoreVsFirm}% · ${CONFIDENCE_LABEL[detailPiece.confidence]}` : "Not yet reviewed"}
            />
            <Fact label="Top strength" value={detailPiece.topStrength} />
            <Fact label="Top gap" value={detailPiece.topGap} />
          </dl>
        </section>
      ) : null}

      {detailCandidate ? (
        <section className="pat-card p-6" data-testid="board-detail">
          <div className="flex items-start justify-between">
            <div className="pat-label">{candidateLabel(detailCandidate, detailCandidateIndex)}</div>
            <button type="button" className="text-sm text-[var(--shell-muted)]" onClick={() => setDetail(null)}>
              ✕
            </button>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {entitled ? (
              <>
                <Fact label="Product · vendor" value={`${detailCandidate.productName} · ${detailCandidate.vendorName}`} />
                <Fact label="Price band" value={detailCandidate.priceBand} />
                <Fact
                  label="Projected fit vs. your firm"
                  value={detailCandidate.projectedScore !== null ? `${detailCandidate.projectedScore}% · ${CONFIDENCE_LABEL[detailCandidate.confidence]}` : "Insufficient signal"}
                />
              </>
            ) : (
              <>
                <Fact label="Category" value={detailCandidate.category ?? "—"} />
                <Fact
                  label="Projected delta"
                  value={
                    detailCandidate.projectedScore !== null && baseline !== null
                      ? `${detailCandidate.projectedScore - baseline >= 0 ? "+" : ""}${detailCandidate.projectedScore - baseline}`
                      : "—"
                  }
                />
              </>
            )}
          </dl>
          {!entitled ? (
            <Link className="pat-button-primary mt-5 inline-flex text-sm" href={membershipHref}>
              Reveal with Elite
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
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
