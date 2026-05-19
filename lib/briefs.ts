import {
  getAdminBriefingCatalog,
  getAdminCompanyBriefing,
  type AdminCompanyBriefing,
  type BriefingActionItem,
  type BriefingCatalogItem,
} from "@/lib/adminBriefingEngine";
import {
  BODY_PATTERNS,
  HEADLINE_PATTERNS,
  renderConfidenceCallout,
  VENDOR_BRIEF_VARIANT_BANK,
  type VendorBriefVariantSlots,
} from "@/lib/briefs/executive-summary-templates";
import { getBriefEditChoicesForConsultant } from "@/lib/briefEditChoice";
import {
  HOT_DIVERGENCE_THRESHOLD,
  aggregateFirmConfidence,
  avgFirmAlignmentScore,
  countHotDivergences,
  vendorCoverageMapForVendor,
} from "@/lib/ecosystem";
import prisma from "@/lib/prisma";
import { assertEcosystemPair, getVendorScopedFirms } from "@/lib/tenancy";
import {
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

/**
 * Phase-4 Day-15 vendor brief presentation layer.
 *
 * Composes Days-12-14 ecosystem helpers + existing engine outputs into the
 * VendorBriefData shape per PAT-5.7-Brief-Mocks-Vendor-and-Firm.md v2.1.
 *
 * Four sections shipped today: executiveSummary, selfVsMarketDelta,
 * perFirmHeatmap, actionRoadmap. Two deferred: ecosystemTrajectory (Page 5)
 * and peerBenchmark (Page 6) — both unlock post-pilot per the spec.
 *
 * Every number on every section traces to a function in this file that
 * wraps an existing engine call. No LLM, no consultant attribution. The
 * methodology footnote names the underlying engine functions so the brief
 * earns its consultant-grade authority claim.
 */

// ---------- Day-15 type shape ----------

export type VendorBriefExecutiveSummary = {
  headline: string;
  body: string[];
  confidenceCallout: string;
  firmAvg: number | null;
  vendorSelfReport: number | null;
};

export type VendorBriefDeltaDirection =
  | "vendor-higher"
  | "firm-higher"
  | "neutral"
  | "no-signal";

export type VendorBriefDeltaRow = {
  productId: string;
  productName: string;
  vendorSelfReported: number | null;
  firmReviewedAverage: number | null;
  delta: number | null;
  deltaDirection: VendorBriefDeltaDirection;
  isHotDivergence: boolean;
  firmReviewCount: number;
};

export type VendorBriefHeatmapBand =
  | "high-strong"
  | "high"
  | "mid"
  | "low"
  | "unreviewed";

export type VendorBriefHeatmapCell = {
  firmCompanyId: string;
  productId: string;
  score: number | null;
  band: VendorBriefHeatmapBand;
};

export type VendorBriefHeatmap = {
  firms: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
  cells: VendorBriefHeatmapCell[];
};

export type VendorBriefSignalStrength = "high" | "medium" | "low";

export type VendorBriefRoadmapItem = {
  itemId: string;
  window: BriefingActionItem["window"];
  text: string;
  detail: string;
  affectedFirmIds: string[];
  signalStrength: VendorBriefSignalStrength;
};

export type VendorBriefRoadmap = {
  thirtyDay: VendorBriefRoadmapItem[];
  sixtyDay: VendorBriefRoadmapItem[];
  ninetyDay: VendorBriefRoadmapItem[];
};

export type VendorBriefMethodology = {
  dataSources: string[];
  sampleSizes: {
    firmCount: number;
    submissionCount: number;
    reviewCount: number;
  };
};

export type VendorBriefVariantOption = {
  id: string;
  tone: string;
  label: string;
  rendered: string;
};

export type VendorBriefEditChoices = {
  /** sectionKey → chosen variant id (empty string or missing = use default index 0). */
  variants: Record<string, string>;
  /** sectionKey → set of active emphasis target ids. */
  emphasis: Record<string, string[]>;
  /** sectionKey → consultant-preferred id order; stale ids drop, missing ids append. */
  ordering: Record<string, string[]>;
};

export type VendorBriefData = {
  briefId: string;
  ecosystemId: string;
  ecosystemName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
  generatedAt: string;
  firmCount: number;
  productCount: number;

  executiveSummary: VendorBriefExecutiveSummary;
  selfVsMarketDelta: VendorBriefDeltaRow[];
  perFirmHeatmap: VendorBriefHeatmap;
  actionRoadmap: VendorBriefRoadmap;

  methodology: VendorBriefMethodology;

  /** Pre-rendered variants per section so the picker can swap text inline without a server round-trip. */
  editVariants: Record<string, VendorBriefVariantOption[]>;
  /** Consultant's chosen edits composed onto the brief; empty-default for new briefs. */
  editChoices: VendorBriefEditChoices;
};

// ---------- Heatmap band thresholds ----------

/**
 * Per PAT-5.7-Brief-Mocks-Vendor-and-Firm.md Page 3:
 *   Green ≥ 75, Amber 50-74, Red < 50, Not yet reviewed.
 */
export const HEATMAP_BAND_STRONG_THRESHOLD = 85;
export const HEATMAP_BAND_HIGH_THRESHOLD = 75;
export const HEATMAP_BAND_MID_THRESHOLD = 50;

export function heatmapBandForScore(score: number | null): VendorBriefHeatmapBand {
  if (score === null) return "unreviewed";
  if (score >= HEATMAP_BAND_STRONG_THRESHOLD) return "high-strong";
  if (score >= HEATMAP_BAND_HIGH_THRESHOLD) return "high";
  if (score >= HEATMAP_BAND_MID_THRESHOLD) return "mid";
  return "low";
}

// ---------- Day-15 helpers (pure; exported for unit tests) ----------

export function buildSelfVsMarketDelta(
  vendorCatalog: VendorProductInsightSnapshot[]
): VendorBriefDeltaRow[] {
  const rows: VendorBriefDeltaRow[] = vendorCatalog.map((snapshot) => {
    const vendorScore = snapshot.vendorSelfReported.latestScore;
    const firmScore = snapshot.firmReviewed.averageScore;

    let delta: number | null = null;
    let deltaDirection: VendorBriefDeltaDirection = "no-signal";
    if (vendorScore !== null && firmScore !== null) {
      delta = Math.round(vendorScore - firmScore);
      if (delta > 0) deltaDirection = "vendor-higher";
      else if (delta < 0) deltaDirection = "firm-higher";
      else deltaDirection = "neutral";
    }

    const isHotDivergence = delta !== null && Math.abs(delta) >= HOT_DIVERGENCE_THRESHOLD;

    return {
      productId: snapshot.product.id,
      productName: snapshot.product.name,
      vendorSelfReported: vendorScore,
      firmReviewedAverage: firmScore,
      delta,
      deltaDirection,
      isHotDivergence,
      firmReviewCount: snapshot.firmReviewed.assessmentCount,
    };
  });

  // Sort by |delta| desc, with no-signal rows pushed to the bottom so the
  // most-divergent products surface at the top of the brief.
  rows.sort((a, b) => {
    const aRank = a.delta === null ? -1 : Math.abs(a.delta);
    const bRank = b.delta === null ? -1 : Math.abs(b.delta);
    return bRank - aRank;
  });

  return rows;
}

/**
 * Flat firm×product cell list + axes. Empty cells (firm didn't review the
 * product) are preserved with `score: null` so the UI can render them as
 * "—" with a dashed border rather than zero-filling.
 */
export function buildPerFirmHeatmap(
  firms: Array<{ id: string; name: string }>,
  vendorCatalog: VendorProductInsightSnapshot[],
  briefings: AdminCompanyBriefing[]
): VendorBriefHeatmap {
  const products = vendorCatalog.map((snapshot) => ({
    id: snapshot.product.id,
    name: snapshot.product.name,
  }));

  const scoreByFirmAndProduct = new Map<string, number>();
  for (const briefing of briefings) {
    for (const product of briefing.productLayer.products) {
      const score = product.canonicalFirmReviewScore;
      if (score === null) continue;
      scoreByFirmAndProduct.set(`${briefing.company.id}:${product.productId}`, score);
    }
  }

  const cells: VendorBriefHeatmapCell[] = [];
  for (const firm of firms) {
    for (const product of products) {
      const score = scoreByFirmAndProduct.get(`${firm.id}:${product.id}`) ?? null;
      cells.push({
        firmCompanyId: firm.id,
        productId: product.id,
        score,
        band: heatmapBandForScore(score),
      });
    }
  }

  return { firms, products, cells };
}

/**
 * Flat-map nextActions across firms, dedupe by normalized text, attach the
 * firm IDs that surfaced each. Signal strength scales with how many firms
 * raised the same action — `high` when more than half the firms cite it,
 * `medium` when at least a quarter do, `low` otherwise.
 */
export function buildActionRoadmap(
  briefings: AdminCompanyBriefing[]
): VendorBriefRoadmap {
  type AggregatedAction = {
    text: string;
    detail: string;
    window: BriefingActionItem["window"];
    affectedFirmIds: Set<string>;
  };

  const byKey = new Map<string, AggregatedAction>();

  for (const briefing of briefings) {
    for (const action of briefing.nextActions) {
      const normalized = action.title.trim().toLowerCase();
      if (!normalized) continue;
      const key = `${action.window}::${normalized}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.affectedFirmIds.add(briefing.company.id);
      } else {
        byKey.set(key, {
          text: action.title,
          detail: action.detail,
          window: action.window,
          affectedFirmIds: new Set([briefing.company.id]),
        });
      }
    }
  }

  const firmCount = briefings.length;
  const items: VendorBriefRoadmapItem[] = Array.from(byKey.entries()).map(
    ([key, aggregate]) => {
      const affected = Array.from(aggregate.affectedFirmIds);
      const signalStrength: VendorBriefSignalStrength =
        firmCount > 0 && affected.length * 2 > firmCount
          ? "high"
          : firmCount > 0 && affected.length * 4 >= firmCount
            ? "medium"
            : "low";
      return {
        itemId: key,
        window: aggregate.window,
        text: aggregate.text,
        detail: aggregate.detail,
        affectedFirmIds: affected,
        signalStrength,
      };
    }
  );

  const rankSignal = (strength: VendorBriefSignalStrength) =>
    strength === "high" ? 0 : strength === "medium" ? 1 : 2;
  items.sort((a, b) => {
    const rank = rankSignal(a.signalStrength) - rankSignal(b.signalStrength);
    if (rank !== 0) return rank;
    return b.affectedFirmIds.length - a.affectedFirmIds.length;
  });

  return {
    thirtyDay: items.filter((item) => item.window === "30 days"),
    sixtyDay: items.filter((item) => item.window === "60 days"),
    ninetyDay: items.filter((item) => item.window === "90 days"),
  };
}

export function generateExecutiveSummary(
  briefings: AdminCompanyBriefing[],
  vendorCatalog: VendorProductInsightSnapshot[],
  catalog: BriefingCatalogItem[],
  ecosystemName: string
): VendorBriefExecutiveSummary {
  const avgFirmScore = avgFirmAlignmentScore(catalog);
  const vendorScores = vendorCatalog
    .map((snapshot) => snapshot.vendorSelfReported.latestScore)
    .filter((value): value is number => value !== null);
  const avgVendorSelfReport =
    vendorScores.length > 0
      ? Math.round(vendorScores.reduce((sum, value) => sum + value, 0) / vendorScores.length)
      : null;
  const hotDivergences = countHotDivergences(briefings);
  const confidence = aggregateFirmConfidence(catalog);
  const coverage = vendorCoverageMapForVendor(vendorCatalog);
  const bucketsCovered = coverage.filter((cell) => cell.covered).length;

  const headlineSlots = {
    ecosystemName,
    firmCount: catalog.length,
    avgFirmScore,
    avgVendorSelfReport,
  };

  const headlinePattern =
    avgFirmScore !== null && avgVendorSelfReport !== null
      ? HEADLINE_PATTERNS.find((p) => p.key === "compare-scores")!
      : HEADLINE_PATTERNS.find((p) => p.key === "scope-only")!;
  const headline = headlinePattern.template(headlineSlots);

  const bodySlots = {
    hotDivergences,
    productCount: vendorCatalog.length,
    groundedCount: confidence.grounded,
    emergingCount: confidence.emerging,
    sampleThinCount: confidence.sampleThin,
    earlySignalCount: confidence.earlySignal,
    noSignalCount: confidence.noSignal,
    firmCount: catalog.length,
    bucketsCovered,
    bucketsTotal: coverage.length,
  };

  const body = BODY_PATTERNS.map((pattern) => pattern.render(bodySlots)).filter(
    (text): text is string => text !== null
  );

  const confidenceCallout = renderConfidenceCallout({
    groundedCount: confidence.grounded,
    emergingCount: confidence.emerging,
    sampleThinCount: confidence.sampleThin,
    earlySignalCount: confidence.earlySignal,
    noSignalCount: confidence.noSignal,
    firmCount: catalog.length,
  });

  return {
    headline,
    body,
    confidenceCallout,
    firmAvg: avgFirmScore,
    vendorSelfReport: avgVendorSelfReport,
  };
}

// ---------- Edit-choice composition (pure helpers; exported for tests) ----------

/**
 * Turn the raw choice Map (sectionKey::choiceType → entry) into the
 * shape the brief render layer consumes. Empty-string sentinels are
 * dropped — the read layer treats empty as "no choice applied" so the
 * brief falls back to the default render.
 */
export function composeVendorEditChoices(
  choicesMap: Map<string, { choiceType: string; choiceValue: string }>
): VendorBriefEditChoices {
  const out: VendorBriefEditChoices = { variants: {}, emphasis: {}, ordering: {} };
  for (const [key, entry] of choicesMap.entries()) {
    if (entry.choiceValue === "") continue;
    const [sectionKey, choiceType] = key.split("::");
    if (!sectionKey || !choiceType) continue;
    if (choiceType === "PHRASING_VARIANT") {
      out.variants[sectionKey] = entry.choiceValue;
    } else if (choiceType === "EMPHASIS") {
      out.emphasis[sectionKey] = entry.choiceValue
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");
    } else if (choiceType === "ORDERING") {
      out.ordering[sectionKey] = entry.choiceValue
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");
    }
  }
  return out;
}

/**
 * Pre-render every variant for every section so the picker can flip text
 * inline without a server round-trip. Default render (no consultant
 * choice) is variant index 0; tested upstream in tests/briefs.template-bank.test.ts.
 */
export function buildVendorEditVariants(
  slots: VendorBriefVariantSlots
): Record<string, VendorBriefVariantOption[]> {
  const out: Record<string, VendorBriefVariantOption[]> = {};
  for (const [sectionKey, variants] of Object.entries(VENDOR_BRIEF_VARIANT_BANK)) {
    out[sectionKey] = variants.map((variant) => ({
      id: variant.id,
      tone: variant.tone,
      label: variant.tone,
      rendered: variant.render(slots),
    }));
  }
  return out;
}

// ---------- Main aggregation ----------

export async function getVendorBriefForConsultant(
  consultantProfileId: string,
  ecosystemId: string
): Promise<VendorBriefData | null> {
  // Tenancy gate — first prisma read, fail-closed before any other work.
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
  if (!assignment || !assignment.Ecosystem) return null;
  const ecosystem = assignment.Ecosystem;
  if (!ecosystem.vendorCompanyId || !ecosystem.VendorCompany) return null;
  const vendorCompanyId = ecosystem.vendorCompanyId;
  const vendorCompanyName = ecosystem.VendorCompany.name;

  const firmIds = await getVendorScopedFirms(vendorCompanyId);

  // Defense-in-depth: every firm must belong to this vendor's ecosystem.
  await Promise.all(
    firmIds.map(async (firmId) => {
      const ok = await assertEcosystemPair(vendorCompanyId, firmId);
      if (!ok) {
        throw new Error(
          `Tenancy violation in getVendorBriefForConsultant: firm ${firmId} is not in ecosystem of vendor ${vendorCompanyId}`
        );
      }
    })
  );

  const [catalog, briefings, vendorCatalog] = await Promise.all([
    firmIds.length > 0
      ? getAdminBriefingCatalog({ companyIds: firmIds })
      : Promise.resolve<BriefingCatalogItem[]>([]),
    Promise.all(firmIds.map((firmId) => getAdminCompanyBriefing(firmId))).then(
      (results) =>
        results.filter((briefing): briefing is AdminCompanyBriefing => briefing !== null)
    ),
    getVendorProductInsightCatalog(vendorCompanyId) as Promise<VendorProductInsightSnapshot[]>,
  ]);

  const firmsAxis = catalog.map((item) => ({
    id: item.companyId,
    name: item.companyName,
  }));

  const executiveSummary = generateExecutiveSummary(
    briefings,
    vendorCatalog,
    catalog,
    ecosystem.name
  );
  const selfVsMarketDelta = buildSelfVsMarketDelta(vendorCatalog);
  const perFirmHeatmap = buildPerFirmHeatmap(firmsAxis, vendorCatalog, briefings);
  const actionRoadmap = buildActionRoadmap(briefings);

  const submissionCount = catalog.reduce(
    (sum, item) => sum + item.completedModuleCount,
    0
  );
  const reviewCount = vendorCatalog.reduce(
    (sum, snapshot) => sum + snapshot.firmReviewed.assessmentCount,
    0
  );

  const methodology: VendorBriefMethodology = {
    dataSources: [
      "lib/adminBriefingEngine.ts:getAdminBriefingCatalog",
      "lib/adminBriefingEngine.ts:getAdminCompanyBriefing",
      "lib/vendorProductInsightEngine.ts:getVendorProductInsightCatalog",
      "lib/ecosystem.ts:countHotDivergences",
      "lib/ecosystem.ts:aggregateFirmConfidence",
      "lib/ecosystem.ts:vendorCoverageMapForVendor",
    ],
    sampleSizes: {
      firmCount: firmIds.length,
      submissionCount,
      reviewCount,
    },
  };

  // Pre-compute variant slots once and pre-render every variant for every
  // section so the picker can flip inline without a server round-trip.
  const hotDivergenceCount = selfVsMarketDelta.filter((r) => r.isHotDivergence).length;
  const roadmapItemCount =
    actionRoadmap.thirtyDay.length +
    actionRoadmap.sixtyDay.length +
    actionRoadmap.ninetyDay.length;
  const avgFirmScore = avgFirmAlignmentScore(catalog);
  const vendorScores = vendorCatalog
    .map((snapshot) => snapshot.vendorSelfReported.latestScore)
    .filter((value): value is number => value !== null);
  const avgVendorSelfReport =
    vendorScores.length > 0
      ? Math.round(vendorScores.reduce((sum, value) => sum + value, 0) / vendorScores.length)
      : null;

  const variantSlots: VendorBriefVariantSlots = {
    ecosystemName: ecosystem.name,
    firmCount: firmIds.length,
    avgFirmScore,
    avgVendorSelfReport,
    hotDivergences: hotDivergenceCount,
    productCount: vendorCatalog.length,
    roadmapItemCount,
  };

  const editVariants = buildVendorEditVariants(variantSlots);

  // Compose consultant edit choices on read. Tenancy is already enforced
  // by this aggregator's own assignment lookup at the top of the function;
  // getBriefEditChoicesForConsultant re-checks for defense-in-depth.
  const choicesMap = await getBriefEditChoicesForConsultant(
    consultantProfileId,
    "vendor",
    vendorCompanyId,
    ecosystem.id
  );
  const editChoices = composeVendorEditChoices(choicesMap);

  return {
    briefId: `vendor-${ecosystem.id}`,
    ecosystemId: ecosystem.id,
    ecosystemName: ecosystem.name,
    vendorCompanyId,
    vendorCompanyName,
    generatedAt: new Date().toISOString(),
    firmCount: firmIds.length,
    productCount: vendorCatalog.length,
    executiveSummary,
    selfVsMarketDelta,
    perFirmHeatmap,
    actionRoadmap,
    methodology,
    editVariants,
    editChoices,
  };
}
