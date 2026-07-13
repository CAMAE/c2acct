import prisma from "@/lib/prisma";
import { FIRM_ELITE_V2_META } from "@/lib/eliteInsightsV2";
import { normalizeQuestionRuntime, type NormalizedAnswer } from "@/lib/assessmentRuntime";
import { getScoreBand } from "@/lib/scoreBands";
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

export type FirmInsightOverviewCardMetric = {
  value: string;
  caption: string;
};

export type FirmInsightOverviewCard = {
  key: string;
  title: string;
  summary: string;
  statusLabel?: string;
  tone: "active" | "muted" | "locked";
  href: string | null;
  interactive: boolean;
  supportingText: string | null;
  metric?: FirmInsightOverviewCardMetric;
  /** Block 11d: the Pro readout the card expands into in place. */
  expandedContent?: { intro: string; items: Array<{ title: string; body: string }> } | null;
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
      label: "No signal",
      summary: "PAT does not yet have enough completed firm evidence to support a grounded readout.",
    };
  }
  if (sampleSize === 1) {
    return {
      band: "sample_thin" as const,
      label: "Early signal",
      summary: "This readout is based on one completed module submission only and should be treated as early current-state signal.",
    };
  }
  if (sampleSize < 4) {
    return {
      band: "sample_thin" as const,
      label: "Early signal",
      summary: `This readout is based on ${sampleSize} relevant module submissions and remains sample-thin rather than strong confirmation.`,
    };
  }
  if (sampleSize < 8) {
    return {
      band: "emerging" as const,
      label: "Early signal",
      summary: `This readout is based on ${sampleSize} relevant module submissions and is useful, but still not broad enough to read as strong signal.`,
    };
  }
  return {
    band: "grounded" as const,
    label: "Grounded",
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

export function averageContributingModuleScore(report: FirmInsightReport): number | null {
  const scores = report.contributingModules
    .map((module) => module.score)
    .filter((score): score is number => typeof score === "number");
  if (!scores.length) {
    return null;
  }
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

/**
 * Block 10d (threshold math): capability evidence bars are per-capability (60%
 * or 65%, from firmCapabilities badge rules) — NOT a single global 60%. This
 * describes the ACTUAL bar(s) behind a set of capabilities so copy never
 * hardcodes "60%" while the count is measured against a mix of 60/65 bars.
 *   uniform  → "the 65% bar"
 *   mixed    → "their 60–65% bars"
 */
export function describeCapabilityBar(
  capabilities: ReadonlyArray<{ threshold: number }>
): string {
  const distinct = [...new Set(capabilities.map((capability) => capability.threshold))].sort(
    (a, b) => a - b
  );
  if (distinct.length === 0) {
    return "their evidence bar";
  }
  if (distinct.length === 1) {
    return `the ${distinct[0]}% bar`;
  }
  return `their ${distinct[0]}–${distinct[distinct.length - 1]}% bars`;
}

/**
 * Block 10c (P0 number integrity): the ONE shared reader for a firm insight's
 * headline number. BOTH the overview face card and the detail-page hero call
 * this, so the number a firm sees on /firm/insights matches the number on the
 * detail page. (Pre-10c the detail hero always showed
 * averageContributingModuleScore while the face card showed a per-theme metric
 * — so for automation / data-and-controls / change cards the two numbers
 * disagreed.) The number is still varied by theme so the cards don't read as
 * the same auto-generated readout (5.7 audit §1.4).
 */
export type FirmInsightHeadline = {
  /** 0-100 reading that drives the band chip/gauge; null for non-score stats. */
  score: number | null;
  /** The big-number text (e.g. "72", "3 of 5"). */
  displayValue: string;
  /** Small suffix after the number (e.g. "%", "pts"); undefined for plain text. */
  suffix?: string;
  /** Show the band chip — only when score is a real 0-100 reading. */
  showBand: boolean;
  /** What this number measures (theme-specific). */
  caption: string;
};

const EMPTY_FIRM_HEADLINE: FirmInsightHeadline = {
  score: null,
  displayValue: "—",
  showBand: false,
  caption: "Evidence in progress",
};

export function readFirmInsightHeadline(key: InsightKey, report: FirmInsightReport): FirmInsightHeadline {
  const average = averageContributingModuleScore(report);
  const averageHeadline: FirmInsightHeadline =
    average === null
      ? EMPTY_FIRM_HEADLINE
      : { score: average, displayValue: `${average}`, suffix: "%", showBand: true, caption: "average module score" };
  const scoredModules = report.contributingModules.filter(
    (module): module is ModuleEvidence & { score: number } => typeof module.score === "number"
  );

  switch (key) {
    case "firm_tier1_automation_readiness": {
      const automationModule = scoredModules.find(
        (module) => module.key === "firm_alignment_automation_ai_v1"
      );
      return automationModule
        ? {
            score: automationModule.score,
            displayValue: `${Math.round(automationModule.score)}`,
            suffix: "%",
            showBand: true,
            caption: "Automation and AI module score",
          }
        : averageHeadline;
    }
    case "firm_tier1_data_and_controls": {
      const scoredCapabilities = report.contributingCapabilities.filter(
        (capability) => capability.score !== null
      );
      if (!report.contributingCapabilities.length || !scoredCapabilities.length) {
        return averageHeadline;
      }
      const met = report.contributingCapabilities.filter((capability) => capability.meetsThreshold).length;
      return {
        score: null,
        displayValue: `${met} of ${report.contributingCapabilities.length}`,
        showBand: false,
        // The count is measured against each capability's OWN bar (60% or 65%),
        // so the caption names the real bar(s), not a hardcoded 60%.
        caption: `capabilities at or above ${describeCapabilityBar(report.contributingCapabilities)}`,
      };
    }
    case "firm_tier1_change_alignment": {
      if (scoredModules.length < 2) {
        return averageHeadline;
      }
      const strongest = report.strongestModules[0];
      const weakest = report.weakestModules[0];
      if (typeof strongest?.score !== "number" || typeof weakest?.score !== "number") {
        return averageHeadline;
      }
      return {
        score: null,
        displayValue: `${Math.round(strongest.score - weakest.score)}`,
        suffix: "pts",
        showBand: false,
        caption: "spread between strongest and weakest modules",
      };
    }
    case "firm_tier1_operating_baseline":
    default:
      return averageHeadline;
  }
}

/**
 * One real number per overview card, varied by insight theme so the four
 * cards stop reading as the same auto-generated readout (5.7 audit §1.4).
 * Derived from the same shared headline reader as the detail hero (Block 10c).
 */
export function buildFirmInsightCardMetric(
  key: InsightKey,
  report: FirmInsightReport
): FirmInsightOverviewCardMetric | undefined {
  const headline = readFirmInsightHeadline(key, report);
  if (headline.displayValue === "—") {
    return undefined;
  }
  return {
    value: firmHeadlineValueText(headline),
    caption: headline.caption,
  };
}

/** Shared number+suffix formatting so the face card and detail hero read identically. */
export function firmHeadlineValueText(headline: FirmInsightHeadline): string {
  if (!headline.suffix) {
    return headline.displayValue;
  }
  // "%" hugs the number ("60%"); word suffixes get a space ("24 pts").
  return headline.suffix === "%"
    ? `${headline.displayValue}%`
    : `${headline.displayValue} ${headline.suffix}`;
}

/**
 * Varied single-sentence card copy per insight theme. Replaces the repeated
 * "X shows the current operating picture, with the strongest support in…"
 * boilerplate the 5.7 audit flagged 4x on /firm/insights.
 */
export function buildFirmInsightCardSummary(key: InsightKey, report: FirmInsightReport): string | null {
  const strongest = report.strongestModules[0];
  const weakest = report.weakestModules[0];
  if (typeof strongest?.score !== "number" || typeof weakest?.score !== "number") {
    return null;
  }
  const strongScore = Math.round(strongest.score);
  const weakScore = Math.round(weakest.score);

  if (strongest.key === weakest.key) {
    return `Current evidence rests on ${strongest.title} at ${strongScore}%; completing the remaining modules widens this readout.`;
  }

  switch (key) {
    case "firm_tier1_automation_readiness":
      return `Automation readiness runs strongest through ${strongest.title} (${strongScore}%), while ${weakest.title} (${weakScore}%) paces how fast adoption can widen.`;
    case "firm_tier1_data_and_controls": {
      const scoredCapabilities = report.contributingCapabilities.filter(
        (capability) => capability.score !== null
      );
      if (scoredCapabilities.length) {
        const met = report.contributingCapabilities.filter((capability) => capability.meetsThreshold).length;
        return `${met} of ${report.contributingCapabilities.length} supporting capabilities clear ${describeCapabilityBar(report.contributingCapabilities)}; ${weakest.title} carries the most control-side pressure.`;
      }
      return `Control posture rests on ${strongest.title} (${strongScore}%), with ${weakest.title} (${weakScore}%) holding the most pressure.`;
    }
    case "firm_tier1_change_alignment":
      return `A ${strongScore - weakScore}-point spread separates ${strongest.title} (${strongScore}%) from ${weakest.title} (${weakScore}%).`;
    case "firm_tier1_operating_baseline":
    default: {
      const average = averageContributingModuleScore(report);
      return average === null
        ? null
        : `The operating floor averages ${average}% across scored modules, anchored by ${strongest.title} at ${strongScore}%.`;
    }
  }
}

export type FirmInsightPlainLanguage = {
  summary: string;
  nextSteps: string[];
};

/** What each maturity band generally means for software decisions — general,
 * current-state framing only; never comparative. */
const BAND_STACK_CLAUSE: Record<ReturnType<typeof getScoreBand>["key"], string> = {
  early: "foundations are just being established, so tooling decisions should stay close to what the team can realistically support today",
  developing: "foundations are still forming and buying decisions tend to outpace the processes that have to support them",
  building: "core workflows are taking shape but still lean on individual effort",
  established: "core workflows hold up under day-to-day load",
  leading: "core workflows hold up well enough to absorb new tooling quickly",
};

/** Per-module friction/benefit framing so the tech-stack sentences vary with
 * whichever module is currently weakest. */
const MODULE_STACK_THEME: Record<string, { friction: string; benefit: string }> = {
  firm_alignment_data_flow_v1: {
    friction:
      "integration work becomes the friction point when new tools enter your stack — connections take longer to stand up and data needs manual reconciliation",
    benefit: "each new tool inherits cleaner data flows and clearer ownership",
  },
  firm_alignment_operating_model_v1: {
    friction:
      "unclear workflow ownership becomes the friction point when new tools enter your stack — rollouts stall where handoffs and review steps are undefined",
    benefit: "each new tool lands on defined workflows instead of creating new exceptions",
  },
  firm_alignment_automation_ai_v1: {
    friction:
      "automation oversight becomes the friction point when new tools enter your stack — automated steps multiply faster than the checks around them",
    benefit: "each new automation arrives with oversight already in place",
  },
  firm_alignment_governance_v1: {
    friction:
      "vendor and control discipline becomes the friction point when new tools enter your stack — evaluations run long and exceptions accumulate without clear owners",
    benefit: "each new vendor passes through a consistent evaluation and control path",
  },
  firm_alignment_strategy_v1: {
    friction:
      "change absorption becomes the friction point when new tools enter your stack — adoption competes with shifting priorities and rollouts lose momentum",
    benefit: "each new rollout starts with clearer priorities and more absorbed capacity",
  },
};

/**
 * Zero-context "What this means for your firm" copy for the insight detail
 * pages. Stays on current-state evidence only — no benchmark, percentile,
 * peer-comparison, projection, or recommendation claims (CLAUDE.md hard rule).
 */
export function buildFirmInsightPlainLanguage(report: FirmInsightReport): FirmInsightPlainLanguage | null {
  const average = averageContributingModuleScore(report);
  if (average === null) {
    return null;
  }

  const band = getScoreBand(average);
  const strongest = report.strongestModules[0];
  const weakest = report.weakestModules[0];
  const scoredCount = report.contributingModules.filter(
    (module) => typeof module.score === "number"
  ).length;
  const remaining = report.contributingModules.length - scoredCount;

  const sentences = [`Your firm scores ${average} — ${band.label}.`];
  if (strongest && weakest && typeof weakest.score === "number") {
    if (strongest.key === weakest.key) {
      sentences.push(`All current evidence comes from ${strongest.title}.`);
    } else {
      sentences.push(
        `Your strongest area is ${strongest.title}; your biggest opportunity is ${weakest.title} at ${Math.round(weakest.score)}%.`
      );
    }
  }
  if (remaining > 0) {
    sentences.push(`Completing the remaining ${remaining} module${remaining === 1 ? "" : "s"} sharpens this picture.`);
  }

  if (weakest && typeof weakest.score === "number") {
    const theme = MODULE_STACK_THEME[weakest.key] ?? {
      friction: `${weakest.title} becomes the friction point when new tools enter your stack — rollouts take longer and need more manual support`,
      benefit: "each new tool starts from a stronger operating base",
    };
    sentences.push(
      `A score in the ${band.label.toLowerCase()} range generally means ${BAND_STACK_CLAUSE[band.key]}, but ${theme.friction}.`
    );
    sentences.push(
      `Raising ${weakest.title} first typically increases the return on every later software decision, because ${theme.benefit}.`
    );
  }
  sentences.push(
    remaining > 0
      ? "As more modules reach final submission, this readout firms up from partial evidence into a complete current-state picture."
      : "With every relevant module at final submission, this is a complete current-state picture to evaluate new software against."
  );

  const nextSteps = report.contributingCapabilities
    .filter((capability) => !capability.meetsThreshold)
    .map((capability) => `Bring ${capability.title} above ${capability.threshold}% to unlock the full readout.`);

  return { summary: sentences.join(" "), nextSteps };
}

export function buildFirmProInsightCards(input: {
  reports: Map<InsightKey, FirmInsightReport>;
  unlockedKeys: Set<string>;
}): FirmInsightOverviewCard[] {
  return FIRM_TIER1_INSIGHT_DEFINITIONS.map((insight) => {
    const report = input.reports.get(insight.key as InsightKey);
    const visible = input.unlockedKeys.has(insight.key);
    const content = getFirmInsightContent(insight.key);
    const variedSummary = report ? buildFirmInsightCardSummary(insight.key as InsightKey, report) : null;

    // Block 11d: attach the Pro readout so the card can expand in place.
    const proSurface =
      report && visible
        ? buildFirmInsightDetailSurfaceContent({ report, surface: "pro" })
        : null;
    const expandedContent = proSurface
      ? { intro: proSurface.intro, items: proSurface.items.map((item) => ({ title: item.title, body: item.body })) }
      : null;

    return {
      key: insight.key,
      title: insight.title,
      summary: variedSummary ?? report?.currentStateSummary ?? content?.summary ?? insight.body,
      metric: report ? buildFirmInsightCardMetric(insight.key as InsightKey, report) : undefined,
      tone: visible ? "active" : "muted",
      href: `/firm/insights/${insight.key}`,
      interactive: true,
      expandedContent,
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

export function buildFirmEliteInsightCards({ elite = false }: { elite?: boolean } = {}) {
  return FIRM_TIER2_INSIGHT_DEFINITIONS.map((insight) => {
    const content = getFirmInsightContent(insight.key);

    // Elite Insights v2 (B5-1): live + interactive for Elite members; card title +
    // description match the interior surface. Locked "Coming soon" for Pro members.
    if (elite) {
      const meta = FIRM_ELITE_V2_META[insight.key];
      // Block 12c: entitled hub cards use firm-standard grammar (headline number +
      // specific sentence), NOT a bare name + "ELITE" corner chip. The metric is
      // attached by the index page from the live builder data.
      return {
        key: insight.key,
        title: meta?.title ?? insight.title,
        summary: meta?.description ?? insight.title,
        tone: "active",
        href: `/firm/insights/${insight.key}?surface=elite`,
        interactive: true,
        supportingText: null,
      } satisfies FirmInsightOverviewCard;
    }

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
  // Block 11 N2: when the viewer is ENTITLED to Elite, the tier-2 layer is live,
  // so the elite surface must NOT render the "not a live Elite interpretation"
  // placeholder — that contradicted the live Elite pane on the same page. The
  // placeholder stays only for non-entitled (Pro) viewers.
  entitled?: boolean;
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
      if (input.entitled) {
        return {
          key: "elite",
          title: "Elite",
          intro:
            "Your Elite Insights for this view are live — a future-state projection, a peer benchmark, and a recommendation engine, each grounded in your firm-reviewed evidence.",
          items: [
            {
              title: "What Elite adds here",
              body: "Elite turns your current-state alignment into forward and comparative views: where your trajectory is heading, where you sit against peers, and the highest-leverage next moves — all from your firm-reviewed evidence, not new claims.",
            },
            {
              title: "Evidence provenance",
              body: "Every Elite view is computed from your completed firm module, capability, and question-pattern evidence — no external, forecast, or fabricated data.",
            },
          ],
        } satisfies FirmInsightDetailSurfaceContent;
      }
      // Non-entitled (Pro) viewer: keep the governance-compliant locked copy —
      // the boundary is explicit and named Elite features (peer benchmark,
      // forecast) are NOT teased on the locked surface. The N2 contradiction
      // was on the ENTITLED path only (handled above); this branch is unchanged.
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
