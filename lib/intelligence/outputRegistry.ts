import type { AssessmentReportProfileKey } from "@/lib/assessment-module-catalog";
import type { ProductDimensionKey } from "@/lib/productOutputScoring";
import { INSIGHT_UNLOCK_CONFIG_BY_KEY } from "@/lib/insight-unlock-config";
import type { OutputGateRule } from "@/lib/intelligence/outputGates";
import { RUNTIME_BADGES } from "@/lib/intelligence/runtimeConfig";

export type OutputCardRegistryEntry = {
  id: string;
  title: string;
  desc: string;
  gate: OutputGateRule | null;
  insightKey?: string;
  dimensionKey?: ProductDimensionKey;
  badgeId?: string;
  badgeName?: string;
  evidenceSources: readonly ("SELF_SIGNAL" | "OBSERVED_SIGNAL")[];
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

function getInsightBadgeMeta(insightKey: string) {
  const entry = INSIGHT_UNLOCK_CONFIG_BY_KEY.get(insightKey);
  return entry
    ? {
        badgeId: entry.badgeId,
        badgeName: entry.badgeName,
      }
    : null;
}

function createInsightCard(params: {
  insightKey: string;
  title: string;
  desc: string;
  gate: OutputGateRule;
  dimensionKey?: ProductDimensionKey;
  evidenceSources?: readonly ("SELF_SIGNAL" | "OBSERVED_SIGNAL")[];
}): OutputCardRegistryEntry {
  const badgeMeta = getInsightBadgeMeta(params.insightKey);

  return {
    id: params.insightKey,
    title: params.title,
    desc: params.desc,
    insightKey: params.insightKey,
    dimensionKey: params.dimensionKey,
    gate: params.gate,
    badgeId: badgeMeta?.badgeId,
    badgeName: badgeMeta?.badgeName,
    evidenceSources: params.evidenceSources ?? ["SELF_SIGNAL"],
  };
}

const FIRM_OUTPUT_REGISTRY: readonly OutputSectionRegistryEntry[] = [
  {
    id: "firm_intelligence",
    title: "Firm intelligence",
    cards: [
      createInsightCard({
        insightKey: "tier1_alignment_baseline",
        title: "Alignment Baseline",
        desc: "Where the firm is now, quantified.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "tier1_alignment_baseline" },
        },
      }),
      createInsightCard({
        insightKey: "tier1_operating_system_map",
        title: "Operating System Map",
        desc: "How work actually moves through the firm.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "tier1_operating_system_map" },
        },
      }),
      createInsightCard({
        insightKey: "tier1_risk_control_posture",
        title: "Risk & Control Posture",
        desc: "Controls, exposure, and governance maturity.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "tier1_risk_control_posture" },
        },
      }),
      createInsightCard({
        insightKey: "tier1_implementation_roadmap",
        title: "Implementation Roadmap",
        desc: "Sequenced steps to reach high alignment.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "tier1_implementation_roadmap" },
        },
      }),
      {
        id: "institutional_profile",
        title: "Institutional Profile",
        desc: "Capability scoring and operational alignment snapshot.",
        gate: {
          kind: "BADGE_ONLY",
          badge: {
            type: "BADGE",
            badgeId: RUNTIME_BADGES.tier1.id,
            badgeName: RUNTIME_BADGES.tier1.name,
          },
        },
        badgeId: RUNTIME_BADGES.tier1.id,
        badgeName: RUNTIME_BADGES.tier1.name,
        evidenceSources: ["SELF_SIGNAL"],
      },
      {
        id: "automation_readiness",
        title: "Automation Readiness",
        desc: "What can be delegated, what must stay human.",
        gate: {
          kind: "ANY_OF",
          conditions: [
            {
              type: "BADGE",
              badgeId: RUNTIME_BADGES.tier1.id,
              badgeName: RUNTIME_BADGES.tier1.name,
            },
            { type: "INSIGHT", insightKey: "tier1_operating_system_map" },
          ],
        },
        badgeId: RUNTIME_BADGES.tier1.id,
        badgeName: RUNTIME_BADGES.tier1.name,
        evidenceSources: ["SELF_SIGNAL"],
      },
      {
        id: "executive_brief",
        title: "Executive Brief",
        desc: "Board-ready summary and next actions.",
        gate: {
          kind: "BADGE_ONLY",
          badge: {
            type: "BADGE",
            badgeId: RUNTIME_BADGES.tier1.id,
            badgeName: RUNTIME_BADGES.tier1.name,
          },
        },
        badgeId: RUNTIME_BADGES.tier1.id,
        badgeName: RUNTIME_BADGES.tier1.name,
        evidenceSources: ["SELF_SIGNAL"],
      },
    ],
  },
] as const;

const PRODUCT_OUTPUT_REGISTRY: readonly OutputSectionRegistryEntry[] = [
  {
    id: "product_intelligence",
    title: "Product intelligence",
    cards: [
      createInsightCard({
        insightKey: "product_positioning_clarity",
        title: "Product Positioning Clarity",
        desc: "How clearly the product value proposition lands for buyer priorities.",
        dimensionKey: "positioningClarity",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "product_positioning_clarity" },
        },
      }),
      createInsightCard({
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
      }),
      createInsightCard({
        insightKey: "product_integration_readiness",
        title: "Integration Readiness",
        desc: "Current readiness of integrations required for scale adoption.",
        dimensionKey: "integrationReadiness",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "product_integration_readiness" },
        },
      }),
      createInsightCard({
        insightKey: "product_onboarding_friction_estimate",
        title: "Onboarding Friction Estimate",
        desc: "Likely friction points from purchase to first operational value.",
        gate: {
          kind: "INSIGHT_ONLY",
          insight: { type: "INSIGHT", insightKey: "product_onboarding_friction_estimate" },
        },
      }),
      createInsightCard({
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
      }),
      createInsightCard({
        insightKey: "product_gtm_readiness_summary",
        title: "Product GTM Readiness Summary",
        desc: "A concise readiness view for rollout and customer-facing launch motions.",
        gate: {
          kind: "ALL_OF",
          conditions: [
            {
              type: "BADGE",
              badgeId: RUNTIME_BADGES.product.id,
              badgeName: RUNTIME_BADGES.product.name,
            },
            { type: "INSIGHT", insightKey: "product_gtm_readiness_summary" },
          ],
        },
        evidenceSources: ["SELF_SIGNAL"],
      }),
      createInsightCard({
        insightKey: "product_improvement_priorities",
        title: "Product Improvement Priorities",
        desc: "Sequenced product-level priorities most likely to improve fit and retention.",
        gate: {
          kind: "ALL_OF",
          conditions: [
            {
              type: "BADGE",
              badgeId: RUNTIME_BADGES.product.id,
              badgeName: RUNTIME_BADGES.product.name,
            },
            { type: "INSIGHT", insightKey: "product_improvement_priorities" },
          ],
        },
        evidenceSources: ["SELF_SIGNAL"],
      }),
    ],
  },
  {
    id: "observed_market_signal",
    title: "Observed market signal",
    cards: [
      {
        id: "observed_market_signal_summary",
        title: "Observed Market Signal Summary",
        desc: "Sponsor-firm review rollup for this product.",
        gate: {
          kind: "OBSERVED_SIGNAL_ONLY",
          observedSignal: { type: "OBSERVED_SIGNAL", cardId: "observed_market_signal_summary" },
        },
        evidenceSources: ["OBSERVED_SIGNAL"],
      },
      {
        id: "observed_market_confidence",
        title: "Observed Market Confidence",
        desc: "Confidence level based on sponsor-firm review volume and signal quality.",
        gate: {
          kind: "OBSERVED_SIGNAL_ONLY",
          observedSignal: { type: "OBSERVED_SIGNAL", cardId: "observed_market_confidence" },
        },
        evidenceSources: ["OBSERVED_SIGNAL"],
      },
    ],
  },
] as const;

const OUTPUT_REGISTRY: RuntimeOutputRegistry = {
  firm_baseline_report: FIRM_OUTPUT_REGISTRY,
  product_intelligence_report: PRODUCT_OUTPUT_REGISTRY,
};

export function getOutputSectionsForReportProfile(
  reportProfileKey: AssessmentReportProfileKey
) {
  return OUTPUT_REGISTRY[reportProfileKey as keyof RuntimeOutputRegistry] ?? [];
}

export function getOutputSectionsForAssessmentTarget(target: {
  productId: string | null;
}) {
  return target.productId
    ? getOutputSectionsForReportProfile("product_intelligence_report")
    : getOutputSectionsForReportProfile("firm_baseline_report");
}
