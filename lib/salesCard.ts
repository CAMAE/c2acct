import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import { getVendorProductInsightCatalog } from "@/lib/vendorProductInsightEngine";
import { getVendorScopedFirms } from "@/lib/tenancy";
import prisma from "@/lib/prisma";

/**
 * Vendor Sales Card data layer (Elite Sprint Sprint-3 Block F). The mirror of
 * the Alignment Board: a vendor ranks the firms INSIDE ITS OWN ECOSYSTEM by fit
 * (each firm's current alignment vs this vendor's product strengths), surfacing
 * where the vendor could close the firm's gaps.
 *
 * TENANCY IS THE WHOLE GAME (spec: "read twice"): the candidate firm set comes
 * ONLY from getVendorScopedFirms(vendorCompanyId) — the ecosystem the vendor is
 * already entitled to see. No cross-ecosystem firm data, ever. getVendorSalesCardData
 * never queries a firm outside that set; tests/salescard-leak.test.ts locks it.
 *
 * All numbers are real, from existing engines (getAdminCompanyBriefing for the
 * firm's alignment + module gaps, getVendorProductInsightCatalog for the vendor's
 * product strengths). Confidence bands follow AAE discipline — never fake
 * precision on a thin firm assessment.
 */

export const PAT_SALES_CARD_FLAG_ENV = "PAT_ENABLE_SALES_CARD";

/** Default OFF — ships dark until the flag is set in the runtime env. */
export function isSalesCardEnabled(): boolean {
  return process.env[PAT_SALES_CARD_FLAG_ENV] === "1";
}

export type SalesCardConfidence = "no_signal" | "sample_thin" | "emerging" | "grounded";

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
  confidence: SalesCardConfidence;
  /** The firm's weakest module — "where you close their gap". */
  gapArea: string;
  gapScore: number | null;
  /** The firm's full alignment-module shape (radar + gap table), weakest-first. */
  moduleShape: SalesModuleGap[];
  /** Suggested next actions, ranked (the two widest gaps + a close). */
  nextActions: string[];
};

export type VendorSalesCardData = {
  vendorCompanyId: string;
  vendorName: string;
  /** Mean of the vendor's product scores — the "product strengths" baseline. */
  vendorStrength: number | null;
  /** How many of the vendor's products backed the strength baseline (evidence count). */
  vendorProductCount: number;
  rankedFirms: RankedFirm[];
};

function bandForSampleSize(sampleSize: number): SalesCardConfidence {
  if (sampleSize <= 0) return "no_signal";
  if (sampleSize < 3) return "sample_thin";
  if (sampleSize < 6) return "emerging";
  return "grounded";
}

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
 * Assemble the sales card for one vendor. Tenancy: the firm set is
 * getVendorScopedFirms(vendorCompanyId) and nothing else. Returns null when the
 * vendor has no ecosystem / no briefing (caller 404s).
 */
export async function getVendorSalesCardData(vendorCompanyId: string): Promise<VendorSalesCardData | null> {
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
  const vendorProductScores = catalog
    .map((snapshot) => snapshot.firmReviewed.averageScore ?? snapshot.vendorSelfReported.latestScore)
    .filter((score): score is number => score !== null);
  const vendorStrength = mean(vendorProductScores);

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
    });
  }

  return {
    vendorCompanyId,
    vendorName: vendorCompany.name,
    vendorStrength,
    vendorProductCount: vendorProductScores.length,
    rankedFirms: rankFirmsByFit(firms),
  };
}
