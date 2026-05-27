import { CapabilityLevel, CapabilityScope } from "@prisma/client";

export const FIRM_DOMAIN_CAPABILITY_DEFINITIONS = {
  "operating-model": {
    key: "firm_capability_operating_model_discipline",
    title: "Operating model discipline",
    description:
      "The firm defines workflows clearly, runs them consistently, and maintains accountable operating ownership.",
  },
  "automation-ai": {
    key: "firm_capability_automation_ai_readiness",
    title: "Automation and AI readiness",
    description:
      "The firm can adopt automation and AI responsibly with practical controls, team readiness, and grounded execution.",
  },
  "data-flow": {
    key: "firm_capability_data_flow_integration",
    title: "Data flow and integration maturity",
    description:
      "Systems, data handoffs, and operating continuity connect reliably enough to support live delivery and insight.",
  },
  governance: {
    key: "firm_capability_governance_controls",
    title: "Governance and control discipline",
    description:
      "The firm governs controls, risk, and third-party exposure with clear oversight and dependable operational discipline.",
  },
  strategy: {
    key: "firm_capability_strategy_change_alignment",
    title: "Strategy and change alignment",
    description:
      "The firm can prioritize well, absorb change, and stay aligned to current market and client pressure.",
  },
} as const;

export const FIRM_SHARED_CAPABILITY_DEFINITIONS = [
  {
    key: "firm_capability_operating_clarity",
    title: "Operating clarity",
    description:
      "Roles, ownership, and the current-state operating approach are defined clearly enough to support repeatable execution.",
  },
  {
    key: "firm_capability_execution_consistency",
    title: "Execution consistency",
    description:
      "Teams execute with dependable handoffs, manageable friction, and repeatable delivery discipline.",
  },
  {
    key: "firm_capability_measurement_visibility",
    title: "Measurement and visibility",
    description:
      "Leaders and teams can see performance, signal quality, and measurable value clearly enough to steer the business.",
  },
  {
    key: "firm_capability_control_resilience",
    title: "Control and resilience",
    description:
      "Controls, escalation paths, risk surfacing, and resilience under pressure are strong enough to protect live operations.",
  },
  {
    key: "firm_capability_change_enablement",
    title: "Change enablement",
    description:
      "The firm can absorb new tools, new practices, and next-stage operating change without destabilizing delivery.",
  },
  {
    key: "firm_capability_strategic_alignment",
    title: "Strategic alignment",
    description:
      "Current work stays aligned to firm strategy, market pressure, and externally visible priorities.",
  },
] as const;

const FIRM_SHARED_CAPABILITY_KEYS_BY_STEM_INDEX = [
  "firm_capability_operating_clarity",
  "firm_capability_execution_consistency",
  "firm_capability_measurement_visibility",
  "firm_capability_control_resilience",
  "firm_capability_execution_consistency",
  "firm_capability_execution_consistency",
  "firm_capability_change_enablement",
  "firm_capability_change_enablement",
  "firm_capability_measurement_visibility",
  "firm_capability_change_enablement",
  "firm_capability_control_resilience",
  "firm_capability_control_resilience",
  "firm_capability_change_enablement",
  "firm_capability_operating_clarity",
  "firm_capability_control_resilience",
  "firm_capability_measurement_visibility",
  "firm_capability_control_resilience",
  "firm_capability_strategic_alignment",
  "firm_capability_change_enablement",
  "firm_capability_change_enablement",
] as const;

export const FIRM_CAPABILITY_DEFINITIONS = [
  ...Object.values(FIRM_DOMAIN_CAPABILITY_DEFINITIONS).map((definition) => ({
    ...definition,
    scope: CapabilityScope.FIRM,
    level: CapabilityLevel.TIER1,
    weight: 1,
  })),
  ...FIRM_SHARED_CAPABILITY_DEFINITIONS.map((definition) => ({
    ...definition,
    scope: CapabilityScope.FIRM,
    level: CapabilityLevel.TIER1,
    weight: 1,
  })),
] as const;

export const FIRM_TIER1_INSIGHT_CAPABILITY_RULES = {
  firm_tier1_operating_baseline: [
    { key: "firm_capability_operating_model_discipline", minScore: 60 },
    { key: "firm_capability_execution_consistency", minScore: 60 },
    { key: "firm_capability_measurement_visibility", minScore: 60 },
  ],
  firm_tier1_automation_readiness: [
    { key: "firm_capability_automation_ai_readiness", minScore: 65 },
    { key: "firm_capability_change_enablement", minScore: 60 },
  ],
  firm_tier1_data_and_controls: [
    { key: "firm_capability_data_flow_integration", minScore: 65 },
    { key: "firm_capability_governance_controls", minScore: 65 },
    { key: "firm_capability_control_resilience", minScore: 60 },
  ],
  firm_tier1_change_alignment: [
    { key: "firm_capability_strategy_change_alignment", minScore: 65 },
    { key: "firm_capability_strategic_alignment", minScore: 60 },
    { key: "firm_capability_change_enablement", minScore: 60 },
  ],
} as const;

export function getFirmDomainCapabilityKey(sectionKey: keyof typeof FIRM_DOMAIN_CAPABILITY_DEFINITIONS) {
  return FIRM_DOMAIN_CAPABILITY_DEFINITIONS[sectionKey].key;
}

export function getFirmModuleCapabilityKeys(
  sectionKey: keyof typeof FIRM_DOMAIN_CAPABILITY_DEFINITIONS
) {
  return [getFirmDomainCapabilityKey(sectionKey)];
}

export function getFirmQuestionCapabilityKeys(
  sectionKey: keyof typeof FIRM_DOMAIN_CAPABILITY_DEFINITIONS,
  stemIndex: number
) {
  const domainKey = getFirmDomainCapabilityKey(sectionKey);
  const sharedKey = FIRM_SHARED_CAPABILITY_KEYS_BY_STEM_INDEX[stemIndex];
  if (!sharedKey) {
    throw new Error(`Unsupported firm question stem index: ${stemIndex}`);
  }

  return [domainKey, sharedKey];
}
