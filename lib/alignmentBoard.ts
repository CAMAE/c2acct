import prisma from "@/lib/prisma";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getVendorProductInsightCatalog } from "@/lib/vendorProductInsightEngine";

/**
 * Alignment Board data layer (Elite Sprint Block D, v1). The firm's product
 * stack becomes pieces, each with this-firm's live alignment score; a candidate
 * rail carries products the firm hasn't reviewed, with a projected fit. Swapping
 * a piece deterministically recomputes projected firm alignment via
 * `recomputeProjectedAlignment` — pure mean math, no LLM.
 *
 * All scores are real and sourced from existing engines:
 *  - this-firm review score  ← getAdminCompanyBriefing().productLayer (canonical)
 *  - category / confidence / benchmark / divergence ← scoped vendor catalogs
 * AAE discipline: candidate projections are labelled with a confidence band and
 * never presented as firm-verified precision.
 *
 * Tenancy: the caller MUST authorize `firmCompanyId` first (own firm or a
 * consultant-scoped firm). Every query here is keyed by that firm id.
 */

export const PAT_ALIGNMENT_BOARD_FLAG_ENV = "PAT_ENABLE_ALIGNMENT_BOARD";

/** Default OFF — the board ships dark until this flag is set in the runtime env. */
export function isAlignmentBoardEnabled(): boolean {
  return process.env[PAT_ALIGNMENT_BOARD_FLAG_ENV] === "1";
}

export type BoardConfidence = "no_signal" | "sample_thin" | "emerging" | "grounded";

/** "$—" until real Stripe product prices exist (no live-charge copy leaks). */
export const BOARD_PRICE_BAND = "$—";

export type BoardPiece = {
  productId: string;
  productName: string;
  vendorName: string;
  category: string | null;
  /** This firm's own review score for the product (0–100), or null if unscored. */
  scoreVsFirm: number | null;
  confidence: BoardConfidence;
  topStrength: string;
  topGap: string;
  priceBand: string;
};

export type BoardCandidate = {
  productId: string;
  productName: string;
  vendorName: string;
  category: string | null;
  /** Projected fit from the cross-firm benchmark (or vendor self-report), not firm-verified. */
  projectedScore: number | null;
  confidence: BoardConfidence;
  priceBand: string;
  /** Sandbox Fit rank (1 = best projected alignment), assigned across the pool. */
  fitRank: number;
};

/** One axis of the firm's 5-module alignment shape (for the positioning radar). */
export type BoardModuleAxis = {
  key: string;
  title: string;
  score: number | null;
};

export type AlignmentBoardData = {
  firmCompanyId: string;
  firmName: string;
  /** The firm's current alignment score used as the board baseline (mean of stack scores). */
  currentAlignment: number | null;
  confidence: BoardConfidence;
  confidenceLabel: string;
  stack: BoardPiece[];
  candidates: BoardCandidate[];
  /** Five firm-module scores driving the current-shape radar polygon. */
  moduleShape: BoardModuleAxis[];
};

/** How many ranked Secret candidates the sandbox rail offers (R13.2). */
export const SANDBOX_CANDIDATE_COUNT = 12;

/**
 * Deterministic projected firm alignment = mean of the (non-null) piece scores.
 * A swap is just this over the post-swap score list — the client recomputes live
 * with the same math so the board never drifts from the server model.
 */
export function recomputeProjectedAlignment(scores: Array<number | null>): number | null {
  const known = scores.filter((score): score is number => score !== null);
  if (known.length === 0) {
    return null;
  }
  return Math.round(known.reduce((sum, score) => sum + score, 0) / known.length);
}

function bandForSampleSize(sampleSize: number): BoardConfidence {
  if (sampleSize <= 0) return "no_signal";
  if (sampleSize < 3) return "sample_thin";
  if (sampleSize < 6) return "emerging";
  return "grounded";
}

function pieceStrength(score: number | null): string {
  if (score === null) return "Not yet reviewed";
  if (score >= 75) return "Strong firm-reviewed posture";
  if (score >= 60) return "Aligned with firm expectations";
  return "Early firm signal";
}

function pieceGap(score: number | null, divergence: { points: number | null; label: string }): string {
  if (score !== null && score < 60) return "Below the firm's alignment threshold";
  if (divergence.points !== null && Math.abs(divergence.points) >= 15) {
    return `Calibration gap: ${divergence.label}`;
  }
  return "No material gap";
}

/**
 * Assemble the board for one firm. Returns null when the firm has no briefing
 * (e.g. not a firm company) so the caller can 404. Tenancy is the caller's job;
 * every query below is scoped to `firmCompanyId`.
 */
export async function getAlignmentBoardData(firmCompanyId: string): Promise<AlignmentBoardData | null> {
  const briefing = await getAdminCompanyBriefing(firmCompanyId);
  if (!briefing) {
    return null;
  }

  const firmReviewByProductId = new Map<string, number | null>();
  for (const product of briefing.productLayer.products) {
    firmReviewByProductId.set(product.productId, product.canonicalFirmReviewScore);
  }

  // Sandbox candidate pool (R13.2): draw across ALL vendor catalogs, not just the
  // firm's ecosystem vendor, so the rail is deep (~12) and winnable — the firm's
  // own reviewed products still form the stack; everything else is a candidate.
  // Candidate data is aggregate/vendor-side (name-gated for Pro), never another
  // firm's private review, so the broader pool respects tenancy.
  const vendors = await prisma.company.findMany({
    where: { type: "VENDOR" },
    select: { id: true, name: true },
  });
  const catalogs = await Promise.all(
    vendors.map(async (vendor) => ({
      vendorName: vendor.name,
      snapshots: await getVendorProductInsightCatalog(vendor.id),
    }))
  );

  const stack: BoardPiece[] = [];
  const candidatePool: Array<Omit<BoardCandidate, "fitRank">> = [];
  const seen = new Set<string>();
  for (const { vendorName, snapshots } of catalogs) {
    for (const snapshot of snapshots) {
      if (seen.has(snapshot.product.id)) continue;
      seen.add(snapshot.product.id);
      const category = snapshot.product.category ?? snapshot.product.utilityLabels[0] ?? null;
      const firmReview = firmReviewByProductId.get(snapshot.product.id) ?? null;

      if (firmReview !== null) {
        stack.push({
          productId: snapshot.product.id,
          productName: snapshot.product.name,
          vendorName,
          category,
          scoreVsFirm: firmReview,
          confidence: snapshot.confidenceBand,
          topStrength: pieceStrength(firmReview),
          topGap: pieceGap(firmReview, snapshot.divergence),
          priceBand: BOARD_PRICE_BAND,
        });
      } else {
        const projectedScore =
          snapshot.firmReviewed.averageScore ?? snapshot.vendorSelfReported.latestScore ?? null;
        if (projectedScore === null) continue; // unscored products can't be played
        candidatePool.push({
          productId: snapshot.product.id,
          productName: snapshot.product.name,
          vendorName,
          category,
          projectedScore,
          confidence: snapshot.confidenceBand,
          priceBand: BOARD_PRICE_BAND,
        });
      }
    }
  }

  // Rank by projected alignment, best first (R11.4). Take a realistic mix
  // (R13.2): mostly strong winners plus a few weaker options so the pool isn't
  // all-upside. Winners fill most slots; the lowest-projection tail fills the
  // rest. Then re-rank the combined set so Sandbox Fit #1 is the best play.
  const ranked = candidatePool.sort((a, b) => (b.projectedScore ?? 0) - (a.projectedScore ?? 0));
  const realismTail = Math.min(3, Math.max(0, ranked.length - SANDBOX_CANDIDATE_COUNT));
  const winnerCount = SANDBOX_CANDIDATE_COUNT - realismTail;
  const chosenIds = new Set<string>();
  const chosen: Array<Omit<BoardCandidate, "fitRank">> = [];
  for (const candidate of ranked.slice(0, winnerCount)) {
    chosen.push(candidate);
    chosenIds.add(candidate.productId);
  }
  for (const candidate of ranked.slice(-realismTail).reverse()) {
    if (realismTail === 0 || chosenIds.has(candidate.productId)) continue;
    chosen.push(candidate);
    chosenIds.add(candidate.productId);
  }
  const candidates: BoardCandidate[] = chosen
    .sort((a, b) => (b.projectedScore ?? 0) - (a.projectedScore ?? 0))
    .slice(0, SANDBOX_CANDIDATE_COUNT)
    .map((candidate, index) => ({ ...candidate, fitRank: index + 1 }));

  // Firm's 5-module shape for the positioning radar (R12.2), canonical order.
  const heatmapByKey = new Map(
    (briefing.firmLayer?.moduleHeatmap ?? []).map((module) => [module.key, module])
  );
  const moduleShape: BoardModuleAxis[] = FIRM_MODULE_DEFINITIONS.map((definition) => ({
    key: definition.key,
    title: definition.title,
    score: heatmapByKey.get(definition.key)?.canonicalScore ?? null,
  }));

  return {
    firmCompanyId,
    firmName: briefing.company.name,
    currentAlignment: recomputeProjectedAlignment(stack.map((piece) => piece.scoreVsFirm)),
    confidence: bandForSampleSize(briefing.productLayer.reviewedProductCount),
    confidenceLabel: briefing.executiveSummary.confidenceLabel,
    stack,
    candidates,
    moduleShape,
  };
}
