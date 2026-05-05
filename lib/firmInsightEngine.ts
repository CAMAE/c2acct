import prisma from "@/lib/prisma";
import { normalizeQuestionRuntime, type NormalizedAnswer } from "@/lib/assessmentRuntime";
import {
  FIRM_CAPABILITY_DEFINITIONS,
  FIRM_TIER1_INSIGHT_CAPABILITY_RULES,
} from "@/lib/firmCapabilities";
import {
  ELITE_PLACEHOLDER_CTA,
  ELITE_PLACEHOLDER_MESSAGE,
  ELITE_PLACEHOLDER_TITLE,
  getFirmInsightContent,
} from "@/lib/insightContent";
import {
  buildElitePlaceholderSurfaceContent,
  buildHelpSurfaceContent,
  type InsightSurfaceContent,
} from "@/lib/insightSurface";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_TIER1_INSIGHT_DEFINITIONS,
  FIRM_TIER2_INSIGHT_DEFINITIONS,
} from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

type InsightKey = (typeof FIRM_TIER1_INSIGHT_DEFINITIONS)[number]["key"];

type ModuleEvidence = {
  key: string;
  title: string;
  score: number | null;
  submittedAt: Date | null;
  sectionKey: string;
  sectionTitle: string;
};

type CapabilityEvidence = {
  key: string;
  title: string;
  description: string | null;
  score: number | null;
  threshold: number;
  meetsThreshold: boolean;
};

type ClusterEvidence = {
  key: string;
  title: string;
  averageScore: number;
  questionCount: number;
  moduleTitles: string[];
  sectionTitles: string[];
  questionPrompts: string[];
};

export type FirmInsightReport = {
  key: InsightKey;
  title: string;
  sampleSize: number;
  latestUpdatedAt: Date | null;
  confidenceBand: "no_signal" | "sample_thin" | "emerging" | "grounded";
  confidenceLabel: string;
  confidenceSummary: string;
  currentStateSummary: string;
  what: string;
  why: string;
  how: string;
  basisSummary: string;
  contributingModules: ModuleEvidence[];
  strongestModules: ModuleEvidence[];
  weakestModules: ModuleEvidence[];
  contributingCapabilities: CapabilityEvidence[];
  notableQuestionClusters: ClusterEvidence[];
  confidenceCaveats: string[];
};

export type FirmInsightOverviewMode = "pro" | "elite" | "help";

export type FirmInsightOverviewCard = {
  key: string;
  title: string;
  summary: string;
  statusLabel?: string;
  tone: "active" | "muted" | "locked";
  href: string | null;
  interactive: boolean;
  supportingText: string | null;
};

export type FirmInsightDetailSurfaceKey = "pro" | "elite" | "help";

export type FirmInsightDetailSurfaceCard = {
  key: FirmInsightDetailSurfaceKey;
  title: string;
  summary: string;
  href: string | null;
  interactive: boolean;
};

export type FirmInsightDetailSurfaceContent = InsightSurfaceContent<FirmInsightDetailSurfaceKey>;

export function getRequestedFirmInsightOverviewMode(
  rawMode: string | undefined
): FirmInsightOverviewMode {
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

export function getRequestedFirmInsightDetailSurface(
  rawSurface: string | undefined
): FirmInsightDetailSurfaceKey {
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

function getConfidenceBand(sampleSize: number) {
  if (sampleSize <= 0) {
    return {
      band: "no_signal" as const,
      label: "No current-state signal",
      summary: "PAT does not yet have enough completed firm evidence to support a grounded readout.",
    };
  }
  if (sampleSize === 1) {
    return {
      band: "sample_thin" as const,
      label: "Early current-state signal",
      summary: "This readout is based on one completed module submission only and should be treated as early current-state signal.",
    };
  }
  if (sampleSize < 4) {
    return {
      band: "sample_thin" as const,
      label: "Sample-thin current-state signal",
      summary: `This readout is based on ${sampleSize} relevant module submissions and remains sample-thin rather than strong confirmation.`,
    };
  }
  if (sampleSize < 8) {
    return {
      band: "emerging" as const,
      label: "Emerging signal",
      summary: `This readout is based on ${sampleSize} relevant module submissions and is useful, but still not broad enough to read as strong signal.`,
    };
  }
  return {
    band: "grounded" as const,
    label: "Grounded current-state signal",
    summary: `This readout is based on ${sampleSize} relevant module submissions and is grounded for current-state interpretation only, not benchmarks or forecasts.`,
  };
}

const INSIGHT_MODULE_MAP: Record<InsightKey, string[]> = {
  firm_tier1_operating_baseline: FIRM_MODULE_DEFINITIONS.map((module) => module.key),
  firm_tier1_automation_readiness: [
    "firm_alignment_automation_ai_v1",
    "firm_alignment_operating_model_v1",
    "firm_alignment_data_flow_v1",
    "firm_alignment_governance_v1",
  ],
  firm_tier1_data_and_controls: [
    "firm_alignment_data_flow_v1",
    "firm_alignment_governance_v1",
    "firm_alignment_operating_model_v1",
  ],
  firm_tier1_change_alignment: [
    "firm_alignment_strategy_v1",
    "firm_alignment_operating_model_v1",
    "firm_alignment_automation_ai_v1",
  ],
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
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

function describeConfidenceCaveats(input: {
  availableModuleCount: number;
  expectedModuleCount: number;
  availableCapabilityCount: number;
  expectedCapabilityCount: number;
  clusterCount: number;
}) {
  const caveats: string[] = [];

  if (input.availableModuleCount < input.expectedModuleCount) {
    caveats.push(
      `Only ${input.availableModuleCount} of ${input.expectedModuleCount} relevant modules have final submissions, so this remains partial current-state evidence.`
    );
  }

  if (input.availableCapabilityCount < input.expectedCapabilityCount) {
    caveats.push(
      `Only ${input.availableCapabilityCount} of ${input.expectedCapabilityCount} required capability scores are available, so the capability basis is not fully populated.`
    );
  }

  if (input.clusterCount < 2) {
    caveats.push(
      "Question-cluster evidence is thin, so PAT should treat the current interpretation as sample-thin rather than richly differentiated."
    );
  }

  if (caveats.length === 0) {
    caveats.push(
      "This remains current-state PAT evidence only. No benchmark, peer-comparison, or forecast layer is being claimed here."
    );
  }

  return caveats;
}

function buildNarrative(input: {
  title: string;
  modules: ModuleEvidence[];
  strongestModules: ModuleEvidence[];
  weakestModules: ModuleEvidence[];
  capabilities: CapabilityEvidence[];
  clusters: ClusterEvidence[];
  caveats: string[];
}) {
  const strongestNames = input.strongestModules.map((module) => module.title).join(" and ");
  const weakestNames = input.weakestModules.map((module) => module.title).join(" and ");
  const strongestCapability = input.capabilities
    .filter((capability) => capability.score !== null)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0];
  const weakestCapability = input.capabilities
    .filter((capability) => capability.score !== null)
    .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))[0];
  const strongestCluster = input.clusters[0];
  const weakestCluster = input.clusters.at(-1);
  const availableModules = input.modules.filter((module) => typeof module.score === "number").length;

  return {
    currentStateSummary:
      availableModules === 0
        ? `${input.title} has no completed firm assessment evidence yet.`
        : `${input.title} shows the current operating picture, with the strongest support in ${
            strongestNames || "the current strongest module evidence"
          } and the most pressure in ${
            weakestNames || "the current weakest module evidence"
          }.`,
    what:
      availableModules === 0
        ? "A firm PAT interpretation becomes available after the related module and capability evidence exists."
        : `${input.title} is a current-state PAT interpretation built from the latest module scores, capability scores, and question-cluster patterns attached to this theme.`,
    why:
      strongestCapability && weakestCapability
        ? `The visible spread between ${strongestCapability.title.toLowerCase()} and ${weakestCapability.title.toLowerCase()} shows where the firm is strongest and where the current operating constraint still sits.`
        : "The value of this view is that it keeps the interpretation tied to actual operating evidence instead of generic completion status.",
    how:
      strongestCluster && weakestCluster
        ? `Use the strongest cluster in ${strongestCluster.title.toLowerCase()} as the stable base, then prioritize the weakest cluster in ${weakestCluster.title.toLowerCase()} before claiming broader PAT maturity.`
        : "Use the available evidence to decide what to reinforce first, and treat missing evidence as a signal that more assessment coverage is still needed.",
    basisSummary:
      availableModules === 0
        ? "PAT does not have enough completed module evidence to describe a grounded basis yet."
        : `Strongest modules: ${strongestNames || "--"}. Weakest modules: ${weakestNames || "--"}. ${
            input.caveats[0] ?? ""
          }`,
  };
}

export function buildFirmProInsightCards(input: {
  reports: Map<InsightKey, FirmInsightReport>;
  unlockedKeys: Set<string>;
}): FirmInsightOverviewCard[] {
  return FIRM_TIER1_INSIGHT_DEFINITIONS.map((insight) => {
    const report = input.reports.get(insight.key as InsightKey);
    const visible = input.unlockedKeys.has(insight.key);
    const content = getFirmInsightContent(insight.key);

    return {
      key: insight.key,
      title: insight.title,
      summary: report?.currentStateSummary ?? content?.summary ?? insight.body,
      tone: visible ? "active" : "muted",
      href: `/firm/insights/${insight.key}`,
      interactive: true,
      supportingText: report
        ? visible
          ? report.strongestModules.length
            ? `Strongest support: ${report.strongestModules.map((module) => module.title).join(", ")}.`
            : "Current evidence is available for this readout."
          : "Current evidence is visible here, but the full Pro unlock still depends on the required capability thresholds."
        : "PAT is still waiting on grounded module and capability evidence for a stable current-state readout.",
    } satisfies FirmInsightOverviewCard;
  });
}

export function buildFirmEliteInsightCards() {
  return FIRM_TIER2_INSIGHT_DEFINITIONS.map((insight) => {
    const content = getFirmInsightContent(insight.key);

    return {
      key: insight.key,
      title: insight.title,
      summary: content?.lockedState?.summary ?? ELITE_PLACEHOLDER_MESSAGE,
      statusLabel: ELITE_PLACEHOLDER_TITLE,
      tone: "locked",
      href: null,
      interactive: false,
      supportingText: content?.lockedState?.disclaimer ?? ELITE_PLACEHOLDER_CTA,
    } satisfies FirmInsightOverviewCard;
  });
}

export function buildFirmInsightDetailSurfaceCards(input: {
  insightKey: string;
  report: FirmInsightReport;
  locked: boolean;
}) {
  const baseHref = `/firm/insights/${input.insightKey}`;
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
      summary: ELITE_PLACEHOLDER_MESSAGE,
      href: `${baseHref}?surface=elite`,
      interactive: true,
    },
    {
      key: "help",
      title: "Help",
      summary: input.report.currentStateSummary,
      href: `${baseHref}?surface=help`,
      interactive: true,
    },
  ] satisfies FirmInsightDetailSurfaceCard[];
}

export function buildFirmLockedInsightDetailSurfaceCards(input: {
  insightKey: string;
  summary?: string | null;
}) {
  const baseHref = `/firm/insights/${input.insightKey}`;
  const summary = input.summary ?? "This Elite insight is visible for navigation only and does not expose unavailable content.";

  return [
    {
      key: "pro",
      title: "Pro",
      summary: "No Pro readout is exposed for this locked Elite route.",
      href: `${baseHref}?surface=pro`,
      interactive: true,
    },
    {
      key: "elite",
      title: "Elite",
      summary,
      href: `${baseHref}?surface=elite`,
      interactive: true,
    },
    {
      key: "help",
      title: "Help",
      summary: "Explains what stays locked and what evidence is required before PAT can support more detail.",
      href: `${baseHref}?surface=help`,
      interactive: true,
    },
  ] satisfies FirmInsightDetailSurfaceCard[];
}

function formatEvidenceDate(date: Date | null) {
  return date ? date.toISOString() : "no submitted timestamp";
}

function summarizeModuleProvenance(report: FirmInsightReport) {
  if (!report.contributingModules.length) {
    return "insufficient module evidence; complete more modules before using this as a grounded finding.";
  }

  return report.contributingModules
    .map((module) => {
      const score = typeof module.score === "number" ? `${Math.round(module.score)}%` : "score unavailable";
      return `${module.title} (${score}, submitted ${formatEvidenceDate(module.submittedAt)})`;
    })
    .join("; ");
}

function summarizeCapabilityProvenance(report: FirmInsightReport) {
  if (!report.contributingCapabilities.length) {
    return "insufficient capability evidence; no supporting capability scores are available for this readout.";
  }

  const scoredCapabilities = report.contributingCapabilities
    .filter((capability) => capability.score !== null)
    .map((capability) => {
      const thresholdState = capability.meetsThreshold ? "meets" : "below";
      return `${capability.title} (${Math.round(capability.score ?? 0)}%, ${thresholdState} ${capability.threshold}% threshold)`;
    });

  return scoredCapabilities.length
    ? scoredCapabilities.join("; ")
    : "insufficient capability evidence; available capabilities do not have scored support yet.";
}

function summarizeQuestionPatternProvenance(report: FirmInsightReport) {
  if (!report.notableQuestionClusters.length) {
    return "insufficient question-pattern evidence; no stable question cluster is available yet.";
  }

  return report.notableQuestionClusters
    .map((cluster) => {
      const moduleText = cluster.moduleTitles.length ? cluster.moduleTitles.join(", ") : "module unavailable";
      return `${cluster.title} (${Math.round(cluster.averageScore)}% average across ${cluster.questionCount} questions from ${moduleText})`;
    })
    .join("; ");
}

function buildFirmInsightEvidenceProvenanceItem(report: FirmInsightReport) {
  const sampleText =
    report.sampleSize === 1
      ? "1 final firm module submission"
      : `${report.sampleSize} final firm module submissions`;

  return {
    title: "Evidence provenance",
    body: [
      `Firm module source: ${sampleText}; latest evidence timestamp: ${formatEvidenceDate(report.latestUpdatedAt)}.`,
      `Module evidence: ${summarizeModuleProvenance(report)}`,
      `Capability evidence: ${summarizeCapabilityProvenance(report)}`,
      `Question-pattern evidence: ${summarizeQuestionPatternProvenance(report)}`,
      "PAT uses only current firm module, capability, and question-pattern evidence here; it does not claim benchmark, projection, recommendation, customer, or public-live proof.",
    ].join(" "),
  };
}

function buildLockedEliteBoundaryItem() {
  return {
    title: "Locked Elite boundary",
    body: "Elite benchmark, projection, recommendation, and comparative content is not live in this route. PAT keeps the locked surface visible for navigation only and does not expose unavailable findings.",
  };
}

function summarizeFirmInsightStrengths(report: FirmInsightReport) {
  if (!report.strongestModules.length && !report.contributingCapabilities.length) {
    return "Complete more modules: PAT does not yet have enough grounded module or capability evidence to separate the strongest supports clearly.";
  }

  const moduleText = report.strongestModules.length
    ? `Strongest supporting modules right now: ${report.strongestModules
        .map((module) => `${module.title} (${typeof module.score === "number" ? `${Math.round(module.score)}%` : "--"})`)
        .join(", ")}.`
    : "";
  const capabilityText = report.contributingCapabilities.length
    ? `Most relevant supporting capabilities: ${report.contributingCapabilities
        .filter((capability) => capability.score !== null)
        .map((capability) => `${capability.title} (${Math.round(capability.score ?? 0)}%)`)
        .join(", ")}.`
    : "";

  return [moduleText, capabilityText].filter(Boolean).join(" ");
}

function summarizeFirmInsightPressure(report: FirmInsightReport) {
  if (!report.weakestModules.length && !report.notableQuestionClusters.length) {
    return "Complete more modules: PAT does not yet have enough grounded module or question-pattern evidence to separate the current pressure points clearly.";
  }

  const moduleText = report.weakestModules.length
    ? `The current drag is showing most clearly in ${report.weakestModules
        .map((module) => `${module.title} (${typeof module.score === "number" ? `${Math.round(module.score)}%` : "--"})`)
        .join(", ")}.`
    : "";
  const clusterText = report.notableQuestionClusters.length
    ? `The most visible operating patterns in this readout are ${report.notableQuestionClusters
        .map((cluster) => `${cluster.title} (${Math.round(cluster.averageScore)}%)`)
        .join(", ")}.`
    : "";

  return [moduleText, clusterText].filter(Boolean).join(" ");
}

function summarizeFirmInsightLimits(report: FirmInsightReport) {
  return [report.confidenceSummary, ...report.confidenceCaveats.slice(0, 2)]
    .filter(Boolean)
    .join(" ");
}

export function buildFirmInsightDetailSurfaceContent(input: {
  report: FirmInsightReport;
  surface: FirmInsightDetailSurfaceKey;
}) {
  switch (input.surface) {
    case "pro":
      return {
        key: "pro",
        title: "Pro",
        intro: "PAT keeps the Pro surface focused on the grounded evidence behind this current firm alignment readout.",
        items: [
          {
            title: "Current PAT picture",
            body: `${input.report.currentStateSummary} ${input.report.basisSummary}`,
          },
          buildFirmInsightEvidenceProvenanceItem(input.report),
          {
            title: "Where the signal is strongest",
            body: summarizeFirmInsightStrengths(input.report),
          },
          {
            title: "Where the signal is under pressure",
            body: summarizeFirmInsightPressure(input.report),
          },
          {
            title: "Current limits",
            body: summarizeFirmInsightLimits(input.report),
          },
        ],
      } satisfies FirmInsightDetailSurfaceContent;
    case "elite":
      {
        const eliteSurface = buildElitePlaceholderSurfaceContent<FirmInsightDetailSurfaceKey>({
          key: "elite",
          intro: `${ELITE_PLACEHOLDER_MESSAGE} This is not a live Elite interpretation and does not expose benchmark, projection, recommendation, or comparative content.`,
          what: "A deeper PAT interpretation layer reserved for benchmark, projection, and recommendation work that is not yet live in this route.",
          why: "The deeper comparative layer should stay unavailable until PAT can support it honestly with more than current-state evidence alone.",
          how: `${ELITE_PLACEHOLDER_TITLE}. ${ELITE_PLACEHOLDER_CTA}.`,
        });

        return {
          ...eliteSurface,
          items: [...eliteSurface.items, buildLockedEliteBoundaryItem()],
        } satisfies FirmInsightDetailSurfaceContent;
      }
    case "help":
      {
        const helpSurface = buildHelpSurfaceContent<FirmInsightDetailSurfaceKey>({
          key: "help",
          intro: input.report.currentStateSummary,
          what: input.report.what,
          why: input.report.why,
          how: input.report.how,
        });

        return {
          ...helpSurface,
          items: [...helpSurface.items, buildFirmInsightEvidenceProvenanceItem(input.report)],
        } satisfies FirmInsightDetailSurfaceContent;
      }
    default:
      return {
        key: "pro",
        title: "Pro",
        intro: "PAT keeps the Pro surface focused on the grounded evidence behind this current firm alignment readout.",
        items: [
          {
            title: "Current PAT picture",
            body: `${input.report.currentStateSummary} ${input.report.basisSummary}`,
          },
          buildFirmInsightEvidenceProvenanceItem(input.report),
          {
            title: "Where the signal is strongest",
            body: summarizeFirmInsightStrengths(input.report),
          },
          {
            title: "Where the signal is under pressure",
            body: summarizeFirmInsightPressure(input.report),
          },
          {
            title: "Current limits",
            body: summarizeFirmInsightLimits(input.report),
          },
        ],
      } satisfies FirmInsightDetailSurfaceContent;
  }
}

export function buildFirmLockedInsightDetailSurfaceContent(input: {
  surface: FirmInsightDetailSurfaceKey;
  summary?: string | null;
  what?: string | null;
  why?: string | null;
  how?: string | null;
}) {
  const summary =
    input.summary ?? "This Elite insight is not live. PAT is not exposing unavailable benchmark, projection, recommendation, or comparative content.";
  const lockedBoundary = buildLockedEliteBoundaryItem();
  const evidenceStatus = {
    title: "Evidence status",
    body: "No firm module, capability, or question-pattern evidence is attached to this locked Elite surface. Complete more modules before using PAT for a grounded firm insight.",
  };

  switch (input.surface) {
    case "elite":
      return {
        key: "elite",
        title: "Elite",
        intro: `${summary} This is not a live Elite interpretation.`,
        items: [
          {
            title: "What it is",
            body: input.what ?? "A restricted future Elite insight layer.",
          },
          lockedBoundary,
          evidenceStatus,
        ],
      } satisfies FirmInsightDetailSurfaceContent;
    case "help":
      return {
        key: "help",
        title: "Help",
        intro: summary,
        items: [
          {
            title: "What it is",
            body: input.what ?? "A locked Elite route PAT keeps visible so the future intelligence boundary is explicit.",
          },
          {
            title: "Why it matters",
            body: input.why ?? "Unavailable insight content should not be mistaken for a live firm finding.",
          },
          {
            title: "How to use it",
            body: input.how ?? "Use the Pro firm insight routes after completing modules; treat this Elite route as locked.",
          },
          lockedBoundary,
          evidenceStatus,
        ],
      } satisfies FirmInsightDetailSurfaceContent;
    case "pro":
    default:
      return {
        key: "pro",
        title: "Pro",
        intro: "This locked Elite route does not expose a Pro readout.",
        items: [
          {
            title: "Current PAT picture",
            body: "Complete more modules: no grounded Pro firm insight is available from this locked Elite route.",
          },
          lockedBoundary,
          evidenceStatus,
        ],
      } satisfies FirmInsightDetailSurfaceContent;
  }
}

export async function getFirmInsightReports(companyId: string) {
  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((module) => module.key);
  const capabilityKeySet = new Set(FIRM_CAPABILITY_DEFINITIONS.map((capability) => capability.key));

  const [modules, submissions, capabilityScores] = await Promise.all([
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
            SurveyQuestionCapability: {
              select: {
                nodeId: true,
              },
            },
          },
        },
      },
    }),
    prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        companyId,
        SurveyModule: {
          key: { in: moduleKeys },
        },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        moduleId: true,
        score: true,
        answers: true,
        createdAt: true,
      },
    }),
    prisma.companyCapabilityScore.findMany({
      where: {
        companyId,
      },
      select: {
        nodeId: true,
        score: true,
      },
    }).catch(() => []),
  ]);

  const latestSubmissionByModuleId = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    if (!latestSubmissionByModuleId.has(submission.moduleId)) {
      latestSubmissionByModuleId.set(submission.moduleId, submission);
    }
  }

  const capabilityDefinitionByKey = new Map<string, (typeof FIRM_CAPABILITY_DEFINITIONS)[number]>(
    FIRM_CAPABILITY_DEFINITIONS.map((capability) => [capability.key, capability])
  );
  const capabilityDefinitionByNodeId = new Map<string, (typeof FIRM_CAPABILITY_DEFINITIONS)[number]>();
  const liveCapabilityNodes = await prisma.capabilityNode.findMany({
    where: { key: { in: Array.from(capabilityKeySet) } },
    select: { id: true, key: true },
  }).catch(() => []);
  for (const node of liveCapabilityNodes) {
    const definition = capabilityDefinitionByKey.get(node.key);
    if (definition) {
      capabilityDefinitionByNodeId.set(node.id, definition);
    }
  }

  const capabilityScoreByNodeId = new Map(capabilityScores.map((score) => [score.nodeId, score.score]));

  const moduleEvidenceByKey = new Map<string, ModuleEvidence>();
  const questionSignals = modules.flatMap((module) => {
    const latestSubmission = latestSubmissionByModuleId.get(module.id) ?? null;
    const runtimeQuestions = module.SurveyQuestion.map((question) => normalizeQuestionRuntime(question));
    const moduleEvidence: ModuleEvidence = {
      key: module.key,
      title: module.title,
      score: latestSubmission?.score ?? null,
      submittedAt: latestSubmission?.createdAt ?? null,
      sectionKey: runtimeQuestions[0]?.meta.section?.key ?? module.key,
      sectionTitle: runtimeQuestions[0]?.meta.section?.title ?? module.title,
    };

    moduleEvidenceByKey.set(module.key, moduleEvidence);

    const answers =
      latestSubmission?.answers && typeof latestSubmission.answers === "object"
        ? (latestSubmission.answers as Record<string, NormalizedAnswer>)
        : {};

    return runtimeQuestions.flatMap((question) => {
      const normalizedScore = normalizeAnswerToPercent(question, answers[question.id]);
      if (normalizedScore === null) {
        return [];
      }

      return module.SurveyQuestion.find((entry) => entry.id === question.id)?.SurveyQuestionCapability.map((mapping) => ({
        moduleKey: module.key,
        moduleTitle: module.title,
        questionKey: question.key,
        questionPrompt: question.prompt,
        sectionTitle: question.meta.section?.title ?? module.title,
        capabilityNodeId: mapping.nodeId,
        capabilityTitle: capabilityDefinitionByNodeId.get(mapping.nodeId)?.title ?? "Capability",
        normalizedScore,
      })) ?? [];
    });
  });

  const reports = new Map<InsightKey, FirmInsightReport>();

  for (const insight of FIRM_TIER1_INSIGHT_DEFINITIONS) {
    const relevantModuleKeys = INSIGHT_MODULE_MAP[insight.key];
    const relevantModules = relevantModuleKeys
      .map((moduleKey) => moduleEvidenceByKey.get(moduleKey))
      .filter((module): module is ModuleEvidence => Boolean(module));
    const relevantCapabilityRules =
      FIRM_TIER1_INSIGHT_CAPABILITY_RULES[
        insight.key as keyof typeof FIRM_TIER1_INSIGHT_CAPABILITY_RULES
      ];
    const relevantCapabilities = relevantCapabilityRules.map((rule) => {
      const liveNode = liveCapabilityNodes.find((node) => node.key === rule.key);
      const definition = capabilityDefinitionByKey.get(rule.key);
      return {
        key: rule.key,
        title: definition?.title ?? rule.key,
        description: definition?.description ?? null,
        score: liveNode ? capabilityScoreByNodeId.get(liveNode.id) ?? null : null,
        threshold: rule.minScore,
        meetsThreshold: liveNode ? (capabilityScoreByNodeId.get(liveNode.id) ?? -1) >= rule.minScore : false,
      } satisfies CapabilityEvidence;
    });

    const relevantQuestionSignals = questionSignals.filter((signal) => relevantModuleKeys.includes(signal.moduleKey));
    const clusterMap = new Map<string, ClusterEvidence>();
    for (const signal of relevantQuestionSignals) {
      const cluster = clusterMap.get(signal.capabilityTitle) ?? {
        key: signal.capabilityNodeId,
        title: signal.capabilityTitle,
        averageScore: 0,
        questionCount: 0,
        moduleTitles: [],
        sectionTitles: [],
        questionPrompts: [],
      };
      cluster.averageScore += signal.normalizedScore;
      cluster.questionCount += 1;
      if (!cluster.moduleTitles.includes(signal.moduleTitle)) {
        cluster.moduleTitles.push(signal.moduleTitle);
      }
      if (!cluster.sectionTitles.includes(signal.sectionTitle)) {
        cluster.sectionTitles.push(signal.sectionTitle);
      }
      if (!cluster.questionPrompts.includes(signal.questionPrompt)) {
        cluster.questionPrompts.push(signal.questionPrompt);
      }
      clusterMap.set(signal.capabilityTitle, cluster);
    }

    const notableQuestionClusters = Array.from(clusterMap.values())
      .map((cluster) => ({
        ...cluster,
        averageScore: round1(cluster.averageScore / cluster.questionCount),
        moduleTitles: cluster.moduleTitles.sort(),
        sectionTitles: cluster.sectionTitles.sort(),
        questionPrompts: cluster.questionPrompts.slice(0, 3),
      }))
      .sort((left, right) => right.averageScore - left.averageScore)
      .slice(0, 4);

    const scoredModules = relevantModules
      .filter((module) => typeof module.score === "number")
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));

    const strongestModules = scoredModules.slice(0, Math.min(2, scoredModules.length));
    const weakestModules = [...scoredModules]
      .reverse()
      .slice(0, Math.min(2, scoredModules.length))
      .sort((left, right) => (left.score ?? 0) - (right.score ?? 0));

    const confidenceCaveats = describeConfidenceCaveats({
      availableModuleCount: scoredModules.length,
      expectedModuleCount: relevantModuleKeys.length,
      availableCapabilityCount: relevantCapabilities.filter((capability) => capability.score !== null).length,
      expectedCapabilityCount: relevantCapabilities.length,
      clusterCount: notableQuestionClusters.length,
    });
    const latestUpdatedAt = relevantModules
      .map((module) => module.submittedAt)
      .filter((submittedAt): submittedAt is Date => submittedAt instanceof Date)
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
    const confidence = getConfidenceBand(scoredModules.length);

    const narrative = buildNarrative({
      title: insight.title,
      modules: relevantModules,
      strongestModules,
      weakestModules,
      capabilities: relevantCapabilities,
      clusters: notableQuestionClusters,
      caveats: confidenceCaveats,
    });

    reports.set(insight.key, {
      key: insight.key,
      title: insight.title,
      sampleSize: scoredModules.length,
      latestUpdatedAt,
      confidenceBand: confidence.band,
      confidenceLabel: confidence.label,
      confidenceSummary: confidence.summary,
      currentStateSummary: narrative.currentStateSummary,
      what: narrative.what,
      why: narrative.why,
      how: narrative.how,
      basisSummary: narrative.basisSummary,
      contributingModules: relevantModules,
      strongestModules,
      weakestModules,
      contributingCapabilities: relevantCapabilities,
      notableQuestionClusters,
      confidenceCaveats,
    });
  }

  return reports;
}
