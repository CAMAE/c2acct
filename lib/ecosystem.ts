import {
  getAdminBriefingCatalog,
  getAdminCompanyBriefing,
  type AdminCompanyBriefing,
  type BriefingCatalogItem,
} from "@/lib/adminBriefingEngine";
import {
  getFirmAssessmentProgress,
  getFirmProductCatalog,
  summarizeFirmAlignmentProgress,
  type FirmAlignmentProgressSummary,
} from "@/lib/firmPat";
import prisma from "@/lib/prisma";
import { assertEcosystemPair, getVendorScopedFirms } from "@/lib/tenancy";
import { DIVERGENCE_MIN_FIRM_REVIEWS } from "@/lib/vendorProductInsightEngine";
import {
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";
import { PRODUCT_UTILITY_REGISTRY } from "@/lib/productUtilityRegistry";

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
// B8-2: engines now emit the ONE customer-facing lexicon (Grounded / Early
// signal / No signal); those three canonical keys are what real data hits. The
// long-form keys below are INTERNAL bucketing plumbing (never rendered) kept so
// the five-bucket count granularity and its back-compat with any pre-ruling
// cached label survive. Customer-facing labels come from the engines/components,
// not from these map keys.
const CONFIDENCE_LABEL_BUCKETS: Record<string, keyof FirmConfidenceCounts> = {
  Grounded: "grounded",
  "Early signal": "emerging",
  "No signal": "noSignal",
  "Grounded current-state signal": "grounded",
  "Limited signal": "emerging",
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

export function aggregateFirmConfidence(
  catalog: BriefingCatalogItem[],
  totalFirmCount?: number
): FirmConfidenceCounts {
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
  // Assigned firms with no briefing entry yet are "no signal" — otherwise the
  // band total (only briefed firms) disagreed with the card's "N firms"
  // subtitle (all assigned firms), e.g. "7 firms" vs "4 of 4". Count all of them.
  if (totalFirmCount !== undefined) {
    counts.noSignal += Math.max(0, totalFirmCount - catalog.length);
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
      // Divergence sample floor (CLASS 2): need ≥ N firm reviews to assert a gap.
      if (product.firmReviewCount < DIVERGENCE_MIN_FIRM_REVIEWS) {
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

// ---------- WS2 thin metadata helper ----------

/**
 * Lightweight ecosystem metadata for the consultant layout top card.
 * Returns only {ecosystemName, firmCount, productCount}. Tenancy gate:
 * Invariant 1 — first prisma call is the consultantAssignment lookup.
 */
export async function getEcosystemMetadataForConsultant(
  consultantProfileId: string,
  ecosystemId: string
): Promise<{ ecosystemName: string; firmCount: number; productCount: number } | null> {
  const assignment = await prisma.consultantAssignment.findFirst({
    where: { consultantProfileId, ecosystemId, active: true },
    select: {
      Ecosystem: {
        select: {
          id: true,
          name: true,
          vendorCompanyId: true,
          EcosystemFirm: { select: { firmCompanyId: true } },
        },
      },
    },
  });
  if (!assignment || !assignment.Ecosystem) return null;
  const ecosystem = assignment.Ecosystem;

  const productCount = ecosystem.vendorCompanyId
    ? await prisma.product.count({
        where: { companyId: ecosystem.vendorCompanyId },
      })
    : 0;

  return {
    ecosystemName: ecosystem.name,
    firmCount: ecosystem.EcosystemFirm.length,
    productCount,
  };
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
    firmConfidenceCounts: aggregateFirmConfidence(catalog, firmIds.length),
    latestActivityAt: latestActivityAt ? latestActivityAt.toISOString() : null,
  };
}

// ---------- Day-14 Mock A detail view ----------

/**
 * §6 decision 4: 14 function buckets. Keys mirror data/research/
 * accounting-software-taxonomy-v1.json's `function-*` prefix entries. Labels
 * stay short (≤14 chars) so they fit the coverage map cells in
 * VendorAtAGlance without wrapping.
 */
export const FUNCTION_BUCKET_LABELS: Record<string, string> = {
  "function-tax": "Tax",
  "function-audit": "Audit",
  "function-client-management": "Client Mgmt",
  "function-practice-management": "Practice Mgmt",
  "function-workflow": "Workflow",
  "function-document-management": "Document",
  "function-payroll": "Payroll",
  "function-cas": "CAS",
  "function-erp-gl": "ERP/GL",
  "function-analytics": "Analytics",
  "function-compliance": "Compliance",
  "function-billing": "Billing",
  "function-payments": "Payments",
  "function-advisory": "Advisory",
};

export const FUNCTION_BUCKET_KEYS = Object.keys(FUNCTION_BUCKET_LABELS);

export type EcosystemDetailCoverageCell = {
  bucketKey: string;
  bucketLabel: string;
  covered: boolean;
  productCount: number;
};

export type EcosystemDetailFirmRow = {
  firmCompanyId: string;
  firmCompanyName: string;
  canonicalFirmScore: number | null;
  confidenceLabel: string;
  moduleCompletionPercent: number | null;
  productReviewCount: number;
  productsAvailable: number;
  latestActivityAt: string | null;
  /** 15e — when the firm last had a complete (all-module) assessment on record;
   *  null if never fully assessed. Read-only staleness signal for consultants. */
  lastFullAssessmentAt: string | null;
  fullyAssessed: boolean;
  thirtyDayActionCount: number;
  hotDivergenceCount: number;
};

export type EcosystemDetailOpenEndedResponse = {
  responseId: string;
  firmCompanyId: string;
  firmCompanyName: string;
  productId: string;
  productName: string;
  questionLabel: string;
  response: string;
  submittedAt: string;
};

export type EcosystemDetailVendorAtAGlance = {
  productCount: number;
  strongestProduct: { id: string; name: string; score: number | null } | null;
  weakestProduct: { id: string; name: string; score: number | null } | null;
  functionBucketsCovered: number;
  functionBucketsTotal: number;
};

export type EcosystemDetailData = {
  // Header
  ecosystemId: string;
  ecosystemName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
  firmCount: number;
  latestActivityAt: string | null;
  firmConfidenceCounts: FirmConfidenceCounts;

  // Tier-1 metrics (mirror Mock C list-view card)
  avgFirmAlignmentScore: number | null;
  vendorProductCoverage: { productCount: number; firmReviewCount: number };
  moduleCompletionRate: number | null;
  activeDivergenceCount: number;
  thirtyDayActionCount: number;

  // Vendor surfaces
  vendorAtAGlance: EcosystemDetailVendorAtAGlance;
  vendorCoverageMap: EcosystemDetailCoverageCell[];

  // Firm grid
  firmGrid: EcosystemDetailFirmRow[];

  // Open-ended responses (most-recent 10 + total count for "Show all")
  openEndedResponses: EcosystemDetailOpenEndedResponse[];
  openEndedTotalCount: number;
};

// ---------- Day-14 helpers (pure; exported for unit tests) ----------

/**
 * Day-16 audit-d15-001 alignment: the curated `vendor-catalog.json` and the
 * runtime `getVendorProductInsightCatalog` predicate speak registry-utility
 * keys (`tax_workflow_compliance`, etc., from `lib/productUtilityRegistry.ts`).
 * The 14-bucket display vocabulary still uses `function-*` keys from the
 * accounting-software taxonomy. The bridge is the registry's
 * `taxonomyBucketKeys` field — each registry utility lists which function
 * buckets it covers. This map looks each utility's bucket attribution up there
 * at render time, so the curated data file stays the single source of truth
 * and the registry-vs-taxonomy translation never has to be duplicated.
 *
 * Group-by-bucket across vendor product snapshots: a bucket is "covered" if
 * any product in the vendor's catalog declares a registry utility that maps
 * to that bucket via taxonomyBucketKeys.
 */
const REGISTRY_UTILITY_BUCKET_KEYS: Record<string, string[]> = Object.fromEntries(
  PRODUCT_UTILITY_REGISTRY.map((utility) => [utility.key, utility.taxonomyBucketKeys])
);

export function vendorCoverageMapForVendor(
  vendorCatalog: VendorProductInsightSnapshot[]
): EcosystemDetailCoverageCell[] {
  const productCountByBucket = new Map<string, number>();
  for (const snapshot of vendorCatalog) {
    const bucketsTouchedByProduct = new Set<string>();
    for (const utilityKey of snapshot.product.utilityKeys) {
      const bucketKeys = REGISTRY_UTILITY_BUCKET_KEYS[utilityKey] ?? [];
      for (const bucketKey of bucketKeys) {
        if (!FUNCTION_BUCKET_LABELS[bucketKey]) continue;
        bucketsTouchedByProduct.add(bucketKey);
      }
    }
    for (const bucketKey of bucketsTouchedByProduct) {
      productCountByBucket.set(
        bucketKey,
        (productCountByBucket.get(bucketKey) ?? 0) + 1
      );
    }
  }
  return FUNCTION_BUCKET_KEYS.map((bucketKey) => {
    const productCount = productCountByBucket.get(bucketKey) ?? 0;
    return {
      bucketKey,
      bucketLabel: FUNCTION_BUCKET_LABELS[bucketKey],
      covered: productCount > 0,
      productCount,
    };
  });
}

/**
 * Strongest = highest firmReviewed.averageScore; weakest = lowest. Both null
 * when every product lacks a firm-reviewed score. Tiebreakers fall to insertion
 * order (vendorCatalog is already alphabetized in the engine).
 */
export function vendorAtAGlanceForVendor(
  vendorCatalog: VendorProductInsightSnapshot[]
): EcosystemDetailVendorAtAGlance {
  const productCount = vendorCatalog.length;
  const scored = vendorCatalog
    .map((snapshot) => ({
      id: snapshot.product.id,
      name: snapshot.product.name,
      score: snapshot.firmReviewed.averageScore,
    }))
    .filter((entry): entry is { id: string; name: string; score: number } => entry.score !== null);

  let strongestProduct: EcosystemDetailVendorAtAGlance["strongestProduct"] = null;
  let weakestProduct: EcosystemDetailVendorAtAGlance["weakestProduct"] = null;
  if (scored.length > 0) {
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    strongestProduct = { id: sorted[0].id, name: sorted[0].name, score: sorted[0].score };
    const last = sorted[sorted.length - 1];
    weakestProduct = { id: last.id, name: last.name, score: last.score };
  }

  const coverage = vendorCoverageMapForVendor(vendorCatalog);
  const functionBucketsCovered = coverage.filter((cell) => cell.covered).length;

  return {
    productCount,
    strongestProduct,
    weakestProduct,
    functionBucketsCovered,
    functionBucketsTotal: FUNCTION_BUCKET_KEYS.length,
  };
}

/**
 * Flat-map open-ended responses across firms' productLayer, sort by submittedAt
 * desc, slice to `limit`. Returns the sliced array + the pre-slice total count
 * so the UI can render "Show all (N)".
 */
export function openEndedResponsesForEcosystem(
  briefings: AdminCompanyBriefing[],
  limit?: number,
  allowedProductIds?: ReadonlySet<string>
): { responses: EcosystemDetailOpenEndedResponse[]; totalCount: number } {
  // WS2-D (manual-review item 15): the cap is now optional. Callers that
  // need all responses for client-side filtering pass no limit and get the
  // full sorted list. Estimate at scale (4 ecosystems × ~80 responses
  // = ~320 records × ~200 chars ≈ 64KB JSON) is well under the halt
  // threshold.
  //
  // B8-6 COI WALL (component-level): the firm briefings are firm-scoped, so a
  // firm's productLayer carries its reviews of EVERY vendor's products. When an
  // allowedProductIds set is supplied (the ecosystem vendor's own catalog), any
  // response about another vendor's product is dropped here — the consultant's
  // "Recent firm responses" panel can never surface, or filter to, a competitor
  // vendor's product.
  const all: EcosystemDetailOpenEndedResponse[] = [];
  for (const briefing of briefings) {
    for (const [index, response] of briefing.productLayer.openEndedResponses.entries()) {
      if (!response.responseText.trim()) continue;
      if (allowedProductIds && !allowedProductIds.has(response.productId)) continue;
      all.push({
        responseId: `${briefing.company.id}:${response.productId}:${response.questionId}:${index}`,
        firmCompanyId: briefing.company.id,
        firmCompanyName: briefing.company.name,
        productId: response.productId,
        productName: response.productName,
        questionLabel: response.sectionTitle || response.questionPrompt,
        response: response.responseText,
        submittedAt: response.submittedAt
          ? response.submittedAt.toISOString()
          : new Date(0).toISOString(),
      });
    }
  }
  all.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : a.submittedAt > b.submittedAt ? -1 : 0));
  const responses = typeof limit === "number" ? all.slice(0, limit) : all;
  return { responses, totalCount: all.length };
}

// ---------- Day-14 main aggregation ----------

export async function getEcosystemDetailForConsultant(
  consultantProfileId: string,
  ecosystemId: string
): Promise<EcosystemDetailData | null> {
  // Tenancy gate — fail-closed BEFORE any other prisma read so notFound() in
  // the caller doesn't accidentally surface as 500 from a partial render.
  const assignment = await prisma.consultantAssignment.findFirst({
    where: { consultantProfileId, ecosystemId, active: true },
    select: {
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
  if (!assignment || !assignment.Ecosystem) {
    return null;
  }
  const ecosystem = assignment.Ecosystem;
  if (!ecosystem.vendorCompanyId || !ecosystem.VendorCompany) {
    return null;
  }
  const vendorCompanyId = ecosystem.vendorCompanyId;
  const vendorCompanyName = ecosystem.VendorCompany.name;

  const firmIds = await getVendorScopedFirms(vendorCompanyId);

  await Promise.all(
    firmIds.map(async (firmId) => {
      const ok = await assertEcosystemPair(vendorCompanyId, firmId);
      if (!ok) {
        throw new Error(
          `Tenancy violation in getEcosystemDetailForConsultant: firm ${firmId} is not in ecosystem of vendor ${vendorCompanyId}`
        );
      }
    })
  );

  const [catalog, briefings, progresses, firmProductCatalogs, vendorCatalog] = await Promise.all([
    firmIds.length > 0
      ? getAdminBriefingCatalog({ companyIds: firmIds })
      : Promise.resolve<BriefingCatalogItem[]>([]),
    Promise.all(firmIds.map((firmId) => getAdminCompanyBriefing(firmId))).then((results) =>
      results.filter((briefing): briefing is AdminCompanyBriefing => briefing !== null)
    ),
    Promise.all(
      firmIds.map(async (firmId) => {
        const modules = await getFirmAssessmentProgress(firmId);
        return { firmId, summary: summarizeFirmAlignmentProgress(modules) };
      })
    ),
    Promise.all(
      firmIds.map(async (firmId) => ({
        firmId,
        catalog: await getFirmProductCatalog(firmId),
      }))
    ),
    getVendorProductInsightCatalog(vendorCompanyId) as Promise<VendorProductInsightSnapshot[]>,
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

  const catalogByFirmId = new Map(catalog.map((item) => [item.companyId, item]));
  const progressByFirmId = new Map(progresses.map((entry) => [entry.firmId, entry.summary]));
  const firmProductsByFirmId = new Map(firmProductCatalogs.map((entry) => [entry.firmId, entry.catalog]));
  const thirtyDayActionsByFirmId = new Map<string, number>();
  const hotDivergencesByFirmId = new Map<string, number>();
  for (const briefing of briefings) {
    const count = briefing.nextActions.filter((action) => action.window === "30 days").length;
    thirtyDayActionsByFirmId.set(briefing.company.id, count);
    let hotCount = 0;
    for (const product of briefing.productLayer.products) {
      const firmScore = product.canonicalFirmReviewScore;
      const vendorScore = product.vendorSelfReportedScore;
      if (firmScore === null || vendorScore === null) continue;
      if (product.firmReviewCount < DIVERGENCE_MIN_FIRM_REVIEWS) continue;
      if (Math.abs(firmScore - vendorScore) >= HOT_DIVERGENCE_THRESHOLD) hotCount += 1;
    }
    hotDivergencesByFirmId.set(briefing.company.id, hotCount);
  }

  const firmGrid: EcosystemDetailFirmRow[] = firmIds
    .map((firmId): EcosystemDetailFirmRow | null => {
      const catalogEntry = catalogByFirmId.get(firmId);
      if (!catalogEntry) return null;
      const progress = progressByFirmId.get(firmId) ?? null;
      const firmProducts = firmProductsByFirmId.get(firmId) ?? [];
      const productReviewCount = firmProducts.filter(
        (product) => product.latestFirmReviewSubmittedAt !== null
      ).length;
      const productsAvailable = firmProducts.filter((product) => product.reviewAvailable).length;
      return {
        firmCompanyId: firmId,
        firmCompanyName: catalogEntry.companyName,
        canonicalFirmScore: catalogEntry.canonicalFirmScore,
        confidenceLabel: catalogEntry.confidenceLabel,
        moduleCompletionPercent: progress ? progress.completionPercent : null,
        productReviewCount,
        productsAvailable,
        latestActivityAt: catalogEntry.latestUpdatedAt
          ? catalogEntry.latestUpdatedAt.toISOString()
          : null,
        lastFullAssessmentAt: progress?.lastFullAssessmentAt
          ? progress.lastFullAssessmentAt.toISOString()
          : null,
        fullyAssessed: progress?.fullyAssessed ?? false,
        thirtyDayActionCount: thirtyDayActionsByFirmId.get(firmId) ?? 0,
        hotDivergenceCount: hotDivergencesByFirmId.get(firmId) ?? 0,
      };
    })
    .filter((row): row is EcosystemDetailFirmRow => row !== null);

  // WS2-D: lift the slice cap so the OpenEndedPanel can client-side filter
  // across all responses by product. Payload estimated <100KB at demo scale.
  // B8-6: scope to THIS ecosystem vendor's own catalog so no competitor
  // vendor's product responses (or filter chips) can leak to the consultant.
  const vendorProductIds = new Set(vendorCatalog.map((snapshot) => snapshot.product.id));
  const openEnded = openEndedResponsesForEcosystem(briefings, undefined, vendorProductIds);

  return {
    ecosystemId: ecosystem.id,
    ecosystemName: ecosystem.name,
    vendorCompanyId,
    vendorCompanyName,
    firmCount: firmIds.length,
    latestActivityAt: latestActivityAt ? latestActivityAt.toISOString() : null,
    firmConfidenceCounts: aggregateFirmConfidence(catalog, firmIds.length),
    avgFirmAlignmentScore: avgFirmAlignmentScore(catalog),
    vendorProductCoverage: { productCount, firmReviewCount },
    moduleCompletionRate: avgModuleCompletion(progresses.map((entry) => entry.summary)),
    activeDivergenceCount: countHotDivergences(briefings),
    thirtyDayActionCount: countThirtyDayActions(briefings),
    vendorAtAGlance: vendorAtAGlanceForVendor(vendorCatalog),
    vendorCoverageMap: vendorCoverageMapForVendor(vendorCatalog),
    firmGrid,
    openEndedResponses: openEnded.responses,
    openEndedTotalCount: openEnded.totalCount,
  };
}
