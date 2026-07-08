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
  /** One suggested next action (Bullet Theory: one claim, one evidence, one action). */
  nextAction: string;
};

export type VendorSalesCardData = {
  vendorCompanyId: string;
  vendorName: string;
  /** Mean of the vendor's product scores — the "product strengths" baseline. */
  vendorStrength: number | null;
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
  const vendorStrength = mean(
    catalog.map((snapshot) => snapshot.firmReviewed.averageScore ?? snapshot.vendorSelfReported.latestScore)
  );

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

    // Weakest scored module = the gap the vendor can pitch closing.
    const scoredModules = briefing.firmLayer.moduleHeatmap.filter(
      (module) => module.canonicalScore !== null
    );
    const weakest = scoredModules.reduce<(typeof scoredModules)[number] | null>((lowest, module) => {
      if (!lowest) return module;
      return (module.canonicalScore ?? 0) < (lowest.canonicalScore ?? 0) ? module : lowest;
    }, null);
    const gapArea = weakest?.title ?? "Assessment in progress";
    const gapScore = weakest?.canonicalScore ?? null;

    const nextAction =
      gapScore !== null
        ? `Weakest area is ${gapArea} at ${gapScore}% — a completed assessment sharpens this card.`
        : "Assessment is still in progress — a completed assessment sharpens this card.";

    firms.push({
      firmCompanyId,
      firmName: briefing.company.name,
      alignmentDelta,
      firmAlignment,
      confidence: bandForSampleSize(briefing.firmLayer.completedModuleCount),
      gapArea,
      gapScore,
      nextAction,
    });
  }

  return {
    vendorCompanyId,
    vendorName: vendorCompany.name,
    vendorStrength,
    rankedFirms: rankFirmsByFit(firms),
  };
}
