import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import type { BriefingProductSummary, BriefingRiskOpportunity } from "@/lib/adminBriefingEngine";
import { getVendorProductInsightCatalog } from "@/lib/vendorProductInsightEngine";
import { getVendorScopedFirms } from "@/lib/tenancy";
import { confidenceBandForSampleSize } from "@/lib/confidenceBands";
import { getFirmEvidenceFreshness } from "@/lib/eliteInsightsV2";
import type { FreshnessReading } from "@/lib/freshness";
import {
  selectQuestions,
  bandForFirmScore,
  magnitudeForDelta,
  type QuestionScopeCell,
} from "@/lib/perFirmQuestionLibrary";
import { sweepVendorSurfaceCopy } from "@/lib/customerLexicon";
import prisma from "@/lib/prisma";

/**
 * BattleCard v2 anatomy (Block 17 Track B, Day-23 §D23-P0 "Per-Firm Strengths/
 * Cautions"). Four grounded, bullet-capped, honest-empty blocks that render ONLY
 * in the Elite expansion layer (the collapsed card face stays a one-line summary).
 * No fabrication: every bullet traces to a real firm review, a real calibration
 * gap (N>=2 sample floor), or a real briefing risk. NOTE: the discovery-question
 * strings come from the shared consultant question engine and are rephrased for a
 * vendor customer surface in B2 (lexicon sweep).
 */
export type BattleCardAnatomy = {
  /** "Why this vendor fits this firm" — high-band firm reviews. Cap 3. */
  whyItFits: string[];
  /** "Where it struggles for this firm" — low-band + calibration gaps + stale. Cap 3. */
  riskFlags: string[];
  /** "Questions to ask in evaluation" — the shared question engine. Cap 4. */
  discoveryQuestions: string[];
  /** "Quick disqualifiers" — briefing risks + large vendor-higher gaps. Cap 2. */
  objectionPrep: string[];
};

/** Firm reviews below this sample floor are never asserted as evidence (N>=2). */
const ANATOMY_MIN_REVIEW_N = 2;

function anatomyCapabilityArea(product: BriefingProductSummary): string {
  return product.taxonomyTitles?.[0] ?? product.utilityLabels?.[0] ?? "this capability";
}

export function buildBattleCardAnatomy(input: {
  products: BriefingProductSummary[];
  risks: BriefingRiskOpportunity[];
  freshness: FreshnessReading | null;
  vendorName: string;
  firmName: string;
}): BattleCardAnatomy {
  const { products, risks, freshness, vendorName, firmName } = input;

  // Only firm-reviewed products above the sample floor are grounded evidence.
  const reviewed = products.filter(
    (p) => p.firmReviewCount >= ANATOMY_MIN_REVIEW_N && p.canonicalFirmReviewScore !== null
  );

  // delta = vendor self-report − firm review (positive = vendor claims higher).
  const cells: QuestionScopeCell[] = reviewed.map((p) => ({
    productId: p.productId,
    productName: p.productName,
    capabilityArea: anatomyCapabilityArea(p),
    firmScore: p.canonicalFirmReviewScore as number,
    vendorScore: p.vendorSelfReportedScore,
    delta:
      p.vendorSelfReportedScore !== null && p.canonicalFirmReviewScore !== null
        ? p.vendorSelfReportedScore - p.canonicalFirmReviewScore
        : null,
  }));

  // 1. Why it fits — high-band firm reviews, strongest first.
  const whyItFits = reviewed
    .filter((p) => bandForFirmScore(p.canonicalFirmReviewScore as number) === "high")
    .sort((a, b) => (b.canonicalFirmReviewScore ?? 0) - (a.canonicalFirmReviewScore ?? 0))
    .slice(0, 3)
    .map(
      (p) =>
        `${p.productName}: firms rate it ${Math.round(p.canonicalFirmReviewScore as number)} — a proven strength to lead with.`
    );

  // 2. Risk flags — low-band reviews, then calibration gaps, then stale evidence.
  const riskFlags: string[] = [];
  for (const p of reviewed) {
    if (riskFlags.length >= 3) break;
    if (bandForFirmScore(p.canonicalFirmReviewScore as number) === "low") {
      riskFlags.push(
        `${p.productName}: firms rate it ${Math.round(p.canonicalFirmReviewScore as number)}, below the mid-band — expect scrutiny here.`
      );
    }
  }
  for (const c of cells) {
    if (riskFlags.length >= 3) break;
    if (magnitudeForDelta(c.delta) !== "small" && c.vendorScore !== null && c.delta !== null) {
      const dir = c.delta > 0 ? "above" : "below";
      riskFlags.push(
        `${c.productName}: your self-report (${Math.round(c.vendorScore)}) sits ${Math.abs(Math.round(c.delta))} pts ${dir} the firm review (${Math.round(c.firmScore)}) — a calibration gap to close.`
      );
    }
  }
  if (riskFlags.length < 3 && freshness && freshness.state !== "fresh") {
    riskFlags.push(
      `This firm's alignment evidence is ${freshness.state} (${freshness.ageLabel}) — refresh it before leaning on this card.`
    );
  }

  // 3. Discovery questions — the shared engine over the graded cells.
  const discoveryQuestions = selectQuestions(cells, { vendorName, firmName }, 4).map((q) => q.rendered);

  // 4. Objection prep — real briefing risks, then large vendor-higher gaps (per ruling).
  const objectionPrep: string[] = [];
  for (const r of risks) {
    if (objectionPrep.length >= 2) break;
    if (r.layer === "product" || r.layer === "firm") objectionPrep.push(r.title);
  }
  for (const c of cells) {
    if (objectionPrep.length >= 2) break;
    if (
      bandForFirmScore(c.firmScore) === "low" &&
      magnitudeForDelta(c.delta) === "large" &&
      (c.delta ?? 0) > 0 &&
      c.vendorScore !== null
    ) {
      objectionPrep.push(
        `Firms score ${c.productName} at ${Math.round(c.firmScore)} against your ${Math.round(c.vendorScore)} self-report — pre-empt this gap before it becomes their objection.`
      );
    }
  }

  // Every string that renders on the vendor customer surface passes the lexicon
  // sweep — the discovery questions + briefing risk titles are ported from the
  // internal consultant engine and must not carry analyst shorthand.
  const clean = (arr: string[]) => arr.map(sweepVendorSurfaceCopy);

  return {
    whyItFits: clean(whyItFits.length ? whyItFits : ["No high-band products yet — fit is emerging at the mid-band."]),
    riskFlags: clean(
      riskFlags.length ? riskFlags : ["No low-band products or calibration gaps on file for this firm yet."]
    ),
    discoveryQuestions: clean(
      discoveryQuestions.length
        ? discoveryQuestions
        : ["Complete a product review with this firm to unlock tailored discovery questions."]
    ),
    objectionPrep: clean(
      objectionPrep.length ? objectionPrep : ["No category-level disqualifiers surface for this firm."]
    ),
  };
}

/**
 * Vendor BattleCard data layer (Elite Sprint Sprint-3 Block F). The mirror of
 * the Alignment Board: a vendor ranks the firms INSIDE ITS OWN ECOSYSTEM by fit
 * (each firm's current alignment vs this vendor's product strengths), surfacing
 * where the vendor could close the firm's gaps.
 *
 * TENANCY IS THE WHOLE GAME (spec: "read twice"): the candidate firm set comes
 * ONLY from getVendorScopedFirms(vendorCompanyId) — the ecosystem the vendor is
 * already entitled to see. No cross-ecosystem firm data, ever. getVendorBattleCardData
 * never queries a firm outside that set; tests/salescard-leak.test.ts locks it.
 *
 * All numbers are real, from existing engines (getAdminCompanyBriefing for the
 * firm's alignment + module gaps, getVendorProductInsightCatalog for the vendor's
 * product strengths). Confidence bands follow AAE discipline — never fake
 * precision on a thin firm assessment.
 */

export const PAT_BATTLECARD_FLAG_ENV = "PAT_ENABLE_BATTLECARD";
/**
 * Migration fallback for the Sales Card → BattleCard rename: any env source not
 * yet updated (a launchd plist, a prod .env) can still enable the surface with
 * the OLD flag name. Remove once every environment sets PAT_ENABLE_BATTLECARD.
 */
const PAT_BATTLECARD_FLAG_ENV_LEGACY = "PAT_ENABLE_SALES_CARD";

/** Default OFF — ships dark until the flag is set in the runtime env. */
export function isBattleCardEnabled(): boolean {
  return (
    process.env[PAT_BATTLECARD_FLAG_ENV] === "1" ||
    process.env[PAT_BATTLECARD_FLAG_ENV_LEGACY] === "1"
  );
}

export type BattleCardConfidence = "no_signal" | "sample_thin" | "emerging" | "grounded";

/**
 * One firm alignment-module row for the consultant-brief detail card: the firm's
 * own module score (real, from its assessment), the evidence behind it, and the
 * headroom the vendor's overall product strength sits above it. `headroom` is a
 * comparison against the vendor's OVERALL strength — an honest reference, not a
 * fabricated per-module vendor strength (that awaits the product-section →
 * firm-module mapping; see the roadmap ticket).
 */
export type SalesModuleGap = {
  key: string;
  title: string;
  /** Firm's canonical module score (0–100), or null when unassessed. */
  score: number | null;
  /** Answered vs total questions behind this module — the evidence count. */
  answeredCount: number;
  questionCount: number;
  /** vendorStrength − score: positive = headroom the vendor could lift. */
  headroom: number | null;
};

export type RankedFirm = {
  firmCompanyId: string;
  /** Real firm name — the CLIENT anonymizes to "Secret Firm N" for a Pro vendor. */
  firmName: string;
  fitRank: number;
  /** vendorStrength − firmAlignment: how much headroom the vendor could lift (null = thin). */
  alignmentDelta: number | null;
  firmAlignment: number | null;
  confidence: BattleCardConfidence;
  /** The firm's weakest module — "where you close their gap". */
  gapArea: string;
  gapScore: number | null;
  /** The firm's full alignment-module shape (radar + gap table), weakest-first. */
  moduleShape: SalesModuleGap[];
  /** Suggested next actions, ranked (the two widest gaps + a close). */
  nextActions: string[];
  /** 16a — evidence age behind this firm's alignment score (Fresh/Aging/Stale). */
  alignmentFreshness: FreshnessReading | null;
  /** Block 17 v2 — the four-block per-firm sales anatomy (Elite expansion only). */
  anatomy: BattleCardAnatomy;
};

/**
 * Evidence grade for a displayed strength/fit number (P2-pre lineage policy):
 *  - firm_reviewed  → every contributing product carries firm-review evidence
 *  - vendor_reported → NO firm reviews exist; the number is vendor self-report only
 *  - blended        → a mix (some products firm-reviewed, some self-report-only)
 * firm_reviewed is primary whenever it exists; blended/vendor_reported MUST carry
 * a visible provenance label in the UI (nothing renders self-report as verified).
 */
export type EvidenceGrade = "firm_reviewed" | "vendor_reported" | "blended";

export type VendorBattleCardData = {
  vendorCompanyId: string;
  vendorName: string;
  /**
   * The "product strengths" baseline. FIRM-REVIEWED PRIMARY: this is the mean of
   * the vendor's FIRM-REVIEWED product scores whenever any exist; it falls back
   * to vendor self-report ONLY when no product has a firm review. The fit/headroom
   * calc derives from this, so it inherits the same grade.
   */
  vendorStrength: number | null;
  /** Evidence grade of vendorStrength (drives the UI provenance label). */
  vendorStrengthGrade: EvidenceGrade;
  /** Products with firm-review evidence (backed the firm-reviewed strength). */
  firmReviewedProductCount: number;
  /** Products with ONLY vendor self-report — excluded from a firm-reviewed strength. */
  selfReportedOnlyProductCount: number;
  rankedFirms: RankedFirm[];
};

// CLASS 3: bands come from the ONE shared definition (lib/confidenceBands.ts).
const bandForSampleSize = confidenceBandForSampleSize;

function mean(scores: Array<number | null>): number | null {
  const known = scores.filter((score): score is number => score !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((sum, score) => sum + score, 0) / known.length);
}

/**
 * Rank firms by fit. Higher alignmentDelta (vendor stronger than the firm's
 * current alignment) = more room to close a gap = better fit. Firms with no
 * delta (thin signal) sort last. Deterministic, pure — the leak test and the
 * ranking test both drive this without a DB.
 */
export function rankFirmsByFit(
  firms: Array<Omit<RankedFirm, "fitRank">>
): RankedFirm[] {
  const sorted = [...firms].sort((a, b) => {
    if (a.alignmentDelta === null && b.alignmentDelta === null) {
      return a.firmName.localeCompare(b.firmName);
    }
    if (a.alignmentDelta === null) return 1;
    if (b.alignmentDelta === null) return -1;
    return b.alignmentDelta - a.alignmentDelta;
  });
  return sorted.map((firm, index) => ({ ...firm, fitRank: index + 1 }));
}

/**
 * Assemble the BattleCard for one vendor. Tenancy: the firm set is
 * getVendorScopedFirms(vendorCompanyId) and nothing else. Returns null when the
 * vendor has no ecosystem / no briefing (caller 404s).
 */
export async function getVendorBattleCardData(vendorCompanyId: string): Promise<VendorBattleCardData | null> {
  // TENANCY FIRST — the only firm ids this function will ever touch.
  const firmIds = await getVendorScopedFirms(vendorCompanyId);

  const vendorCompany = await prisma.company.findUnique({
    where: { id: vendorCompanyId },
    select: { name: true },
  });
  if (!vendorCompany) {
    return null;
  }

  const catalog = await getVendorProductInsightCatalog(vendorCompanyId);
  // Evidence-lineage policy (P2-pre): firm-reviewed is PRIMARY. The product
  // strength is the mean of firm-reviewed product scores whenever any exist;
  // self-report-only products are excluded from that headline (counted, not
  // blended in silently). Only when NO product has a firm review do we fall back
  // to a vendor-self-reported strength — and grade it so the UI labels it.
  const firmReviewedScores = catalog
    .map((snapshot) => snapshot.firmReviewed.averageScore)
    .filter((score): score is number => score !== null);
  const selfReportedOnlyScores = catalog
    .filter((snapshot) => snapshot.firmReviewed.averageScore === null)
    .map((snapshot) => snapshot.vendorSelfReported.latestScore)
    .filter((score): score is number => score !== null);

  let vendorStrength: number | null;
  let vendorStrengthGrade: EvidenceGrade;
  if (firmReviewedScores.length > 0) {
    // Pure firm-reviewed number (self-report-only products excluded, disclosed
    // via selfReportedOnlyProductCount) → grade firm_reviewed.
    vendorStrength = mean(firmReviewedScores);
    vendorStrengthGrade = "firm_reviewed";
  } else {
    // No firm reviews anywhere → the only signal is vendor self-report.
    vendorStrength = mean(selfReportedOnlyScores);
    vendorStrengthGrade = "vendor_reported";
  }
  const firmReviewedProductCount = firmReviewedScores.length;
  const selfReportedOnlyProductCount = selfReportedOnlyScores.length;

  const firms: Array<Omit<RankedFirm, "fitRank">> = [];
  for (const firmCompanyId of firmIds) {
    const briefing = await getAdminCompanyBriefing(firmCompanyId);
    if (!briefing) {
      continue;
    }

    const firmAlignment =
      briefing.executiveSummary.canonicalFirmScore ?? briefing.firmLayer.averageScore;
    const alignmentDelta =
      vendorStrength !== null && firmAlignment !== null ? vendorStrength - firmAlignment : null;

    // The firm's full alignment-module shape (radar + gap table). Evidence count
    // per module = answered questions across its sections. headroom compares the
    // firm's module score to the vendor's OVERALL product strength (honest
    // reference — no fabricated per-module vendor strength). Weakest-first.
    const moduleShape: SalesModuleGap[] = briefing.firmLayer.moduleHeatmap
      .map((mod) => {
        const answeredCount = mod.sectionScores.reduce((sum, section) => sum + section.answeredCount, 0);
        const questionCount = mod.sectionScores.reduce((sum, section) => sum + section.questionCount, 0);
        const score = mod.canonicalScore;
        return {
          key: mod.key,
          title: mod.title,
          score,
          answeredCount,
          questionCount,
          headroom: vendorStrength !== null && score !== null ? vendorStrength - score : null,
        };
      })
      .sort((a, b) => (a.score ?? 999) - (b.score ?? 999));

    const weakest = moduleShape.find((mod) => mod.score !== null) ?? null;
    const gapArea = weakest?.title ?? "Assessment in progress";
    const gapScore = weakest?.score ?? null;

    // Ranked next actions: the two widest positive-headroom gaps, then a close.
    const nextActions: string[] = [];
    for (const mod of moduleShape) {
      if (nextActions.length >= 2) break;
      if (mod.score !== null && (mod.headroom ?? 0) > 0) {
        nextActions.push(
          `Lead with ${mod.title}: firm sits at ${mod.score}%, ~${Math.round(mod.headroom ?? 0)} pts of headroom for your product strength.`
        );
      }
    }
    if (nextActions.length === 0) {
      nextActions.push(
        gapScore !== null
          ? `Weakest area is ${gapArea} at ${gapScore}% — a completed assessment sharpens this card.`
          : "Assessment is still in progress — a completed assessment sharpens this card."
      );
    } else {
      nextActions.push("Attach product evidence to these modules before the outreach so the pitch is grounded, not generic.");
    }

    const alignmentFreshness = await getFirmEvidenceFreshness(prisma, firmCompanyId);

    firms.push({
      firmCompanyId,
      firmName: briefing.company.name,
      alignmentDelta,
      firmAlignment,
      confidence: bandForSampleSize(briefing.firmLayer.completedModuleCount),
      gapArea,
      gapScore,
      moduleShape,
      nextActions,
      // 16a — the firm's alignment evidence age, from the canonical reader.
      alignmentFreshness,
      // Block 17 v2 — four-block per-firm sales anatomy, grounded in the briefing.
      anatomy: buildBattleCardAnatomy({
        products: briefing.productLayer?.products ?? [],
        risks: briefing.risks ?? [],
        freshness: alignmentFreshness,
        vendorName: vendorCompany.name,
        firmName: briefing.company.name,
      }),
    });
  }

  return {
    vendorCompanyId,
    vendorName: vendorCompany.name,
    vendorStrength,
    vendorStrengthGrade,
    firmReviewedProductCount,
    selfReportedOnlyProductCount,
    rankedFirms: rankFirmsByFit(firms),
  };
}
