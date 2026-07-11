import prisma from "@/lib/prisma";
import { normalizeQuestionRuntime, type NormalizedAnswer } from "@/lib/assessmentRuntime";
import { FIRM_CAPABILITY_DEFINITIONS } from "@/lib/firmCapabilities";
import { FIRM_MODULE_DEFINITIONS, FIRM_MODULE_QUESTION_STEMS } from "@/lib/firmPat";
import { getVendorScopedFirms } from "@/lib/tenancy";
import { CUSTOMER_FACING_BOUNDARIES } from "@/lib/dataBoundary";
import { confidenceBandForSampleSize } from "@/lib/confidenceBands";
import {
  evaluateBenchmarkSuppressionByCount,
  type BenchmarkSuppression,
} from "@/lib/benchmarkSuppression";
import { VENDOR_ELITE_V2_META } from "@/lib/eliteInsightsV2";
import {
  ELITE_PLACEHOLDER_CTA,
  ELITE_PLACEHOLDER_MESSAGE,
  ELITE_PLACEHOLDER_TITLE,
  getVendorAlignmentInsightContent,
} from "@/lib/insightContent";
import {
  buildElitePlaceholderSurfaceContent,
  buildHelpSurfaceContent,
  type InsightSurfaceContent,
} from "@/lib/insightSurface";
import { recordPatDiagnostic } from "@/lib/patDiagnostics";
import { getScoreBand } from "@/lib/scoreBands";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import {
  ALIGNMENT_INSIGHT_DEFINITIONS,
} from "@/lib/vendorPat";

type InsightDefinition = (typeof ALIGNMENT_INSIGHT_DEFINITIONS)[number];
type InsightKey = InsightDefinition["key"];

type ModuleAggregate = {
  key: string;
  title: string;
  averageScore: number | null;
  sampleSize: number;
};

type CapabilityAggregate = {
  key: string;
  title: string;
  description: string | null;
  averageScore: number | null;
  sampleSize: number;
};

type QuestionClusterAggregate = {
  key: string;
  title: string;
  averageScore: number;
  questionCount: number;
  responseCount: number;
  questionStemSample: string[];
  moduleTitles: string[];
};

type VendorSignalAggregateInput = {
  sampleSize: number;
  submissionCount: number;
  moduleAggregates: ModuleAggregate[];
  capabilityAggregates: CapabilityAggregate[];
  questionClusters: QuestionClusterAggregate[];
};

export type VendorAlignmentModuleEvidence = ModuleAggregate;
export type VendorAlignmentCapabilityEvidence = CapabilityAggregate;
export type VendorAlignmentClusterEvidence = QuestionClusterAggregate;

export type VendorAlignmentInsightReport = {
  key: InsightKey;
  title: string;
  tier: 1 | 2;
  locked: boolean;
  latestUpdatedAt: Date | null;
  confidenceBand: "no_signal" | "sample_thin" | "emerging" | "grounded";
  confidenceLabel: string;
  confidenceSummary: string;
  currentStateSummary: string;
  what: string;
  why: string;
  how: string;
  exactAssessmentBasis: string;
  confidenceCaveats: string[];
  sampleSize: number;
  submissionCount: number;
  averageModuleScore: number | null;
  moduleVariance: number | null;
  contributingModules: VendorAlignmentModuleEvidence[];
  strongestModules: VendorAlignmentModuleEvidence[];
  weakestModules: VendorAlignmentModuleEvidence[];
  contributingCapabilities: VendorAlignmentCapabilityEvidence[];
  notableQuestionClusters: VendorAlignmentClusterEvidence[];
};

export type VendorAlignmentInsightBundle = {
  sampleSize: number;
  submissionCount: number;
  averageModuleScore: number | null;
  moduleVariance: number | null;
  latestUpdatedAt: Date | null;
  confidenceBand: "no_signal" | "sample_thin" | "emerging" | "grounded";
  confidenceLabel: string;
  confidenceSummary: string;
  // Minimum-n benchmark safe harbor (Governance Phase 2). This is a cross-firm
  // peer readout for a vendor; when it falls below n≥5 contributing firms (or a
  // single firm dominates) the peer benchmark is not publishable — the surface
  // shows an insufficient-peer-data state.
  benchmarkSuppression: BenchmarkSuppression;
  reports: VendorAlignmentInsightReport[];
};

export type VendorAlignmentInsightOverviewMode = "pro" | "elite" | "help";
export type VendorAlignmentInsightDetailSurfaceKey = "pro" | "elite" | "help";

export type VendorAlignmentInsightOverviewCard = {
  key: string;
  title: string;
  summary: string;
  statusLabel?: string;
  tone: "active" | "locked";
  href: string | null;
  interactive: boolean;
  supportingText: string | null;
};

export type VendorAlignmentInsightDetailSurfaceCard = {
  key: VendorAlignmentInsightDetailSurfaceKey;
  title: string;
  summary: string;
  href: string | null;
  interactive: boolean;
};

export type VendorAlignmentInsightDetailSurfaceContent = InsightSurfaceContent<VendorAlignmentInsightDetailSurfaceKey>;

const STEM_CLUSTER_DEFINITIONS = [
  {
    key: "operating-discipline",
    title: "Operating discipline and ownership",
    questionIndexes: [0, 1, 3, 13],
  },
  {
    key: "workflow-friction",
    title: "Workflow handoffs and friction",
    questionIndexes: [4, 5, 11],
  },
  {
    key: "automation-change",
    title: "Automation support and change absorption",
    questionIndexes: [6, 7, 12, 19],
  },
  {
    key: "data-integration",
    title: "Data flow, integration, and visibility",
    questionIndexes: [2, 8, 9, 15],
  },
  {
    key: "controls-risk",
    title: "Controls, resilience, and risk surfacing",
    questionIndexes: [10, 14, 16],
  },
  {
    key: "strategy-market",
    title: "Strategy and market adaptability",
    questionIndexes: [17, 18],
  },
] as const;

const STEM_CLUSTER_DEFINITIONS_RUNTIME = STEM_CLUSTER_DEFINITIONS.map((cluster) => ({
  ...cluster,
  questionIndexes: [...cluster.questionIndexes] as number[],
}));

const INSIGHT_SIGNAL_CONFIG: Record<
  InsightKey,
  {
    moduleKeys: string[];
    capabilityKeys: string[];
    clusterKeys: string[];
  }
> = {
  "operating-discipline-demand": {
    moduleKeys: [
      "firm_alignment_operating_model_v1",
      "firm_alignment_governance_v1",
      "firm_alignment_strategy_v1",
    ],
    capabilityKeys: [
      "firm_capability_operating_model_discipline",
      "firm_capability_operating_clarity",
      "firm_capability_execution_consistency",
      "firm_capability_measurement_visibility",
    ],
    clusterKeys: ["operating-discipline", "workflow-friction", "data-integration"],
  },
  "workflow-friction-pressure": {
    moduleKeys: [
      "firm_alignment_operating_model_v1",
      "firm_alignment_data_flow_v1",
      "firm_alignment_governance_v1",
    ],
    capabilityKeys: [
      "firm_capability_execution_consistency",
      "firm_capability_operating_clarity",
      "firm_capability_control_resilience",
    ],
    clusterKeys: ["workflow-friction", "operating-discipline", "controls-risk"],
  },
  "automation-receptivity": {
    moduleKeys: [
      "firm_alignment_automation_ai_v1",
      "firm_alignment_strategy_v1",
      "firm_alignment_operating_model_v1",
    ],
    capabilityKeys: [
      "firm_capability_automation_ai_readiness",
      "firm_capability_change_enablement",
      "firm_capability_strategy_change_alignment",
    ],
    clusterKeys: ["automation-change", "operating-discipline", "strategy-market"],
  },
  "integration-strain": {
    moduleKeys: [
      "firm_alignment_data_flow_v1",
      "firm_alignment_governance_v1",
      "firm_alignment_operating_model_v1",
    ],
    capabilityKeys: [
      "firm_capability_data_flow_integration",
      "firm_capability_measurement_visibility",
      "firm_capability_control_resilience",
    ],
    clusterKeys: ["data-integration", "workflow-friction", "controls-risk"],
  },
  "governance-sensitivity": {
    moduleKeys: [
      "firm_alignment_governance_v1",
      "firm_alignment_data_flow_v1",
      "firm_alignment_strategy_v1",
    ],
    capabilityKeys: [
      "firm_capability_governance_controls",
      "firm_capability_control_resilience",
      "firm_capability_strategic_alignment",
    ],
    clusterKeys: ["controls-risk", "data-integration", "strategy-market"],
  },
  "change-absorbency": {
    moduleKeys: [
      "firm_alignment_strategy_v1",
      "firm_alignment_automation_ai_v1",
      "firm_alignment_operating_model_v1",
    ],
    capabilityKeys: [
      "firm_capability_change_enablement",
      "firm_capability_strategy_change_alignment",
      "firm_capability_operating_clarity",
    ],
    clusterKeys: ["automation-change", "strategy-market", "workflow-friction"],
  },
  "uneven-maturity-variance": {
    moduleKeys: FIRM_MODULE_DEFINITIONS.map((module) => module.key),
    capabilityKeys: FIRM_CAPABILITY_DEFINITIONS.map((capability) => capability.key),
    clusterKeys: STEM_CLUSTER_DEFINITIONS_RUNTIME.map((cluster) => cluster.key),
  },
  "implementation-risk-posture": {
    moduleKeys: [
      "firm_alignment_data_flow_v1",
      "firm_alignment_governance_v1",
      "firm_alignment_strategy_v1",
      "firm_alignment_operating_model_v1",
    ],
    capabilityKeys: [
      "firm_capability_data_flow_integration",
      "firm_capability_governance_controls",
      "firm_capability_change_enablement",
      "firm_capability_control_resilience",
    ],
    clusterKeys: ["controls-risk", "workflow-friction", "data-integration", "automation-change"],
  },
  "benchmark-comparison": {
    moduleKeys: [],
    capabilityKeys: [],
    clusterKeys: [],
  },
  "forward-projection": {
    moduleKeys: [],
    capabilityKeys: [],
    clusterKeys: [],
  },
  "scenario-simulation": {
    moduleKeys: [],
    capabilityKeys: [],
    clusterKeys: [],
  },
};

export function getRequestedVendorAlignmentInsightOverviewMode(
  rawMode: string | undefined
): VendorAlignmentInsightOverviewMode {
  switch (rawMode?.trim().toLowerCase()) {
    case "elite":
      return "elite";
    case "help":
      return "help";
    case "pro":
    default:
      return "pro";
  }
}

export function getRequestedVendorAlignmentInsightDetailSurface(
  rawSurface: string | undefined
): VendorAlignmentInsightDetailSurfaceKey {
  switch (rawSurface?.trim().toLowerCase()) {
    case "pro":
      return "pro";
    case "elite":
      return "elite";
    case "help":
      return "help";
    case "basis":
    case "modules":
    case "capabilities":
    case "confidence":
      return "pro";
    default:
      return "pro";
  }
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function variance(values: number[]) {
  if (values.length < 2) {
    return null;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDiffAverage =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return round1(squaredDiffAverage);
}

function normalizeAnswerToPercent(question: ReturnType<typeof normalizeQuestionRuntime>, answer: unknown) {
  if (typeof answer !== "number" || !Number.isFinite(answer)) {
    return null;
  }

  if (question.inputType === "SLIDER" && question.validation.slider) {
    const denominator = question.validation.slider.max - question.validation.slider.min;
    if (denominator <= 0) {
      return null;
    }
    return round1(((answer - question.validation.slider.min) / denominator) * 100);
  }

  if (
    question.inputType === "NUMBER" &&
    typeof question.validation.number?.min === "number" &&
    typeof question.validation.number?.max === "number"
  ) {
    const denominator = question.validation.number.max - question.validation.number.min;
    if (denominator <= 0) {
      return null;
    }
    return round1(((answer - question.validation.number.min) / denominator) * 100);
  }

  return null;
}

function describeSampleSignal(sampleSize: number) {
  if (sampleSize === 0) {
    return "No completed firm PAT submissions are available yet.";
  }
  if (sampleSize === 1) {
    return "The current vendor readout is based on 1 assessed firm, so it remains a very thin current-state signal.";
  }
  if (sampleSize < 5) {
    return `The current vendor readout is based on ${sampleSize} assessed firms, so patterns should be treated as sample-thin rather than broad market evidence.`;
  }
  return `The current vendor readout is based on ${sampleSize} assessed firms and remains current-state PAT signal only, not benchmark or forecast intelligence.`;
}

function getConfidenceBand(sampleSize: number) {
  // CLASS 3: band boundaries come from the ONE shared definition
  // (lib/confidenceBands.ts); the copy below is alignment-engine-specific.
  const band = confidenceBandForSampleSize(sampleSize);
  if (band === "no_signal") {
    return {
      band,
      label: "No signal",
      summary:
        "No completed firm PAT submissions are available yet, so this remains a placeholder for future current-state signal.",
    };
  }
  if (band === "sample_thin") {
    if (sampleSize === 1) {
      return {
        band,
        label: "Early signal",
        summary:
          "This readout is based on one firm only and should be treated as early current-state signal rather than strong confirmation.",
      };
    }
    return {
      band,
      label: "Early signal",
      summary: `This readout is based on ${sampleSize} firms and remains sample-thin rather than broad market signal.`,
    };
  }
  if (band === "emerging") {
    return {
      band,
      label: "Early signal",
      summary: `This readout is based on ${sampleSize} firms and is useful for current-state interpretation, but still not broad enough to read as strong market intelligence.`,
    };
  }
  return {
    band: "grounded" as const,
    label: "Grounded",
    summary:
      `This readout is grounded in ${sampleSize} firms for current-state interpretation only. ` +
      "PAT is not claiming benchmark or forecast support.",
  };
}

function formatScore(score: number | null) {
  if (score === null) {
    return "--";
  }
  return `${Math.round(score)}%`;
}

function summarizeModuleSpread(
  strongestModules: VendorAlignmentModuleEvidence[],
  weakestModules: VendorAlignmentModuleEvidence[]
) {
  const strongest = strongestModules.map((module) => module.title).join(" and ") || "--";
  const weakest = weakestModules.map((module) => module.title).join(" and ") || "--";
  return { strongest, weakest };
}

function buildLockedReport(
  definition: InsightDefinition,
  snapshot: Omit<VendorAlignmentInsightBundle, "reports">
): VendorAlignmentInsightReport {
  return {
    key: definition.key,
    title: definition.title,
    tier: 2,
    locked: true,
    latestUpdatedAt: snapshot.latestUpdatedAt,
    confidenceBand: snapshot.confidenceBand,
    confidenceLabel: ELITE_PLACEHOLDER_TITLE,
    confidenceSummary: ELITE_PLACEHOLDER_MESSAGE,
    currentStateSummary: ELITE_PLACEHOLDER_MESSAGE,
    what: definition.what,
    why: definition.why,
    how: definition.how,
    exactAssessmentBasis:
      "Current vendor alignment uses current firm PAT submissions, capability scores, and answer patterns for Pro insights only. Unlock with Elite membership when the deeper benchmark, projection, and scenario layer is truly available.",
    confidenceCaveats: [describeSampleSignal(snapshot.sampleSize)],
    sampleSize: snapshot.sampleSize,
    submissionCount: snapshot.submissionCount,
    averageModuleScore: snapshot.averageModuleScore,
    moduleVariance: snapshot.moduleVariance,
    contributingModules: [],
    strongestModules: [],
    weakestModules: [],
    contributingCapabilities: [],
    notableQuestionClusters: [],
  };
}

function buildProNarrative(input: {
  definition: InsightDefinition;
  snapshot: Omit<VendorAlignmentInsightBundle, "reports">;
  modules: VendorAlignmentModuleEvidence[];
  capabilities: VendorAlignmentCapabilityEvidence[];
  clusters: VendorAlignmentClusterEvidence[];
}) {
  const scoredModules = input.modules.filter((module) => module.averageScore !== null);
  const scoredCapabilities = input.capabilities.filter(
    (capability) => capability.averageScore !== null
  );
  const strongestModules = [...scoredModules]
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0))
    .slice(0, 2);
  const weakestModules = [...scoredModules]
    .sort((left, right) => (left.averageScore ?? 0) - (right.averageScore ?? 0))
    .slice(0, 2);
  const strongestCapabilities = [...scoredCapabilities]
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0))
    .slice(0, 3);
  const notableClusters = [...input.clusters]
    .sort((left, right) => right.averageScore - left.averageScore)
    .slice(0, 3);
  const weakestCluster = [...input.clusters].sort((left, right) => left.averageScore - right.averageScore)[0];
  const { strongest, weakest } = summarizeModuleSpread(strongestModules, weakestModules);

  const basisLines = [
    `Firm sample size: ${input.snapshot.sampleSize}. Final firm submissions in basis set: ${input.snapshot.submissionCount}.`,
    `Strongest contributing modules: ${strongest}.`,
    `Weakest contributing modules: ${weakest}.`,
    strongestCapabilities.length > 0
      ? `Relevant capabilities: ${strongestCapabilities
          .map((capability) => `${capability.title} (${formatScore(capability.averageScore)})`)
          .join(", ")}.`
      : "Relevant capabilities: current company capability scores are not populated yet for this slice.",
    notableClusters.length > 0
      ? `Relevant question clusters: ${notableClusters
          .map((cluster) => `${cluster.title} (${formatScore(cluster.averageScore)})`)
          .join(", ")}.`
      : "Relevant question clusters: not enough stored answer signal exists yet to separate the clusters cleanly.",
  ];

  const confidenceCaveats = [describeSampleSignal(input.snapshot.sampleSize)];
  if (input.snapshot.moduleVariance !== null) {
    confidenceCaveats.push(
      `Cross-module variance is ${round1(input.snapshot.moduleVariance)} points across the current module means, so unevenness should be treated as part of the vendor reading.`
    );
  }
  if (scoredCapabilities.length === 0) {
    confidenceCaveats.push(
      "Capability-score coverage is currently missing, so this view leans more heavily on module scores and stored answer patterns."
    );
  }
  if (input.clusters.length < 2) {
    confidenceCaveats.push(
      "Question-cluster coverage is thin, so this insight remains broader than a section-by-section operating readout."
    );
  }

  return {
    strongestModules,
    weakestModules,
    contributingCapabilities: strongestCapabilities,
    notableQuestionClusters: notableClusters,
    confidenceCaveats,
    currentStateSummary:
      scoredModules.length === 0
        ? `${input.definition.title} has no completed firm PAT evidence yet.`
        : `${input.definition.title} shows the current firm-alignment picture, with the strongest support in ${strongest} and the most pressure in ${weakest}.`,
    what:
      scoredModules.length === 0
        ? "This vendor alignment insight becomes evidence-backed after enough firm PAT submissions exist."
        : `${input.definition.what} Current strongest support comes from ${strongest}.`,
    why:
      weakestCluster
        ? `${input.definition.why} The weakest current cluster is ${weakestCluster.title.toLowerCase()}, which is where vendor messaging, onboarding design, or implementation posture is most likely to meet resistance.`
        : input.definition.why,
    how:
      scoredModules.length === 0
        ? "Wait for real firm PAT coverage before treating this as a working market signal."
        : `${input.definition.how} Use ${strongest} as the stable starting point, and treat ${weakest} as the current operational constraint to plan around first.`,
    exactAssessmentBasis: basisLines.join(" "),
  };
}

export function buildVendorAlignmentInsightBundle(
  input: VendorSignalAggregateInput
): VendorAlignmentInsightBundle {
  const averageModuleScore = average(
    input.moduleAggregates.flatMap((module) =>
      typeof module.averageScore === "number" ? [module.averageScore] : []
    )
  );
  const moduleVariance = variance(
    input.moduleAggregates.flatMap((module) =>
      typeof module.averageScore === "number" ? [module.averageScore] : []
    )
  );
  const snapshot = {
    sampleSize: input.sampleSize,
    submissionCount: input.submissionCount,
    averageModuleScore,
    moduleVariance,
    latestUpdatedAt: null,
    confidenceBand: getConfidenceBand(input.sampleSize).band,
    confidenceLabel: getConfidenceBand(input.sampleSize).label,
    confidenceSummary: getConfidenceBand(input.sampleSize).summary,
    benchmarkSuppression: evaluateBenchmarkSuppressionByCount(input.sampleSize),
  };

  const reports: VendorAlignmentInsightReport[] = ALIGNMENT_INSIGHT_DEFINITIONS.map((definition) => {
    if (definition.tier === 2) {
      return buildLockedReport(definition, snapshot);
    }

    const config = INSIGHT_SIGNAL_CONFIG[definition.key];
    const modules = config.moduleKeys
      .map((moduleKey) => input.moduleAggregates.find((module) => module.key === moduleKey))
      .filter((module): module is VendorAlignmentModuleEvidence => Boolean(module));
    const capabilities = config.capabilityKeys
      .map((capabilityKey) =>
        input.capabilityAggregates.find((capability) => capability.key === capabilityKey)
      )
      .filter((capability): capability is VendorAlignmentCapabilityEvidence => Boolean(capability));
    const clusters = config.clusterKeys
      .map((clusterKey) => input.questionClusters.find((cluster) => cluster.key === clusterKey))
      .filter((cluster): cluster is VendorAlignmentClusterEvidence => Boolean(cluster));
    const narrative = buildProNarrative({
      definition,
      snapshot,
      modules,
      capabilities,
      clusters,
    });

    return {
      key: definition.key,
      title: definition.title,
      tier: 1,
      locked: false,
      latestUpdatedAt: snapshot.latestUpdatedAt,
      confidenceBand: snapshot.confidenceBand,
      confidenceLabel: snapshot.confidenceLabel,
      confidenceSummary: snapshot.confidenceSummary,
      currentStateSummary: narrative.currentStateSummary,
      what: narrative.what,
      why: narrative.why,
      how: narrative.how,
      exactAssessmentBasis: narrative.exactAssessmentBasis,
      confidenceCaveats: narrative.confidenceCaveats,
      sampleSize: snapshot.sampleSize,
      submissionCount: snapshot.submissionCount,
      averageModuleScore,
      moduleVariance,
      contributingModules: modules,
      strongestModules: narrative.strongestModules,
      weakestModules: narrative.weakestModules,
      contributingCapabilities: narrative.contributingCapabilities,
      notableQuestionClusters: narrative.notableQuestionClusters,
    };
  });

  const bundle = {
    ...snapshot,
    reports,
  };

  recordPatDiagnostic({
    area: "vendor_alignment",
    level: input.sampleSize < 5 ? "warn" : "info",
    status: input.sampleSize < 5 ? "warn" : "ok",
    summary: "Vendor alignment insight bundle generated.",
    details: {
      sampleSize: input.sampleSize,
      submissionCount: input.submissionCount,
      proReportCount: reports.filter((report) => report.tier === 1).length,
      capabilityAggregateCount: input.capabilityAggregates.filter(
        (capability) => capability.averageScore !== null
      ).length,
      lowSample: input.sampleSize < 5,
    },
  });

  return bundle;
}

export type VendorAlignmentPlainLanguage = {
  summary: string;
};

/** What each maturity band of aggregated firm signal generally means for a
 * vendor selling into those firms — general, current-state framing only. */
const VENDOR_BAND_CLAUSE: Record<ReturnType<typeof getScoreBand>["key"], string> = {
  early:
    "expect buyers to need heavy implementation support and a simple first step, because their operating foundations are just being established",
  developing:
    "expect buyers to need more implementation support than the product pitch assumes, because their operating foundations are still forming",
  building:
    "buyers can absorb new tooling, but rollouts still depend on individual champions rather than settled process",
  established:
    "buyers generally have the operating discipline to evaluate structured tooling and put it to work",
  leading:
    "buyers are operating cleanly enough to evaluate tooling quickly — and to notice gaps in it just as quickly",
};

/** Vendor-voiced positioning consequence of the softest firm-side module. */
const VENDOR_MODULE_CLAUSE: Record<string, string> = {
  firm_alignment_data_flow_v1:
    "onboarding plans should assume longer connection work and more data cleanup than a demo environment shows",
  firm_alignment_operating_model_v1:
    "rollout plans should name owners and review steps explicitly, because the firms will not supply that structure themselves",
  firm_alignment_automation_ai_v1:
    "automation features should ship with oversight defaults, because the firms are not yet set up to supervise automated steps on their own",
  firm_alignment_governance_v1:
    "expect security and vendor-risk reviews to run slowly and unevenly, so evidence packs shorten the path more than feature demos do",
  firm_alignment_strategy_v1:
    "adoption will compete with shifting priorities inside the firms, so smaller phased rollouts tend to survive better than big-bang launches",
};

/**
 * Zero-context "What this means for your positioning" copy for the vendor
 * alignment detail pages. Current-state evidence only — no benchmark,
 * percentile, peer-comparison, projection, or forecast claims.
 */
export function buildVendorAlignmentPlainLanguage(
  report: VendorAlignmentInsightReport
): VendorAlignmentPlainLanguage | null {
  if (report.locked || report.averageModuleScore === null) {
    return null;
  }

  const band = getScoreBand(report.averageModuleScore);
  const strongest = report.strongestModules[0];
  const weakest = report.weakestModules[0];
  const sentences = [
    `Firms in your current evidence base average ${Math.round(report.averageModuleScore)} — ${band.label} — on the modules behind this view.`,
  ];

  if (strongest && weakest && typeof weakest.averageScore === "number") {
    if (strongest.key === weakest.key) {
      sentences.push(`All current firm-side signal comes from ${strongest.title}.`);
    } else {
      sentences.push(
        `The strongest firm-side signal is ${strongest.title}; the softest is ${weakest.title} at ${Math.round(weakest.averageScore)}%.`
      );
    }
  }

  sentences.push(`In practical terms, ${VENDOR_BAND_CLAUSE[band.key]}.`);

  if (weakest) {
    const moduleClause =
      VENDOR_MODULE_CLAUSE[weakest.key] ??
      "plan for the softest firm-side area to slow adoption until the firms strengthen it";
    sentences.push(`Because ${weakest.title} is the soft spot, ${moduleClause}.`);
  }

  sentences.push(
    `This stays current-state evidence from ${report.submissionCount} module submission${report.submissionCount === 1 ? "" : "s"} across the firms PAT can see for you; more submissions firm the picture up.`
  );

  return { summary: sentences.join(" ") };
}

export function buildVendorAlignmentProInsightCards(
  bundle: VendorAlignmentInsightBundle
): VendorAlignmentInsightOverviewCard[] {
  return bundle.reports
    .filter((report) => report.tier === 1)
    .map(
      (report) =>
        ({
          key: report.key,
          title: report.title,
          summary: report.currentStateSummary,
          tone: "active",
          href: `/vendor/alignment-insights/${report.key}`,
          interactive: true,
          supportingText: report.strongestModules.length
            ? `Strongest support: ${report.strongestModules.map((module) => module.title).join(", ")}.`
            : report.notableQuestionClusters.length
              ? `Most visible pattern: ${report.notableQuestionClusters[0]?.title ?? "Current operating evidence"}.`
              : "Current firm evidence is still taking shape.",
        }) satisfies VendorAlignmentInsightOverviewCard
    );
}

export function buildVendorAlignmentEliteInsightCards(
  bundle: VendorAlignmentInsightBundle,
  { elite = false }: { elite?: boolean } = {}
) {
  return bundle.reports
    .filter((report) => report.tier === 2)
    .map((report) => {
      const content = getVendorAlignmentInsightContent(report.key);

      // Elite Insights v1 (Block 3): live + interactive for Elite members; the
      // locked "Coming soon" state is preserved for Pro-only members.
      if (elite) {
        const meta = VENDOR_ELITE_V2_META[report.key];
        return {
          key: report.key,
          title: meta?.title ?? report.title,
          summary: meta?.description ?? report.currentStateSummary,
          statusLabel: "Elite",
          tone: "active",
          href: `/vendor/alignment-insights/${report.key}?surface=elite`,
          interactive: true,
          supportingText: null,
        } satisfies VendorAlignmentInsightOverviewCard;
      }

      return {
        key: report.key,
        title: report.title,
        summary: content?.lockedState?.summary ?? report.currentStateSummary,
        statusLabel: ELITE_PLACEHOLDER_TITLE,
        tone: "locked",
        href: null,
        interactive: false,
        supportingText: content?.lockedState?.disclaimer ?? ELITE_PLACEHOLDER_CTA,
      } satisfies VendorAlignmentInsightOverviewCard;
    });
}

export function buildVendorAlignmentInsightDetailSurfaceCards(input: {
  report: VendorAlignmentInsightReport;
}) {
  const content = getVendorAlignmentInsightContent(input.report.key);
  const lockedState = content?.lockedState;
  const baseHref = `/vendor/alignment-insights/${input.report.key}`;
  return [
    {
      key: "pro",
      title: "Pro",
      summary: input.report.currentStateSummary,
      href: `${baseHref}?surface=pro`,
      interactive: true,
    },
    {
      key: "elite",
      title: "Elite",
      summary: input.report.locked
        ? lockedState?.summary ?? ELITE_PLACEHOLDER_MESSAGE
        : ELITE_PLACEHOLDER_MESSAGE,
      href: `${baseHref}?surface=elite`,
      interactive: true,
    },
    {
      key: "help",
      title: "Help",
      summary: input.report.locked
        ? lockedState?.summary ?? input.report.currentStateSummary
        : input.report.currentStateSummary,
      href: `${baseHref}?surface=help`,
      interactive: true,
    },
  ] satisfies VendorAlignmentInsightDetailSurfaceCard[];
}

function summarizeAlignmentStrengths(report: VendorAlignmentInsightReport) {
  if (!report.strongestModules.length && !report.contributingCapabilities.length) {
    return "Insufficient current firm PAT evidence: PAT does not have enough grounded module or capability evidence yet to separate the strongest supports cleanly.";
  }

  const moduleText = report.strongestModules.length
    ? `Strongest contributing modules right now: ${report.strongestModules
        .map((module) => `${module.title} (${formatScore(module.averageScore)})`)
        .join(", ")}.`
    : "";
  const capabilityText = report.contributingCapabilities.length
    ? `Most relevant supporting capabilities: ${report.contributingCapabilities
        .map((capability) => `${capability.title} (${formatScore(capability.averageScore)})`)
        .join(", ")}.`
    : "";

  return [moduleText, capabilityText].filter(Boolean).join(" ");
}

function summarizeAlignmentPressure(report: VendorAlignmentInsightReport) {
  if (!report.weakestModules.length && !report.notableQuestionClusters.length) {
    return "Insufficient current firm PAT evidence: PAT does not have enough grounded module or question-pattern evidence yet to separate the pressure points cleanly.";
  }

  const moduleText = report.weakestModules.length
    ? `Current pressure is showing most clearly in ${report.weakestModules
        .map((module) => `${module.title} (${formatScore(module.averageScore)})`)
        .join(", ")}.`
    : "";
  const clusterText = report.notableQuestionClusters.length
    ? `The most visible operating patterns in this readout are ${report.notableQuestionClusters
        .map((cluster) => `${cluster.title} (${formatScore(cluster.averageScore)})`)
        .join(", ")}.`
    : "";

  return [moduleText, clusterText].filter(Boolean).join(" ");
}

function summarizeAlignmentLimits(report: VendorAlignmentInsightReport) {
  return [report.confidenceSummary, ...report.confidenceCaveats.slice(0, 2)]
    .filter(Boolean)
    .join(" ");
}

function buildAlignmentEvidenceProvenanceItem(report: VendorAlignmentInsightReport) {
  const latestUpdatedAt = report.latestUpdatedAt ? report.latestUpdatedAt.toISOString() : "not available";
  const moduleEvidence =
    report.contributingModules.length > 0
      ? report.contributingModules
          .map((module) => `${module.title} (${formatScore(module.averageScore)}, sample ${module.sampleSize})`)
          .join(", ")
      : "insufficient module-pattern evidence for this insight";
  const capabilityEvidence =
    report.contributingCapabilities.length > 0
      ? report.contributingCapabilities
          .map((capability) => `${capability.title} (${formatScore(capability.averageScore)}, sample ${capability.sampleSize})`)
          .join(", ")
      : "insufficient capability evidence for this insight";
  const clusterEvidence =
    report.notableQuestionClusters.length > 0
      ? report.notableQuestionClusters
          .map((cluster) => `${cluster.title} (${formatScore(cluster.averageScore)}, ${cluster.responseCount} responses)`)
          .join(", ")
      : "insufficient answer-cluster evidence for this insight";

  return {
    title: "Evidence provenance",
    body: [
      `Firm PAT source: ${report.sampleSize} assessed firm${report.sampleSize === 1 ? "" : "s"} and ${report.submissionCount} final firm module submission${report.submissionCount === 1 ? "" : "s"}; latest update ${latestUpdatedAt}.`,
      `Module patterns: ${moduleEvidence}.`,
      `Capability evidence: ${capabilityEvidence}.`,
      `Question-cluster evidence: ${clusterEvidence}.`,
      "PAT uses only current firm PAT signal, module patterns, capability scores, and stored answer clusters for this detail page; it is not claiming benchmark, projection, scenario, customer, or market-wide proof.",
    ].join(" "),
  };
}

export function buildVendorAlignmentInsightDetailSurfaceContent(input: {
  report: VendorAlignmentInsightReport;
  surface: VendorAlignmentInsightDetailSurfaceKey;
}) {
  const content = getVendorAlignmentInsightContent(input.report.key);
  const lockedState = content?.lockedState;

  switch (input.surface) {
    case "pro":
      return {
        key: "pro",
        title: "Pro",
        intro: input.report.locked
          ? "This locked Elite insight has no live Pro readout. PAT only shows the current evidence boundary while the deeper Elite layer remains muted and unavailable."
          : "PAT keeps the Pro surface focused on the grounded evidence behind this current vendor alignment readout.",
        items: [
          {
            title: "Current PAT picture",
            body:
              `${input.report.currentStateSummary} ` +
              `The current relevant module average is ${formatScore(input.report.averageModuleScore)}, ` +
              `with cross-module variance ${
                input.report.moduleVariance === null ? "not yet separated cleanly" : `of ${round1(input.report.moduleVariance)} points`
              }.`,
          },
          buildAlignmentEvidenceProvenanceItem(input.report),
          {
            title: "Where the signal is strongest",
            body: summarizeAlignmentStrengths(input.report),
          },
          {
            title: "Where the signal is under pressure",
            body: summarizeAlignmentPressure(input.report),
          },
          {
            title: "Current limits",
            body: summarizeAlignmentLimits(input.report),
          },
        ],
      } satisfies VendorAlignmentInsightDetailSurfaceContent;
    case "elite":
      {
      const eliteSurface = buildElitePlaceholderSurfaceContent<VendorAlignmentInsightDetailSurfaceKey>({
        key: "elite",
        intro: input.report.locked
          ? `This is not a live Elite interpretation. ${lockedState?.summary ?? ELITE_PLACEHOLDER_MESSAGE}`
          : ELITE_PLACEHOLDER_MESSAGE,
        what: input.report.locked
          ? lockedState?.what ?? content?.what ?? ELITE_PLACEHOLDER_TITLE
          : "A deeper PAT interpretation layer reserved for benchmark, projection, and scenario work that is not yet live in this route.",
        why: input.report.locked
          ? lockedState?.why ?? content?.why ?? ELITE_PLACEHOLDER_CTA
          : "The deeper comparative and forward-looking layer should stay unavailable until PAT can support it honestly.",
        how: input.report.locked
          ? lockedState?.how ?? content?.how ?? ELITE_PLACEHOLDER_CTA
          : `${ELITE_PLACEHOLDER_TITLE}. ${ELITE_PLACEHOLDER_CTA}.`,
      });
      return {
        ...eliteSurface,
        items: [
          ...eliteSurface.items,
          {
            title: "Locked Elite boundary",
            body: `${lockedState?.basis ?? "Elite evidence is not available in the current PAT product."} The page is muted because this Elite layer is not live; PAT is not claiming benchmark, projection, scenario, customer, or market-wide proof here.`,
          },
        ],
      } satisfies VendorAlignmentInsightDetailSurfaceContent;
    }
    case "help":
      {
      const helpSurface = buildHelpSurfaceContent<VendorAlignmentInsightDetailSurfaceKey>({
        key: "help",
        intro: input.report.locked
          ? lockedState?.summary ?? input.report.currentStateSummary
          : input.report.currentStateSummary,
        what: input.report.locked ? lockedState?.what ?? input.report.what : input.report.what,
        why: input.report.locked ? lockedState?.why ?? input.report.why : input.report.why,
        how: input.report.locked ? lockedState?.how ?? input.report.how : input.report.how,
      });
      return {
        ...helpSurface,
        items: input.report.locked
          ? [
              ...helpSurface.items,
              {
                title: "Locked Elite boundary",
                body: `${lockedState?.basis ?? "Elite evidence is not available in the current PAT product."} This page is muted because the Elite insight is not live; use the Pro surface only for the current evidence boundary.`,
              },
            ]
          : [...helpSurface.items, buildAlignmentEvidenceProvenanceItem(input.report)],
      } satisfies VendorAlignmentInsightDetailSurfaceContent;
    }
    default:
      return {
        key: "pro",
        title: "Pro",
        intro: input.report.locked
          ? "This locked Elite insight has no live Pro readout. PAT only shows the current evidence boundary while the deeper Elite layer remains muted and unavailable."
          : "PAT keeps the Pro surface focused on the grounded evidence behind this current vendor alignment readout.",
        items: [
          {
            title: "Current PAT picture",
            body:
              `${input.report.currentStateSummary} ` +
              `The current relevant module average is ${formatScore(input.report.averageModuleScore)}, ` +
              `with cross-module variance ${
                input.report.moduleVariance === null ? "not yet separated cleanly" : `of ${round1(input.report.moduleVariance)} points`
              }.`,
          },
          buildAlignmentEvidenceProvenanceItem(input.report),
          {
            title: "Where the signal is strongest",
            body: summarizeAlignmentStrengths(input.report),
          },
          {
            title: "Where the signal is under pressure",
            body: summarizeAlignmentPressure(input.report),
          },
          {
            title: "Current limits",
            body: summarizeAlignmentLimits(input.report),
          },
        ],
      } satisfies VendorAlignmentInsightDetailSurfaceContent;
  }
}

export async function getVendorAlignmentInsightBundle(input?: {
  vendorCompanyId?: string | null;
}) {
  const moduleDefinitionsByKey = new Map<string, (typeof FIRM_MODULE_DEFINITIONS)[number]>(
    FIRM_MODULE_DEFINITIONS.map((definition) => [definition.key, definition])
  );
  const capabilityDefinitionsByKey = new Map(
    FIRM_CAPABILITY_DEFINITIONS.map((definition) => [definition.key, definition])
  );
  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((module) => module.key);
  const capabilityKeys = FIRM_CAPABILITY_DEFINITIONS.map((capability) => capability.key);

  // Phase 1 / Day-10 tenancy: when invoked with a vendor companyId, restrict
  // firm submissions + capability scores to the vendor's ecosystem firms
  // (per Q6 walled-tenancy). When invoked without a vendorCompanyId
  // (admin/global aggregations), behavior is unchanged.
  const vendorCompanyId = input?.vendorCompanyId ?? null;
  const scopedFirmIds = vendorCompanyId
    ? await getVendorScopedFirms(vendorCompanyId)
    : null;
  // Data-integrity wall (CLASS 1): scoped path is already boundary-filtered by
  // getVendorScopedFirms; the unscoped (admin/global) path pools REAL+PILOT only
  // so demo firms never inflate a cross-firm module/capability average.
  const firmCompanyFilter = scopedFirmIds
    ? { type: "FIRM" as const, id: { in: scopedFirmIds } }
    : { type: "FIRM" as const, dataBoundary: { in: [...CUSTOMER_FACING_BOUNDARIES] } };

  const [modules, submissions, capabilityNodes, capabilityScores] = await Promise.all([
    prisma.surveyModule.findMany({
      where: { key: { in: moduleKeys } },
      select: {
        id: true,
        key: true,
        title: true,
        SurveyQuestion: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            key: true,
            prompt: true,
            inputType: true,
            weight: true,
            order: true,
            required: true,
            meta: true,
          },
        },
      },
    }),
    prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        SurveyModule: { key: { in: moduleKeys } },
        Company: firmCompanyFilter,
      }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyId: true,
        moduleId: true,
        score: true,
        answers: true,
        createdAt: true,
      },
    }),
    prisma.capabilityNode.findMany({
      where: { key: { in: capabilityKeys } },
      select: { id: true, key: true, title: true, description: true },
    }),
    prisma.companyCapabilityScore.findMany({
      where: {
        Company: firmCompanyFilter,
      },
      select: {
        companyId: true,
        nodeId: true,
        score: true,
        computedAt: true,
      },
      orderBy: { computedAt: "desc" },
    }).catch((error) => {
      recordPatDiagnostic({
        area: "db_compat",
        level: "warn",
        status: "compat",
        summary: "Vendor alignment fell back without company capability scores.",
        details: {
          error: error instanceof Error ? error.message.slice(0, 180) : "Unknown error",
        },
      });
      return [];
    }),
  ]);

  const latestSubmissionByCompanyModule = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    const compositeKey = `${submission.companyId}:${submission.moduleId}`;
    if (!latestSubmissionByCompanyModule.has(compositeKey)) {
      latestSubmissionByCompanyModule.set(compositeKey, submission);
    }
  }

  const latestCapabilityScoreByCompanyNode = new Map<string, (typeof capabilityScores)[number]>();
  for (const score of capabilityScores) {
    const compositeKey = `${score.companyId}:${score.nodeId}`;
    if (!latestCapabilityScoreByCompanyNode.has(compositeKey)) {
      latestCapabilityScoreByCompanyNode.set(compositeKey, score);
    }
  }

  const moduleScoreValues = new Map<string, number[]>();
  const clusterScoreValues = new Map<string, number[]>();
  const clusterModuleTitles = new Map<string, Set<string>>();

  for (const definition of STEM_CLUSTER_DEFINITIONS_RUNTIME) {
    clusterScoreValues.set(definition.key, []);
    clusterModuleTitles.set(definition.key, new Set());
  }

  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const scoredCompanyIds = new Set<string>();

  for (const submission of latestSubmissionByCompanyModule.values()) {
    scoredCompanyIds.add(submission.companyId);
    const surveyModule = moduleById.get(submission.moduleId);
    if (!surveyModule) {
      continue;
    }

    const definition = moduleDefinitionsByKey.get(surveyModule.key);
    if (!definition) {
      continue;
    }

    const existingModuleScores = moduleScoreValues.get(surveyModule.key) ?? [];
    existingModuleScores.push(submission.score);
    moduleScoreValues.set(surveyModule.key, existingModuleScores);

    const answers =
      submission.answers && typeof submission.answers === "object"
        ? (submission.answers as Record<string, NormalizedAnswer>)
        : {};

    for (const question of surveyModule.SurveyQuestion.map((entry) => normalizeQuestionRuntime(entry))) {
      const normalizedScore = normalizeAnswerToPercent(question, answers[question.id]);
      if (normalizedScore === null) {
        continue;
      }

      const stemMatch = question.key.match(/_q(\d+)$/);
      const stemIndex = stemMatch ? Number.parseInt(stemMatch[1], 10) - 1 : -1;
      const cluster = STEM_CLUSTER_DEFINITIONS_RUNTIME.find((entry) =>
        entry.questionIndexes.includes(stemIndex)
      );
      if (!cluster) {
        continue;
      }

      const clusterScores = clusterScoreValues.get(cluster.key) ?? [];
      clusterScores.push(normalizedScore);
      clusterScoreValues.set(cluster.key, clusterScores);
      clusterModuleTitles.get(cluster.key)?.add(definition.title);
    }
  }

  const capabilityNodeById = new Map(capabilityNodes.map((node) => [node.id, node]));
  const capabilityScoreValues = new Map<string, number[]>();
  for (const score of latestCapabilityScoreByCompanyNode.values()) {
    const node = capabilityNodeById.get(score.nodeId);
    if (!node) {
      continue;
    }
    const existingValues = capabilityScoreValues.get(node.key) ?? [];
    existingValues.push(score.score);
    capabilityScoreValues.set(node.key, existingValues);
  }

  const moduleAggregates: ModuleAggregate[] = FIRM_MODULE_DEFINITIONS.map((module) => {
    const scores = moduleScoreValues.get(module.key) ?? [];
    return {
      key: module.key,
      title: module.title,
      averageScore: average(scores),
      sampleSize: scores.length,
    };
  });

  const capabilityAggregates: CapabilityAggregate[] = FIRM_CAPABILITY_DEFINITIONS.map((capability) => {
    const scores = capabilityScoreValues.get(capability.key) ?? [];
    return {
      key: capability.key,
      title: capability.title,
      description: capabilityDefinitionsByKey.get(capability.key)?.description ?? null,
      averageScore: average(scores),
      sampleSize: scores.length,
    };
  });

  const questionClusters: QuestionClusterAggregate[] = STEM_CLUSTER_DEFINITIONS_RUNTIME.map((cluster) => {
    const scores = clusterScoreValues.get(cluster.key) ?? [];
    return {
      key: cluster.key,
      title: cluster.title,
      averageScore: average(scores) ?? 0,
      questionCount: cluster.questionIndexes.length,
      responseCount: scores.length,
      questionStemSample: cluster.questionIndexes.map((index) => FIRM_MODULE_QUESTION_STEMS[index] ?? "--"),
      moduleTitles: Array.from(clusterModuleTitles.get(cluster.key) ?? []),
    };
  }).filter((cluster) => cluster.responseCount > 0);

  const latestUpdatedAt = Array.from(latestSubmissionByCompanyModule.values())
    .map((submission) => submission.createdAt)
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

  const bundle = buildVendorAlignmentInsightBundle({
    sampleSize: scoredCompanyIds.size,
    submissionCount: latestSubmissionByCompanyModule.size,
    moduleAggregates,
    capabilityAggregates,
    questionClusters,
  });

  const confidence = getConfidenceBand(bundle.sampleSize);

  return {
    ...bundle,
    latestUpdatedAt,
    confidenceBand: confidence.band,
    confidenceLabel: confidence.label,
    confidenceSummary: confidence.summary,
    reports: bundle.reports.map((report) => ({
      ...report,
      latestUpdatedAt,
      confidenceBand: report.locked ? report.confidenceBand : confidence.band,
      confidenceLabel: report.locked ? report.confidenceLabel : confidence.label,
      confidenceSummary: report.locked ? report.confidenceSummary : confidence.summary,
    })),
  };
}
