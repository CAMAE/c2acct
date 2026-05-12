import {
  getAdminBriefingCatalog,
  getAdminCompanyBriefing,
  type AdminCompanyBriefing,
  type BriefingActionItem,
  type BriefingCatalogItem,
} from "@/lib/adminBriefingEngine";
import { HOT_DIVERGENCE_THRESHOLD } from "@/lib/ecosystem";
import {
  FIRM_MODULE_DEFINITIONS,
  getFirmAssessmentProgress,
  getFirmProductCatalog,
  summarizeFirmAlignmentProgress,
  type FirmAlignmentProgressSummary,
  type FirmModuleProgress,
  type FirmProductCatalogItem,
} from "@/lib/firmPat";
import {
  HEADLINE_PATTERNS,
  PEER_LINE_PATTERNS,
  renderConfidenceCallout,
} from "@/lib/firmBriefs/template-bank";
import prisma from "@/lib/prisma";
import { assertEcosystemPair } from "@/lib/tenancy";
import {
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

/**
 * Phase-4 Day-16 Firm Brief presentation layer.
 *
 * Composes existing engine outputs into FirmBriefData per
 * PAT-5.7-Brief-Mocks-Vendor-and-Firm.md v2.1 page 2 (Firm Brief).
 *
 * Four sections in scope: firmAlignmentHeader (score + confidence + Jones-
 * effect peer callout), fiveModuleRadar (firm vs ecosystem average per
 * module), stackFitAnalysis (firm reviews vs vendor self-reports per
 * product), sixQuarterRoadmap (deterministic action sequencing across
 * current quarter + 5 forward quarters). Pages 5 (Peer Position) and
 * 6 (Public Recognition) deferred per spec.
 *
 * Same tenancy + engine-derived discipline as lib/briefs.ts. All copy via
 * lib/firmBriefs/template-bank.ts. No LLM, no consultant attribution.
 */

// ---------- Type shape ----------

export type FirmBriefPeerModuleDelta = {
  moduleKey: string;
  moduleTitle: string;
  firmScore: number;
  ecosystemAverage: number;
  delta: number;
};

export type FirmBriefAlignmentHeader = {
  firmCompanyId: string;
  firmCompanyName: string;
  canonicalFirmScore: number | null;
  confidenceLabel: string;
  modulesCompletedCount: number;
  modulesTotalCount: number;
  questionsAnsweredCount: number;
  questionsTotalCount: number;
  latestActivityAt: string | null;
  headline: string;
  confidenceCallout: string;
  peerLines: string[];
};

export type FirmBriefRadarBand =
  | "deep-green"
  | "green"
  | "amber"
  | "red"
  | "deep-red"
  | "no-signal";

export type FirmBriefRadarAxis = {
  moduleKey: string;
  moduleTitle: string;
  firmScore: number | null;
  ecosystemAverage: number | null;
  delta: number | null;
  band: FirmBriefRadarBand;
};

export type FirmBriefStackFitStatus = "aligned" | "strong" | "gap" | "not-reviewed";

export type FirmBriefStackFitRow = {
  productId: string;
  productName: string;
  vendorName: string;
  firmReviewedScore: number | null;
  vendorSelfReportedScore: number | null;
  delta: number | null;
  isHotDivergence: boolean;
  status: FirmBriefStackFitStatus;
  utilityLabels: string[];
};

export type FirmBriefRoadmapAction = {
  text: string;
  detail: string;
  source: "next-action" | "stack-gap" | "module-completion" | "peer-gap";
};

export type FirmBriefRoadmapQuarter = {
  quarterKey: string;
  quarterLabel: string;
  isCurrent: boolean;
  actions: FirmBriefRoadmapAction[];
  projectedAlignment: number | null;
};

export type FirmBriefMethodology = {
  dataSources: string[];
  sampleSizes: {
    moduleSubmissionCount: number;
    productReviewCount: number;
    peerFirmCount: number;
  };
};

export type FirmBriefData = {
  briefId: string;
  ecosystemId: string;
  ecosystemName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
  firmCompanyId: string;
  firmCompanyName: string;
  generatedAt: string;

  firmAlignmentHeader: FirmBriefAlignmentHeader;
  fiveModuleRadar: FirmBriefRadarAxis[];
  stackFitAnalysis: FirmBriefStackFitRow[];
  sixQuarterRoadmap: FirmBriefRoadmapQuarter[];

  methodology: FirmBriefMethodology;
};

// ---------- Band thresholds ----------

/**
 * 5-stop radar gradient per Mock v2.1 page 2: deep red (>15 below average),
 * red (-15 to -6), amber (-5 to +5), green (+6 to +15), deep green (>15
 * above average). Null when either firm or ecosystem score is missing.
 */
export function radarBandForDelta(delta: number | null): FirmBriefRadarBand {
  if (delta === null) return "no-signal";
  if (delta > 15) return "deep-green";
  if (delta >= 6) return "green";
  if (delta >= -5) return "amber";
  if (delta >= -15) return "red";
  return "deep-red";
}

/**
 * Stack-fit row status per Mock v2.1 page 3: "Strong" when firm review
 * meets vendor self-report within tolerance and firm score >= 75;
 * "Aligned" when firm score is mid-range (60-74) and not divergent;
 * "Gap" when firm score < 60 OR isHotDivergence; "Not reviewed" when
 * the firm hasn't submitted a review yet.
 */
export function stackFitStatusForRow(input: {
  firmReviewedScore: number | null;
  isHotDivergence: boolean;
}): FirmBriefStackFitStatus {
  if (input.firmReviewedScore === null) return "not-reviewed";
  if (input.isHotDivergence) return "gap";
  if (input.firmReviewedScore < 60) return "gap";
  if (input.firmReviewedScore >= 75) return "strong";
  return "aligned";
}

// ---------- Pure builders (exported for unit tests) ----------

/**
 * For each of the 5 PAT alignment modules, return firm vs ecosystem-average
 * scores + delta + band. Ecosystem average is the mean of every other firm's
 * module score; the focal firm is excluded so the callout is comparative
 * rather than self-referential.
 */
export function buildFiveModuleRadar(input: {
  focalFirmModules: FirmModuleProgress[];
  peerFirmModulesByFirmId: Map<string, FirmModuleProgress[]>;
}): FirmBriefRadarAxis[] {
  return FIRM_MODULE_DEFINITIONS.map((moduleDef) => {
    const focal = input.focalFirmModules.find((m) => m.key === moduleDef.key);
    const firmScore = focal?.latestScore ?? null;

    const peerScores: number[] = [];
    for (const [, peerModules] of input.peerFirmModulesByFirmId.entries()) {
      const peerModule = peerModules.find((m) => m.key === moduleDef.key);
      if (peerModule?.latestScore !== null && peerModule?.latestScore !== undefined) {
        peerScores.push(peerModule.latestScore);
      }
    }
    const ecosystemAverage =
      peerScores.length > 0
        ? Math.round(peerScores.reduce((sum, value) => sum + value, 0) / peerScores.length)
        : null;

    const delta =
      firmScore !== null && ecosystemAverage !== null
        ? firmScore - ecosystemAverage
        : null;

    return {
      moduleKey: moduleDef.key,
      moduleTitle: moduleDef.title,
      firmScore,
      ecosystemAverage,
      delta,
      band: radarBandForDelta(delta),
    };
  });
}

/**
 * Join firm product reviews with vendor self-report snapshots. Each row
 * represents one product in the firm's catalog; vendor self-report data
 * is matched by productId. Hot divergence flag uses the same 10-pt
 * threshold as Vendor Brief Self-vs-Market Delta.
 */
export function buildStackFitAnalysis(input: {
  firmProductCatalog: FirmProductCatalogItem[];
  vendorCatalog: VendorProductInsightSnapshot[];
  briefingForFirm: AdminCompanyBriefing | null;
}): FirmBriefStackFitRow[] {
  const vendorByProductId = new Map(
    input.vendorCatalog.map((snapshot) => [snapshot.product.id, snapshot])
  );

  // Firm-reviewed score per product comes from the firm's own briefing
  // productLayer (which is the canonical firmReviewed score for that
  // firm × product). Falls back to null if the firm has no briefing or
  // the product isn't reviewed.
  const firmReviewByProductId = new Map<string, number | null>();
  if (input.briefingForFirm) {
    for (const product of input.briefingForFirm.productLayer.products) {
      firmReviewByProductId.set(product.productId, product.canonicalFirmReviewScore);
    }
  }

  return input.firmProductCatalog.map((firmProduct): FirmBriefStackFitRow => {
    const vendorSnapshot = vendorByProductId.get(firmProduct.id);
    const firmReviewedScore = firmReviewByProductId.get(firmProduct.id) ?? null;
    const vendorSelfReportedScore = vendorSnapshot?.vendorSelfReported.latestScore ?? null;

    let delta: number | null = null;
    let isHotDivergence = false;
    if (firmReviewedScore !== null && vendorSelfReportedScore !== null) {
      delta = Math.round(vendorSelfReportedScore - firmReviewedScore);
      isHotDivergence = Math.abs(delta) >= HOT_DIVERGENCE_THRESHOLD;
    }

    return {
      productId: firmProduct.id,
      productName: firmProduct.name,
      vendorName: firmProduct.vendorName,
      firmReviewedScore,
      vendorSelfReportedScore,
      delta,
      isHotDivergence,
      status: stackFitStatusForRow({ firmReviewedScore, isHotDivergence }),
      utilityLabels: vendorSnapshot?.product.utilityLabels ?? [],
    };
  });
}

const ROADMAP_QUARTER_COUNT = 6;

function buildQuarterKeys(now: Date): Array<{ key: string; label: string }> {
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const startQuarter = Math.floor(month / 3) + 1;
  const quarters: Array<{ key: string; label: string }> = [];
  let q = startQuarter;
  let y = year;
  for (let i = 0; i < ROADMAP_QUARTER_COUNT; i += 1) {
    quarters.push({
      key: `${y}-Q${q}`,
      label: `Q${q}'${String(y).slice(-2)}`,
    });
    q += 1;
    if (q > 4) {
      q = 1;
      y += 1;
    }
  }
  return quarters;
}

/**
 * Six-quarter roadmap, deterministically derived from:
 *   • next-action items in 30/60/90-day windows (current Q + next 2 Qs)
 *   • stack-fit hot divergences ("replace / renegotiate" actions, Q4)
 *   • incomplete alignment modules ("complete module" actions, Q5)
 *   • peer-gap modules (modules where firm trails ecosystem average, Q6)
 *
 * Each quarter also carries a projectedAlignment using a deterministic
 * gap-closure model: each hot-divergence closure or module completion in
 * a quarter contributes a fixed +1 to the trajectory. Real engine
 * projections live in the vendor-side engine; this surface stays
 * deterministic + auditable so the methodology footnote can name the
 * formula by file path.
 */
export function buildSixQuarterRoadmap(input: {
  briefingForFirm: AdminCompanyBriefing | null;
  stackFit: FirmBriefStackFitRow[];
  modules: FirmModuleProgress[];
  radar: FirmBriefRadarAxis[];
  canonicalFirmScore: number | null;
  now?: Date;
}): FirmBriefRoadmapQuarter[] {
  const now = input.now ?? new Date();
  const quarters = buildQuarterKeys(now);

  const nextActions: BriefingActionItem[] = input.briefingForFirm?.nextActions ?? [];
  const thirtyDay = nextActions.filter((a) => a.window === "30 days");
  const sixtyDay = nextActions.filter((a) => a.window === "60 days");
  const ninetyDay = nextActions.filter((a) => a.window === "90 days");

  const stackGapRows = input.stackFit.filter((row) => row.status === "gap" && row.firmReviewedScore !== null);
  const incompleteModules = input.modules.filter((m) => m.status !== "completed");
  const peerGapAxes = input.radar.filter(
    (axis) => axis.delta !== null && axis.delta <= -6
  );

  const quarterContent: FirmBriefRoadmapAction[][] = [
    // Q1 — 30 day next actions
    thirtyDay.map((a) => ({ text: a.title, detail: a.detail, source: "next-action" as const })),
    // Q2 — 60 day next actions
    sixtyDay.map((a) => ({ text: a.title, detail: a.detail, source: "next-action" as const })),
    // Q3 — 90 day next actions
    ninetyDay.map((a) => ({ text: a.title, detail: a.detail, source: "next-action" as const })),
    // Q4 — stack-fit gaps
    stackGapRows.map((row) => ({
      text: `Reassess ${row.productName}`,
      detail: row.vendorSelfReportedScore !== null && row.firmReviewedScore !== null
        ? `Vendor self-report ${row.vendorSelfReportedScore} vs firm-reviewed ${row.firmReviewedScore} (delta ${row.delta}).`
        : "Firm-reviewed score is in the gap band.",
      source: "stack-gap" as const,
    })),
    // Q5 — incomplete alignment modules
    incompleteModules.map((module) => ({
      text: `Complete ${module.title}`,
      detail: `Currently ${module.status}; ${module.completedCount} of ${module.questionCount} questions answered.`,
      source: "module-completion" as const,
    })),
    // Q6 — peer-gap modules
    peerGapAxes.map((axis) => ({
      text: `Strengthen ${axis.moduleTitle}`,
      detail: axis.firmScore !== null && axis.ecosystemAverage !== null
        ? `Firm scores ${axis.firmScore} vs ecosystem average ${axis.ecosystemAverage} (delta ${axis.delta}).`
        : "Module trails ecosystem average.",
      source: "peer-gap" as const,
    })),
  ];

  // Deterministic gap-closure: each action in a quarter contributes +1 to
  // the trajectory at end of that quarter. Trajectory starts from the
  // canonical firm score and accumulates. Caps at 100.
  let projected = input.canonicalFirmScore;
  return quarters.map((quarter, index) => {
    const actions = quarterContent[index] ?? [];
    if (projected !== null) {
      projected = Math.min(100, projected + actions.length);
    }
    return {
      quarterKey: quarter.key,
      quarterLabel: quarter.label,
      isCurrent: index === 0,
      actions,
      projectedAlignment: projected,
    };
  });
}

// ---------- Main aggregation ----------

export async function getFirmBriefForConsultant(
  consultantProfileId: string,
  ecosystemId: string,
  firmCompanyId: string
): Promise<FirmBriefData | null> {
  // Tenancy gate (Invariant 1 + 2): assignment lookup is the first prisma
  // call. Return null on miss so caller's notFound() doesn't race a
  // partial render.
  const assignment = await prisma.consultantAssignment.findFirst({
    where: { consultantProfileId, ecosystemId, active: true },
    select: {
      Ecosystem: {
        select: {
          id: true,
          name: true,
          vendorCompanyId: true,
          VendorCompany: { select: { id: true, name: true } },
          EcosystemFirm: { select: { firmCompanyId: true } },
        },
      },
    },
  });
  if (!assignment || !assignment.Ecosystem) return null;
  const ecosystem = assignment.Ecosystem;
  if (!ecosystem.vendorCompanyId || !ecosystem.VendorCompany) return null;

  // Confirm the requested firm belongs to this ecosystem. If not, return
  // null so the route 404s. Without this, a consultant who owns ecosystem A
  // could probe any firm id in the URL and get a brief back if that firm
  // happens to exist anywhere — exactly the cross-ecosystem leak that the
  // tenancy invariants exist to prevent.
  const firmInEcosystem = ecosystem.EcosystemFirm.some(
    (entry) => entry.firmCompanyId === firmCompanyId
  );
  if (!firmInEcosystem) return null;

  // Defense-in-depth (Invariant 4): vendor-first, firm-second.
  const pairOk = await assertEcosystemPair(ecosystem.vendorCompanyId, firmCompanyId);
  if (!pairOk) return null;

  const vendorCompanyId = ecosystem.vendorCompanyId;
  const vendorCompanyName = ecosystem.VendorCompany.name;
  const scopedFirmIds = ecosystem.EcosystemFirm.map((entry) => entry.firmCompanyId);
  const peerFirmIds = scopedFirmIds.filter((id) => id !== firmCompanyId);

  // Fan-out. The four aggregators named by the Day-16 prompt + the 5th
  // (getAdminBriefingCatalog over the ecosystem's firms) needed for the
  // Jones-effect peer callout. Per-peer module fetches happen in parallel
  // batches inside Promise.all; at demo-bench scale (~14 firms max) this
  // is well within the e2e timeout budget.
  const [
    focalModules,
    firmProductCatalog,
    vendorCatalog,
    briefingForFirm,
    catalog,
    peerModulesEntries,
  ] = await Promise.all([
    getFirmAssessmentProgress(firmCompanyId),
    getFirmProductCatalog(firmCompanyId),
    getVendorProductInsightCatalog(vendorCompanyId) as Promise<VendorProductInsightSnapshot[]>,
    getAdminCompanyBriefing(firmCompanyId),
    scopedFirmIds.length > 0
      ? getAdminBriefingCatalog({ companyIds: scopedFirmIds })
      : Promise.resolve<BriefingCatalogItem[]>([]),
    Promise.all(
      peerFirmIds.map(async (peerId) => {
        const modules = await getFirmAssessmentProgress(peerId);
        return [peerId, modules] as const;
      })
    ),
  ]);

  const peerFirmModulesByFirmId = new Map(peerModulesEntries);
  const focalSummary: FirmAlignmentProgressSummary = summarizeFirmAlignmentProgress(focalModules);
  const focalCatalogEntry = catalog.find((entry) => entry.companyId === firmCompanyId) ?? null;

  // Peer-average overall alignment, excluding focal firm.
  const peerScores = catalog
    .filter((entry) => entry.companyId !== firmCompanyId && entry.canonicalFirmScore !== null)
    .map((entry) => entry.canonicalFirmScore as number);
  const ecosystemAverageScore =
    peerScores.length > 0
      ? Math.round(peerScores.reduce((sum, value) => sum + value, 0) / peerScores.length)
      : null;

  const fiveModuleRadar = buildFiveModuleRadar({
    focalFirmModules: focalModules,
    peerFirmModulesByFirmId,
  });

  const stackFitAnalysis = buildStackFitAnalysis({
    firmProductCatalog,
    vendorCatalog,
    briefingForFirm,
  });

  const sixQuarterRoadmap = buildSixQuarterRoadmap({
    briefingForFirm,
    stackFit: stackFitAnalysis,
    modules: focalModules,
    radar: fiveModuleRadar,
    canonicalFirmScore: focalCatalogEntry?.canonicalFirmScore ?? null,
  });

  const aboveModules = fiveModuleRadar
    .filter((axis) => axis.delta !== null && axis.delta >= 6)
    .map((axis) => ({ moduleTitle: axis.moduleTitle, delta: axis.delta as number }));
  const belowModules = fiveModuleRadar
    .filter((axis) => axis.delta !== null && axis.delta <= -6)
    .map((axis) => ({ moduleTitle: axis.moduleTitle, delta: axis.delta as number }));

  const headlinePattern =
    focalCatalogEntry?.canonicalFirmScore !== null && focalCatalogEntry?.canonicalFirmScore !== undefined && ecosystemAverageScore !== null
      ? HEADLINE_PATTERNS.find((p) => p.key === "compare-against-peers")!
      : HEADLINE_PATTERNS.find((p) => p.key === "scope-only")!;
  const headline = headlinePattern.template({
    firmCompanyName: focalCatalogEntry?.companyName ?? firmCompanyId,
    canonicalFirmScore: focalCatalogEntry?.canonicalFirmScore ?? null,
    ecosystemAverageScore,
    peerFirmCount: peerFirmIds.length,
  });

  const peerLines = PEER_LINE_PATTERNS.map((pattern) =>
    pattern.render({ aboveModules, belowModules })
  ).filter((line): line is string => line !== null);

  const confidenceCallout = renderConfidenceCallout({
    modulesCompletedCount: focalSummary.completedModules,
    modulesTotalCount: focalSummary.totalModules,
    questionsAnsweredCount: focalSummary.answeredQuestions,
    questionsTotalCount: focalSummary.totalQuestions,
  });

  const firmAlignmentHeader: FirmBriefAlignmentHeader = {
    firmCompanyId,
    firmCompanyName: focalCatalogEntry?.companyName ?? firmCompanyId,
    canonicalFirmScore: focalCatalogEntry?.canonicalFirmScore ?? null,
    confidenceLabel: focalCatalogEntry?.confidenceLabel ?? "No current-state signal",
    modulesCompletedCount: focalSummary.completedModules,
    modulesTotalCount: focalSummary.totalModules,
    questionsAnsweredCount: focalSummary.answeredQuestions,
    questionsTotalCount: focalSummary.totalQuestions,
    latestActivityAt: focalCatalogEntry?.latestUpdatedAt
      ? focalCatalogEntry.latestUpdatedAt.toISOString()
      : null,
    headline,
    confidenceCallout,
    peerLines,
  };

  const productReviewCount = firmProductCatalog.filter(
    (product) => product.latestFirmReviewSubmittedAt !== null
  ).length;

  const methodology: FirmBriefMethodology = {
    dataSources: [
      "lib/firmPat.ts:getFirmAssessmentProgress",
      "lib/firmPat.ts:summarizeFirmAlignmentProgress",
      "lib/firmPat.ts:getFirmProductCatalog",
      "lib/vendorProductInsightEngine.ts:getVendorProductInsightCatalog",
      "lib/adminBriefingEngine.ts:getAdminCompanyBriefing",
      "lib/adminBriefingEngine.ts:getAdminBriefingCatalog",
    ],
    sampleSizes: {
      moduleSubmissionCount: focalSummary.answeredQuestions,
      productReviewCount,
      peerFirmCount: peerFirmIds.length,
    },
  };

  return {
    briefId: `firm-${firmCompanyId}`,
    ecosystemId: ecosystem.id,
    ecosystemName: ecosystem.name,
    vendorCompanyId,
    vendorCompanyName,
    firmCompanyId,
    firmCompanyName: focalCatalogEntry?.companyName ?? firmCompanyId,
    generatedAt: new Date().toISOString(),
    firmAlignmentHeader,
    fiveModuleRadar,
    stackFitAnalysis,
    sixQuarterRoadmap,
    methodology,
  };
}
