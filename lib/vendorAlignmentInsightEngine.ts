import prisma from "@/lib/prisma";
import { normalizeQuestionRuntime, type NormalizedAnswer } from "@/lib/assessmentRuntime";
import { FIRM_CAPABILITY_DEFINITIONS } from "@/lib/firmCapabilities";
import { FIRM_MODULE_DEFINITIONS, FIRM_MODULE_QUESTION_STEMS } from "@/lib/firmPat";
import { recordPatDiagnostic } from "@/lib/patDiagnostics";
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
  confidenceBand: "no_signal" | "directional" | "emerging" | "grounded";
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
  confidenceBand: "no_signal" | "directional" | "emerging" | "grounded";
  confidenceLabel: string;
  confidenceSummary: string;
  reports: VendorAlignmentInsightReport[];
};

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
    return "The current vendor readout is based on 1 assessed firm, so it remains a very thin directional signal.";
  }
  if (sampleSize < 5) {
    return `The current vendor readout is based on ${sampleSize} assessed firms, so patterns should be treated as directional rather than broad market evidence.`;
  }
  return `The current vendor readout is based on ${sampleSize} assessed firms and remains current-state PAT signal only, not benchmark or forecast intelligence.`;
}

function getConfidenceBand(sampleSize: number) {
  if (sampleSize <= 0) {
    return {
      band: "no_signal" as const,
      label: "No live signal",
      summary:
        "No completed firm PAT submissions are available yet, so this remains a placeholder for future current-state signal.",
    };
  }
  if (sampleSize === 1) {
    return {
      band: "directional" as const,
      label: "Directional only",
      summary:
        "This readout is based on one firm only and should be treated as directional rather than strong signal.",
    };
  }
  if (sampleSize < 5) {
    return {
      band: "directional" as const,
      label: "Directional",
      summary: `This readout is based on ${sampleSize} firms and remains directional rather than broad market signal.`,
    };
  }
  if (sampleSize < 10) {
    return {
      band: "emerging" as const,
      label: "Emerging current-state signal",
      summary: `This readout is based on ${sampleSize} firms and is useful for current-state interpretation, but still not broad enough to read as strong market intelligence.`,
    };
  }
  return {
    band: "grounded" as const,
    label: "Grounded current-state signal",
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
    confidenceLabel: "Staged only",
    confidenceSummary:
      "This Elite card is staged only. PAT is not implying that benchmark, forecast, or scenario intelligence already exists behind it.",
    currentStateSummary:
      "This Elite insight remains staged only. PAT is not claiming benchmark, projection, or scenario intelligence from the current firm signal base.",
    what: definition.what,
    why: definition.why,
    how: definition.how,
    exactAssessmentBasis:
      "Current vendor alignment uses live firm PAT submissions, capability scores, and answer patterns for Pro insights only. This Elite card stays locked because the repo does not yet have an honest benchmark, time-series projection, or scenario layer behind it.",
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
  const relevantModuleAverage = average(
    scoredModules.flatMap((moduleEvidence) =>
      typeof moduleEvidence.averageScore === "number" ? [moduleEvidence.averageScore] : []
    )
  );

  const basisLines = [
    `Firm sample size: ${input.snapshot.sampleSize}. Final firm submissions in basis set: ${input.snapshot.submissionCount}.`,
    `Strongest contributing modules: ${strongest}.`,
    `Weakest contributing modules: ${weakest}.`,
    strongestCapabilities.length > 0
      ? `Relevant capabilities: ${strongestCapabilities
          .map((capability) => `${capability.title} (${formatScore(capability.averageScore)})`)
          .join(", ")}.`
      : "Relevant capabilities: live company capability scores are not populated yet for this slice.",
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
        : `${input.definition.title} is currently based on ${input.snapshot.sampleSize} firm PAT sample${
            input.snapshot.sampleSize === 1 ? "" : "s"
          }. ${input.snapshot.confidenceSummary} The relevant module average is ${formatScore(relevantModuleAverage)}, with strongest support in ${strongest} and weakest support in ${weakest}.`,
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

export async function getVendorAlignmentInsightBundle() {
  const moduleDefinitionsByKey = new Map<string, (typeof FIRM_MODULE_DEFINITIONS)[number]>(
    FIRM_MODULE_DEFINITIONS.map((definition) => [definition.key, definition])
  );
  const capabilityDefinitionsByKey = new Map(
    FIRM_CAPABILITY_DEFINITIONS.map((definition) => [definition.key, definition])
  );
  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((module) => module.key);
  const capabilityKeys = FIRM_CAPABILITY_DEFINITIONS.map((capability) => capability.key);

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
        Company: { type: "FIRM" },
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
        Company: { type: "FIRM" },
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
