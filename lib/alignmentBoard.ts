import prisma from "@/lib/prisma";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import {
  getFirmProductFitDimensionsByProduct,
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";
import {
  PRODUCT_FIT_DIMENSIONS,
  type ProductFitDimensionScore,
} from "@/lib/productFitDimensions";
import { poolForViewerBoundary, resolveCompanyBoundary } from "@/lib/dataBoundary";
import { confidenceBandForSampleSize } from "@/lib/confidenceBands";

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
  /** This firm's per-dimension review shape (P0 radar). Real answers, per axis. */
  dimensionScores: ProductFitDimensionScore[];
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
  /**
   * Rank within its OWN pool. For firm-reviewed candidates this is the Sandbox
   * Fit (1 = best projected alignment). For vendor-reported candidates it is a
   * display index only — they are never ranked against firm-reviewed candidates
   * (ranking floor: a vendor-reported candidate can never outrank a firm-reviewed
   * one, because the two live in separate lists).
   */
  fitRank: number;
  /**
   * Evidence grade of the projected score (P2-pre policy). firm_reviewed = the
   * projection is backed by cross-firm firm reviews; vendor_reported = the
   * product has NO firm reviews and the projection is vendor self-report only
   * (rendered in the separate "Not yet firm-reviewed" section, never as a ranked
   * fit). Kept in sync with `evidenceBasis` below.
   */
  grade: "firm_reviewed" | "vendor_reported";
  /**
   * Projected per-dimension shape: cross-firm firm-review evidence where it
   * exists, otherwise vendor self-report. `evidenceBasis` says which. Axes with
   * no signal come back score:null and are held (not fabricated) on the radar.
   */
  dimensionScores: ProductFitDimensionScore[];
  evidenceBasis: "firm_reviewed" | "vendor_reported" | "none";
};

/** One radar axis (product-fit dimension key + title), canonical order. */
export type BoardDimensionAxis = {
  key: string;
  title: string;
};

export type AlignmentBoardData = {
  firmCompanyId: string;
  firmName: string;
  /** The firm's current alignment score used as the board baseline (mean of stack scores). */
  currentAlignment: number | null;
  confidence: BoardConfidence;
  confidenceLabel: string;
  stack: BoardPiece[];
  /** Total reviewed products (the board shows at most SANDBOX_STACK_LIMIT). */
  totalStackCount: number;
  /** Ranked rail (P2-pre): FIRM-REVIEWED candidates only, best projected fit first. */
  candidates: BoardCandidate[];
  /**
   * Separate "Not yet firm-reviewed" section (P2-pre): candidates whose projection
   * is vendor self-report only. Swappable and visually distinct, wider confidence
   * bands, and floored below every ranked (firm-reviewed) candidate — they need
   * firm reviews to enter the ranked fits.
   */
  unreviewedCandidates: BoardCandidate[];
  /**
   * Radar axes (P0): the five PRODUCT-FIT dimensions, not the firm's assessment
   * modules. The current-shape polygon is the mean of the stack pieces'
   * `dimensionScores`; the client recomputes the projected polygon per axis on
   * each swap. See docs/elite-sprint/ROADMAP-PRODUCT-SECTION-TO-FIRM-MODULE-MAPPING.md.
   */
  dimensionAxes: BoardDimensionAxis[];
};

/** How many ranked Secret candidates the sandbox rail offers (R13.2). */
export const SANDBOX_CANDIDATE_COUNT = 12;

/** Board stack is capped so it reads like a real tech stack, not a wall (R3.2). */
export const SANDBOX_STACK_LIMIT = 8;

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

// CLASS 3: bands come from the ONE shared definition (lib/confidenceBands.ts).
const bandForSampleSize = confidenceBandForSampleSize;

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

/** All axes present but empty — used when a product carries no dimension signal. */
function emptyDimensionScores(): ProductFitDimensionScore[] {
  return PRODUCT_FIT_DIMENSIONS.map((dimension) => ({
    key: dimension.key,
    title: dimension.title,
    score: null,
    sampleSize: 0,
  }));
}

function dimensionsHaveSignal(dimensions: ProductFitDimensionScore[]): boolean {
  return dimensions.some((dimension) => dimension.score !== null);
}

/**
 * A candidate's projected per-dimension shape: prefer cross-firm firm-review
 * evidence; fall back to the vendor's self-report; else no signal. Mirrors the
 * scalar projectedScore fallback (firm average ?? vendor self-report).
 */
function pickCandidateDimensions(snapshot: VendorProductInsightSnapshot): {
  dimensionScores: ProductFitDimensionScore[];
  evidenceBasis: BoardCandidate["evidenceBasis"];
} {
  if (dimensionsHaveSignal(snapshot.firmReviewed.dimensionEvidence)) {
    return { dimensionScores: snapshot.firmReviewed.dimensionEvidence, evidenceBasis: "firm_reviewed" };
  }
  if (dimensionsHaveSignal(snapshot.vendorSelfReported.dimensionEvidence)) {
    return { dimensionScores: snapshot.vendorSelfReported.dimensionEvidence, evidenceBasis: "vendor_reported" };
  }
  return { dimensionScores: emptyDimensionScores(), evidenceBasis: "none" };
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

  // Sandbox candidate pool (R13.2): draw across vendor catalogs, not just the
  // firm's ecosystem vendor, so the rail is deep (~12) and winnable — the firm's
  // own reviewed products still form the stack; everything else is a candidate.
  // Candidate data is aggregate/vendor-side (name-gated for Pro), never another
  // firm's private review, so the broader pool respects tenancy.
  // Data-integrity wall (CLASS 1): scope vendors to the viewing firm's boundary
  // pool — a real firm's board never draws demo vendor products.
  const boundaryPool = poolForViewerBoundary(await resolveCompanyBoundary(firmCompanyId));
  const vendors = await prisma.company.findMany({
    where: { type: "VENDOR", dataBoundary: { in: boundaryPool } },
    select: { id: true, name: true },
  });
  const catalogs = await Promise.all(
    vendors.map(async (vendor) => ({
      vendorName: vendor.name,
      snapshots: await getVendorProductInsightCatalog(vendor.id),
    }))
  );

  const stack: BoardPiece[] = [];
  const stackUtilityKeys = new Map<string, string[]>();
  const candidatePool: Array<Omit<BoardCandidate, "fitRank">> = [];
  const seen = new Set<string>();
  for (const { vendorName, snapshots } of catalogs) {
    for (const snapshot of snapshots) {
      if (seen.has(snapshot.product.id)) continue;
      seen.add(snapshot.product.id);
      const category = snapshot.product.category ?? snapshot.product.utilityLabels[0] ?? null;
      const firmReview = firmReviewByProductId.get(snapshot.product.id) ?? null;

      if (firmReview !== null) {
        stackUtilityKeys.set(snapshot.product.id, snapshot.product.utilityKeys);
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
          dimensionScores: emptyDimensionScores(), // filled from this-firm review below
        });
      } else {
        // Evidence-lineage policy (P2-pre): firm-review is PRIMARY. A candidate
        // is firm_reviewed only when cross-firm firm reviews exist; otherwise its
        // projection is vendor self-report only (vendor_reported) and it is
        // floored into the separate "Not yet firm-reviewed" section.
        const grade: BoardCandidate["grade"] =
          snapshot.firmReviewed.averageScore !== null ? "firm_reviewed" : "vendor_reported";
        const projectedScore =
          snapshot.firmReviewed.averageScore ?? snapshot.vendorSelfReported.latestScore ?? null;
        if (projectedScore === null) continue; // unscored products can't be played
        const { dimensionScores, evidenceBasis } = pickCandidateDimensions(snapshot);
        candidatePool.push({
          productId: snapshot.product.id,
          productName: snapshot.product.name,
          vendorName,
          category,
          projectedScore,
          confidence: snapshot.confidenceBand,
          priceBand: BOARD_PRICE_BAND,
          grade,
          dimensionScores,
          evidenceBasis,
        });
      }
    }
  }

  // Split by evidence grade (P2-pre). The RANKED rail is firm-reviewed only;
  // vendor-reported candidates are floored into their own section and can never
  // outrank a firm-reviewed candidate (they live in separate lists).
  const firmReviewedPool = candidatePool.filter((candidate) => candidate.grade === "firm_reviewed");
  const vendorReportedPool = candidatePool.filter((candidate) => candidate.grade === "vendor_reported");

  // Ranked firm-reviewed rail (R11.4 + R13.2): best projected fit first, with a
  // realistic mix — winners fill most slots, the lowest-projection tail fills the
  // rest — then re-ranked so Sandbox Fit #1 is the best play.
  const ranked = firmReviewedPool.sort((a, b) => (b.projectedScore ?? 0) - (a.projectedScore ?? 0));
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

  // "Not yet firm-reviewed" section: vendor-reported candidates, sorted by their
  // (self-reported) projection, capped, given a display index only. Never mixed
  // into the ranked rail above.
  const unreviewedCandidates: BoardCandidate[] = vendorReportedPool
    .sort((a, b) => (b.projectedScore ?? 0) - (a.projectedScore ?? 0))
    .slice(0, SANDBOX_CANDIDATE_COUNT)
    .map((candidate, index) => ({ ...candidate, fitRank: index + 1 }));

  // Cap the board stack (R3.2): show the firm's strongest 6-8 pieces so it reads
  // like a real tech stack; the baseline + swap math run over the shown set.
  const totalStackCount = stack.length;
  const boardStack = [...stack]
    .sort((a, b) => (b.scoreVsFirm ?? 0) - (a.scoreVsFirm ?? 0))
    .slice(0, SANDBOX_STACK_LIMIT);

  // P0 radar: fill each board piece's per-dimension shape from THIS firm's own
  // product-review answers (not the cross-firm snapshot). The current radar
  // polygon is the mean of these; the projected polygon recomputes per axis on
  // swap. Only fetched for the shown stack.
  const firmDimensionsByProduct = await getFirmProductFitDimensionsByProduct(
    firmCompanyId,
    boardStack.map((piece) => ({
      id: piece.productId,
      utilityKeys: stackUtilityKeys.get(piece.productId) ?? [],
    }))
  );
  for (const piece of boardStack) {
    const dimensions = firmDimensionsByProduct.get(piece.productId);
    if (dimensions) {
      piece.dimensionScores = dimensions;
    }
  }

  return {
    firmCompanyId,
    firmName: briefing.company.name,
    currentAlignment: recomputeProjectedAlignment(boardStack.map((piece) => piece.scoreVsFirm)),
    confidence: bandForSampleSize(briefing.productLayer.reviewedProductCount),
    confidenceLabel: briefing.executiveSummary.confidenceLabel,
    stack: boardStack,
    totalStackCount,
    candidates,
    unreviewedCandidates,
    dimensionAxes: PRODUCT_FIT_DIMENSIONS.map((dimension) => ({
      key: dimension.key,
      title: dimension.title,
    })),
  };
}
