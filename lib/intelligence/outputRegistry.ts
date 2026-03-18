import type { AssessmentReportProfileKey } from "@/lib/assessment-module-catalog";
import type { ProductDimensionKey } from "@/lib/productOutputScoring";
import type { OutputGateRule } from "@/lib/intelligence/outputGates";

export type OutputEvidenceSource = "SELF_SIGNAL" | "OBSERVED_SIGNAL";

export type OutputCardDetailContent = {
  whatItIs: string;
  calculation: string;
  whyItMatters: string;
  actionToTake: string;
};

export type OutputCardRegistryEntry = {
  id: string;
  title: string;
  desc: string;
  tier: 1 | 2;
  gate: OutputGateRule | null;
  insightKey?: string;
  dimensionKey?: ProductDimensionKey;
  badgeId?: string;
  badgeName?: string;
  evidenceSources: readonly OutputEvidenceSource[];
  detail: OutputCardDetailContent;
};

export type OutputSectionRegistryEntry = {
  id: string;
  title: string;
  cards: readonly OutputCardRegistryEntry[];
};

type RuntimeOutputRegistry = Record<
  "firm_baseline_report" | "product_intelligence_report",
  readonly OutputSectionRegistryEntry[]
>;

function withDetail(params: Omit<OutputCardRegistryEntry, "tier" | "detail"> & { tier?: 1 | 2; detail: OutputCardDetailContent }): OutputCardRegistryEntry {
  return {
    tier: params.tier ?? 1,
    ...params,
  };
}

const FIRM_OUTPUT_REGISTRY: readonly OutputSectionRegistryEntry[] = [
  {
    id: "firm_intelligence",
    title: "Firm intelligence",
    cards: [
      withDetail({
        id: "tier1_alignment_baseline",
        insightKey: "tier1_alignment_baseline",
        title: "Alignment Baseline",
        desc: "Where the firm is now, quantified.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "tier1_alignment_baseline" },
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A baseline summary of current firm alignment against the self-owned operating model.",
          calculation: "Derived from the latest firm baseline self-assessment submission and unlocked only when the alignment-baseline insight itself is supported by current capability evidence.",
          whyItMatters: "It gives leadership a truthful starting point before more specific planning or badge interpretation.",
          actionToTake: "Use it to confirm current-state assumptions and identify whether the firm needs sequencing, governance, or operating-rhythm correction first.",
        },
      }),
      withDetail({
        id: "tier1_operating_system_map",
        insightKey: "tier1_operating_system_map",
        title: "Operating System Map",
        desc: "How work actually moves through the firm.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "tier1_operating_system_map" },
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A structured view of how work is routed, reviewed, and completed inside the firm.",
          calculation: "Unlocked from the firm baseline report only when the operating-system-map insight has current capability support in the latest self submission.",
          whyItMatters: "It helps distinguish process design issues from staffing or tooling complaints.",
          actionToTake: "Use it to isolate where work routing, review load, or ownership boundaries need redesign.",
        },
      }),
      withDetail({
        id: "tier1_risk_control_posture",
        insightKey: "tier1_risk_control_posture",
        title: "Risk & Control Posture",
        desc: "Controls, exposure, and governance maturity.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "tier1_risk_control_posture" },
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A focused view of operational risk, control discipline, and governance maturity implied by current self-assessment evidence.",
          calculation: "Unlocked only when the risk-and-control insight is supported by current firm capability evidence rather than by a shared badge alone.",
          whyItMatters: "It keeps control posture tied to actual evidence instead of generic progress labels.",
          actionToTake: "Use it to prioritize control fixes, review ownership boundaries, and decide where automation should remain supervised.",
        },
      }),
      withDetail({
        id: "tier1_implementation_roadmap",
        insightKey: "tier1_implementation_roadmap",
        title: "Implementation Roadmap",
        desc: "Sequenced steps to reach high alignment.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "tier1_implementation_roadmap" },
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A sequenced plan for moving from current alignment to the next stable operating state.",
          calculation: "Unlocked from the latest firm submission when the roadmap insight is supported by current capability evidence.",
          whyItMatters: "It turns a scored assessment into a decision sequence rather than a static scorecard.",
          actionToTake: "Use it to stage changes in an order the firm can actually absorb without widening the review lane or overpromising automation.",
        },
      }),
      withDetail({
        id: "institutional_profile",
        title: "Institutional Profile",
        desc: "Capability scoring and operational alignment snapshot.",
        gate: {
          kind: "ALL_OF",
          conditions: [
            { type: "INSIGHT", insightKey: "tier1_alignment_baseline" },
            { type: "INSIGHT", insightKey: "tier1_operating_system_map" },
          ],
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A higher-level profile card that summarizes firm readiness once the baseline and operating-system evidence are both present.",
          calculation: "Shown only when both the alignment baseline and operating-system-map insights are unlocked, avoiding badge-only release of a broader profile label.",
          whyItMatters: "It prevents a shared Tier 1 badge from being mistaken for institution-specific evidence depth.",
          actionToTake: "Use it as an executive shorthand only after the underlying firm cards are already unlocked and reviewed.",
        },
      }),
      withDetail({
        id: "automation_readiness",
        title: "Automation Readiness",
        desc: "What can be delegated, what must stay human.",
        gate: {
          kind: "ALL_OF",
          conditions: [
            { type: "INSIGHT", insightKey: "tier1_operating_system_map" },
            { type: "INSIGHT", insightKey: "tier1_implementation_roadmap" },
          ],
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A decision support card for separating automatable work from human-review work.",
          calculation: "Unlocked only when workflow-map and implementation-roadmap evidence both exist, rather than from a coarse badge gate.",
          whyItMatters: "Automation claims are riskier than alignment claims; they need clearer operational evidence.",
          actionToTake: "Use it to choose bounded automation candidates and preserve human checkpoints where control risk remains material.",
        },
      }),
      withDetail({
        id: "executive_brief",
        title: "Executive Brief",
        desc: "Board-ready summary and next actions.",
        gate: {
          kind: "ALL_OF",
          conditions: [
            { type: "INSIGHT", insightKey: "tier1_alignment_baseline" },
            { type: "INSIGHT", insightKey: "tier1_risk_control_posture" },
            { type: "INSIGHT", insightKey: "tier1_implementation_roadmap" },
          ],
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A concise summary card for executive and ownership review once core firm evidence is present.",
          calculation: "Released only after baseline, risk-control, and roadmap evidence are all unlocked, not merely because a shared tier badge exists.",
          whyItMatters: "Executive summaries can become misleading if they outrun the underlying evidence set.",
          actionToTake: "Use it for decision review and sponsor conversations only after the underlying cards are already visible and consistent.",
        },
      }),
    ],
  },
] as const;

const PRODUCT_OUTPUT_REGISTRY: readonly OutputSectionRegistryEntry[] = [
  {
    id: "product_intelligence",
    title: "Product intelligence",
    cards: [
      withDetail({
        id: "product_positioning_clarity",
        insightKey: "product_positioning_clarity",
        title: "Product Positioning Clarity",
        desc: "How clearly the product value proposition lands for buyer priorities.",
        dimensionKey: "positioningClarity",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "product_positioning_clarity" },
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A product-level clarity signal for how well the offering maps to priority accounting workflows.",
          calculation: "Drawn from the latest product baseline self submission, its supporting capability rules, and the positioning dimension score when available.",
          whyItMatters: "Weak positioning often shows up before low conversion or low adoption is formally measured.",
          actionToTake: "Use it to tighten product language, priority use cases, and sales-to-implementation continuity.",
        },
      }),
      withDetail({
        id: "product_workflow_fit_snapshot",
        insightKey: "product_workflow_fit_snapshot",
        title: "Workflow Fit Snapshot",
        desc: "Where the product fits naturally into day-to-day accounting workflows.",
        dimensionKey: "workflowFit",
        gate: {
          kind: "ANY_OF",
          conditions: [
            { type: "INSIGHT", insightKey: "product_workflow_fit_snapshot" },
            { type: "OBSERVED_SIGNAL", cardId: "product_workflow_fit_snapshot" },
          ],
        },
        evidenceSources: ["SELF_SIGNAL", "OBSERVED_SIGNAL"],
        detail: {
          whatItIs: "A blended fit indicator showing where self-assessed workflow fit is confirmed or challenged by sponsor-visible observed signal.",
          calculation: "Unlocked by either the product workflow-fit insight or qualifying observed sponsor review signal for the same card ID. It does not unlock from the shared product badge alone.",
          whyItMatters: "Workflow fit is stronger when both the vendor narrative and sponsor evidence point in the same direction.",
          actionToTake: "Use it to identify whether the product should be repositioned, reimplemented, or supported with narrower buyer guidance.",
        },
      }),
      withDetail({
        id: "product_integration_readiness",
        insightKey: "product_integration_readiness",
        title: "Integration Readiness",
        desc: "Current readiness of integrations required for scale adoption.",
        dimensionKey: "integrationReadiness",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "product_integration_readiness" },
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A readiness signal for the integration work needed to support repeatable adoption.",
          calculation: "Driven by the product baseline self-submission, capability rules tied to the integration insight, and the integration dimension score when present.",
          whyItMatters: "Integration drag often blocks deployment quality even when the product demo story is strong.",
          actionToTake: "Use it to decide whether integration support, documentation, or partner enablement needs strengthening before broader rollout.",
        },
      }),
      withDetail({
        id: "product_onboarding_friction_estimate",
        insightKey: "product_onboarding_friction_estimate",
        title: "Onboarding Friction Estimate",
        desc: "Likely friction points from purchase to first operational value.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "product_onboarding_friction_estimate" },
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A friction estimate for the path from commitment to first operational value.",
          calculation: "Unlocked only from the onboarding-friction insight supported by current self-assessment evidence.",
          whyItMatters: "Onboarding quality materially affects retention, sponsor trust, and observed-signal reliability.",
          actionToTake: "Use it to reduce setup steps, clarify ownership, and tighten early-value checkpoints.",
        },
      }),
      withDetail({
        id: "product_support_confidence_signal",
        insightKey: "product_support_confidence_signal",
        title: "Support Confidence Signal",
        desc: "Trust signal based on expected quality and consistency of support.",
        dimensionKey: "supportConfidence",
        gate: {
          kind: "ANY_OF",
          conditions: [
            { type: "INSIGHT", insightKey: "product_support_confidence_signal" },
            { type: "OBSERVED_SIGNAL", cardId: "product_support_confidence_signal" },
          ],
        },
        evidenceSources: ["SELF_SIGNAL", "OBSERVED_SIGNAL"],
        detail: {
          whatItIs: "A support-confidence view that can be unlocked by either self evidence or sponsor-visible observed signal for the support card.",
          calculation: "Released from the support-confidence insight or from qualifying observed review evidence tied to the same card ID. Shared badges do not unlock it by themselves.",
          whyItMatters: "Support quality is often where sponsor experience diverges from vendor self-perception.",
          actionToTake: "Use it to adjust escalation design, support staffing, documentation, or customer-expectation setting.",
        },
      }),
      withDetail({
        id: "product_gtm_readiness_summary",
        insightKey: "product_gtm_readiness_summary",
        title: "Product GTM Readiness Summary",
        desc: "A concise readiness view for rollout and customer-facing launch motions.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "product_gtm_readiness_summary" },
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A rollout-readiness summary derived from the product baseline evidence set.",
          calculation: "Unlocked only when the GTM-readiness insight itself is supported. The shared product badge is not treated as sufficient release evidence for this summary card.",
          whyItMatters: "Readiness summaries become misleading if they are released before the product-specific capability evidence exists.",
          actionToTake: "Use it to decide whether to accelerate, narrow, or delay broader customer-facing rollout.",
        },
      }),
      withDetail({
        id: "product_improvement_priorities",
        insightKey: "product_improvement_priorities",
        title: "Product Improvement Priorities",
        desc: "Sequenced product-level priorities most likely to improve fit and retention.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "product_improvement_priorities" },
        },
        evidenceSources: ["SELF_SIGNAL"],
        detail: {
          whatItIs: "A ranked view of product changes most likely to improve workflow fit and sponsor confidence.",
          calculation: "Unlocked from the product-improvement insight itself, not from a general product badge.",
          whyItMatters: "Priority lists are only useful when they stay attached to product-specific evidence.",
          actionToTake: "Use it to sequence product, onboarding, support, or integration improvements in a way leadership can actually fund and verify.",
        },
      }),
    ],
  },
  {
    id: "observed_market_signal",
    title: "Observed market signal",
    cards: [
      withDetail({
        id: "observed_market_signal_summary",
        title: "Observed Market Signal Summary",
        desc: "Sponsor-firm review rollup for this product.",
        gate: {
          kind: "OBSERVED_SIGNAL_ONLY",
          observedSignal: { type: "OBSERVED_SIGNAL", cardId: "observed_market_signal_summary" },
        },
        evidenceSources: ["OBSERVED_SIGNAL"],
        detail: {
          whatItIs: "A product-level rollup of trusted sponsor-firm observed reviews.",
          calculation: "Shown only when qualifying observed signal exists for the product under the trusted external-review policy.",
          whyItMatters: "It gives vendors and firms a cleaner observed lane without contaminating the self-assessment lane.",
          actionToTake: "Use it to compare self claims against sponsor-visible field evidence and decide where further evidence gathering is needed.",
        },
      }),
      withDetail({
        id: "observed_market_confidence",
        title: "Observed Market Confidence",
        desc: "Confidence level based on sponsor-firm review volume and signal quality.",
        gate: {
          kind: "OBSERVED_SIGNAL_ONLY",
          observedSignal: { type: "OBSERVED_SIGNAL", cardId: "observed_market_confidence" },
        },
        evidenceSources: ["OBSERVED_SIGNAL"],
        detail: {
          whatItIs: "A confidence card for interpreting how much weight to place on the observed market signal.",
          calculation: "Derived only from trusted observed-review volume and quality metrics, never from self badges or self insight unlocks.",
          whyItMatters: "Observed evidence should not be over-read when review count or integrity is still thin.",
          actionToTake: "Use it to decide whether current observed signal is strong enough for product claims or still requires more sponsor evidence.",
        },
      }),
    ],
  },
] as const;

const OUTPUT_REGISTRY: RuntimeOutputRegistry = {
  firm_baseline_report: FIRM_OUTPUT_REGISTRY,
  product_intelligence_report: PRODUCT_OUTPUT_REGISTRY,
};

export function getOutputSectionsForReportProfile(reportProfileKey: AssessmentReportProfileKey) {
  return OUTPUT_REGISTRY[reportProfileKey as keyof RuntimeOutputRegistry] ?? [];
}

export function getOutputSectionsForAssessmentTarget(target: { productId: string | null }) {
  return target.productId
    ? getOutputSectionsForReportProfile("product_intelligence_report")
    : getOutputSectionsForReportProfile("firm_baseline_report");
}

export function getOutputCardRouteKey(card: OutputCardRegistryEntry) {
  return card.insightKey ?? card.id;
}

export function findOutputCardForReportProfile(reportProfileKey: AssessmentReportProfileKey, routeKey: string) {
  const sections = getOutputSectionsForReportProfile(reportProfileKey);
  for (const section of sections) {
    for (const card of section.cards) {
      if (getOutputCardRouteKey(card) === routeKey) {
        return { section, card };
      }
    }
  }

  return null;
}
