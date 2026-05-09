import {
  getAdminBriefingCatalog,
  getAdminCompanyBriefing,
  type AdminCompanyBriefing,
  type BriefingCatalogItem,
} from "@/lib/adminBriefingEngine";
import {
  getFirmAssessmentProgress,
  summarizeFirmAlignmentProgress,
  type FirmAlignmentProgressSummary,
} from "@/lib/firmPat";
import prisma from "@/lib/prisma";
import { assertEcosystemPair, getVendorScopedFirms } from "@/lib/tenancy";
import {
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

/**
 * Phase-3 Day-12 ecosystem aggregation layer.
 *
 * Wraps existing per-firm / per-vendor / per-product engines into ecosystem-level
 * card data for the Mock C list view at /consultants. Helpers are pure and
 * exported so the JSX never re-implements arithmetic.
 *
 * Source: PAT-5.7-Phase-2.5-Consultant-UX-Brief.md §3.4 (signal-to-source map)
 *         + locked §6 decisions: 10-pt hot divergence (decision 7),
 *         confidence as distribution (decision 8), no time-series (decision 3).
 */

/** §6 decision 7. Used by countHotDivergences. */
export const HOT_DIVERGENCE_THRESHOLD = 10;

/**
 * Maps a BriefingCatalogItem.confidenceLabel string into one of five canonical
 * buckets. Source labels are produced by getConfidenceFromCoverage() in
 * lib/adminBriefingEngine.ts.
 */
const CONFIDENCE_LABEL_BUCKETS: Record<string, keyof FirmConfidenceCounts> = {
  "Grounded current-state signal": "grounded",
  "Emerging signal": "emerging",
  "Sample-thin current-state signal": "sampleThin",
  "Early current-state signal": "earlySignal",
  "No current-state signal": "noSignal",
};

export type FirmConfidenceCounts = {
  grounded: number;
  emerging: number;
  sampleThin: number;
  earlySignal: number;
  noSignal: number;
};

export type EcosystemListCardData = {
  ecosystemId: string;
  ecosystemName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
  firmCount: number;

  /** Avg of canonicalFirmScore across firms; null when no firm has a score. */
  avgFirmAlignmentScore: number | null;
  /** "5 products / 32 firm reviews" — count + ratio. */
  vendorProductCoverage: {
    productCount: number;
    firmReviewCount: number;
  };
  /** 0–100 avg of summarizeFirmAlignmentProgress().completionPercent; null if no firms. */
  moduleCompletionRate: number | null;
  /** Count of (firm × product) pairs where |firm − vendor| ≥ HOT_DIVERGENCE_THRESHOLD. */
  activeDivergenceCount: number;
  /** Sum of BriefingActionItem rows where window === "30 days" across firms. */
  thirtyDayActionCount: number;

  /** §6 decision 8: distribution of confidence labels across the firms in scope. */
  firmConfidenceCounts: FirmConfidenceCounts;

  /** ISO timestamp of the most recent firm update across the ecosystem. */
  latestActivityAt: string | null;
};

// ---------- Day-12 helpers (pure; exported for unit tests) ----------

export function avgFirmAlignmentScore(catalog: BriefingCatalogItem[]): number | null {
  const scores = catalog
    .map((entry) => entry.canonicalFirmScore)
    .filter((value): value is number => value !== null);
  if (scores.length === 0) {
    return null;
  }
  const sum = scores.reduce((acc, value) => acc + value, 0);
  return Math.round(sum / scores.length);
}

export function aggregateFirmConfidence(catalog: BriefingCatalogItem[]): FirmConfidenceCounts {
  const counts: FirmConfidenceCounts = {
    grounded: 0,
    emerging: 0,
    sampleThin: 0,
    earlySignal: 0,
    noSignal: 0,
  };
  for (const entry of catalog) {
    const bucket = CONFIDENCE_LABEL_BUCKETS[entry.confidenceLabel];
    if (bucket) {
      counts[bucket] += 1;
    }
  }
  return counts;
}

export function countHotDivergences(briefings: AdminCompanyBriefing[]): number {
  let count = 0;
  for (const briefing of briefings) {
    for (const product of briefing.productLayer.products) {
      const firmScore = product.canonicalFirmReviewScore;
      const vendorScore = product.vendorSelfReportedScore;
      if (firmScore === null || vendorScore === null) {
        continue;
      }
      if (Math.abs(firmScore - vendorScore) >= HOT_DIVERGENCE_THRESHOLD) {
        count += 1;
      }
    }
  }
  return count;
}

export function countThirtyDayActions(briefings: AdminCompanyBriefing[]): number {
  let count = 0;
  for (const briefing of briefings) {
    for (const action of briefing.nextActions) {
      if (action.window === "30 days") {
        count += 1;
      }
    }
  }
  return count;
}

export function avgModuleCompletion(progressList: FirmAlignmentProgressSummary[]): number | null {
  if (progressList.length === 0) {
    return null;
  }
  const sum = progressList.reduce((acc, summary) => acc + summary.completionPercent, 0);
  return Math.round(sum / progressList.length);
}

// ---------- Day-12 main aggregation ----------

export async function getEcosystemListForConsultant(
  consultantProfileId: string
): Promise<EcosystemListCardData[]> {
  const assignments = await prisma.consultantAssignment.findMany({
    where: { consultantProfileId, active: true },
    select: {
      id: true,
      ecosystemId: true,
      Ecosystem: {
        select: {
          id: true,
          name: true,
          vendorCompanyId: true,
          VendorCompany: { select: { id: true, name: true } },
        },
      },
    },
  });

  const cards = await Promise.all(
    assignments.map(async (assignment) => {
      const ecosystem = assignment.Ecosystem;
      if (!ecosystem || !ecosystem.vendorCompanyId || !ecosystem.VendorCompany) {
        return null;
      }
      return buildEcosystemCard({
        ecosystemId: ecosystem.id,
        ecosystemName: ecosystem.name,
        vendorCompanyId: ecosystem.vendorCompanyId,
        vendorCompanyName: ecosystem.VendorCompany.name,
      });
    })
  );

  return cards.filter((card): card is EcosystemListCardData => card !== null);
}

async function buildEcosystemCard(input: {
  ecosystemId: string;
  ecosystemName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
}): Promise<EcosystemListCardData> {
  const firmIds = await getVendorScopedFirms(input.vendorCompanyId);

  // Defense-in-depth: fail-closed if any firm doesn't resolve to this vendor's
  // ecosystem. Better to render an error than to leak a non-ecosystem firm.
  await Promise.all(
    firmIds.map(async (firmId) => {
      const ok = await assertEcosystemPair(input.vendorCompanyId, firmId);
      if (!ok) {
        throw new Error(
          `Tenancy violation in getEcosystemListForConsultant: firm ${firmId} is not in ecosystem of vendor ${input.vendorCompanyId}`
        );
      }
    })
  );

  const [catalog, briefings, progresses, vendorCatalog] = await Promise.all([
    firmIds.length > 0
      ? getAdminBriefingCatalog({ companyIds: firmIds })
      : Promise.resolve<BriefingCatalogItem[]>([]),
    Promise.all(firmIds.map((firmId) => getAdminCompanyBriefing(firmId))).then((results) =>
      results.filter((briefing): briefing is AdminCompanyBriefing => briefing !== null)
    ),
    Promise.all(
      firmIds.map(async (firmId) => {
        const modules = await getFirmAssessmentProgress(firmId);
        return summarizeFirmAlignmentProgress(modules);
      })
    ),
    getVendorProductInsightCatalog(input.vendorCompanyId) as Promise<VendorProductInsightSnapshot[]>,
  ]);

  const productCount = vendorCatalog.length;
  const firmReviewCount = vendorCatalog.reduce(
    (sum, snapshot) => sum + snapshot.firmReviewed.assessmentCount,
    0
  );

  const latestActivityAt = catalog
    .map((item) => item.latestUpdatedAt)
    .filter((date): date is Date => date !== null)
    .reduce<Date | null>(
      (latest, current) => (latest === null || current > latest ? current : latest),
      null
    );

  return {
    ecosystemId: input.ecosystemId,
    ecosystemName: input.ecosystemName,
    vendorCompanyId: input.vendorCompanyId,
    vendorCompanyName: input.vendorCompanyName,
    firmCount: firmIds.length,
    avgFirmAlignmentScore: avgFirmAlignmentScore(catalog),
    vendorProductCoverage: { productCount, firmReviewCount },
    moduleCompletionRate: avgModuleCompletion(progresses),
    activeDivergenceCount: countHotDivergences(briefings),
    thirtyDayActionCount: countThirtyDayActions(briefings),
    firmConfidenceCounts: aggregateFirmConfidence(catalog),
    latestActivityAt: latestActivityAt ? latestActivityAt.toISOString() : null,
  };
}

// ---------- Day-13 stubs (Mock A detail view) ----------

// TODO(day-13): Detail-view shape per Mock A. Will surface:
//   - vendor-at-a-glance (product count, strongest/weakest, capability buckets)
//   - firm grid (4–10 cards, sortable)
//   - vendor coverage map (14 function buckets per §6 decision 4)
//   - open-ended response panel (most-recent 10 per §6 decision 6)
export type EcosystemDetailData = {
  ecosystemId: string;
  ecosystemName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
  // Shape finalized in the Day-13 prompt against locked §6 decisions.
};

// TODO(day-13): implement detail aggregation (Mock A signals).
export async function getEcosystemDetailForConsultant(
  consultantProfileId: string,
  ecosystemId: string
): Promise<EcosystemDetailData | null> {
  void consultantProfileId;
  void ecosystemId;
  return null;
}
