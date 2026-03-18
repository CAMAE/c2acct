export type OutputGateRuleKind =
  | "BADGE_ONLY"
  | "INSIGHT_ONLY"
  | "ANY_OF"
  | "ALL_OF"
  | "OBSERVED_SIGNAL_ONLY";

export type OutputGateOperand =
  | {
      type: "BADGE";
      badgeId?: string;
      badgeName?: string;
    }
  | {
      type: "INSIGHT";
      insightKey: string;
    }
  | {
      type: "OBSERVED_SIGNAL";
      cardId: string;
    };

export type OutputGateRule =
  | {
      kind: "BADGE_ONLY";
      badge: Extract<OutputGateOperand, { type: "BADGE" }>;
    }
  | {
      kind: "INSIGHT_ONLY";
      insight: Extract<OutputGateOperand, { type: "INSIGHT" }>;
    }
  | {
      kind: "OBSERVED_SIGNAL_ONLY";
      observedSignal: Extract<OutputGateOperand, { type: "OBSERVED_SIGNAL" }>;
    }
  | {
      kind: "ANY_OF" | "ALL_OF";
      conditions: readonly OutputGateOperand[];
    };

export type OutputGateEvaluationContext = {
  badgeKeys: Set<string>;
  unlockedInsightKeys: Set<string>;
  observedSignalCardIds: Set<string>;
};

export const OUTPUT_GATE_RULE_KINDS: readonly OutputGateRuleKind[] = [
  "BADGE_ONLY",
  "INSIGHT_ONLY",
  "ANY_OF",
  "ALL_OF",
  "OBSERVED_SIGNAL_ONLY",
] as const;

function normalizeBadgeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function operandPasses(operand: OutputGateOperand, context: OutputGateEvaluationContext) {
  if (operand.type === "INSIGHT") {
    return context.unlockedInsightKeys.has(operand.insightKey);
  }

  if (operand.type === "OBSERVED_SIGNAL") {
    return context.observedSignalCardIds.has(operand.cardId);
  }

  const badgeIdKey = operand.badgeId?.trim()
    ? `id:${operand.badgeId.trim().toLowerCase()}`
    : null;
  const badgeNameKey = operand.badgeName?.trim()
    ? `name:${normalizeBadgeName(operand.badgeName)}`
    : null;

  return Boolean(
    (badgeIdKey && context.badgeKeys.has(badgeIdKey)) ||
      (badgeNameKey && context.badgeKeys.has(badgeNameKey))
  );
}

export function evaluateOutputGateRule(
  rule: OutputGateRule | null | undefined,
  context: OutputGateEvaluationContext
) {
  if (!rule) {
    return true;
  }

  if (rule.kind === "BADGE_ONLY") {
    return operandPasses(rule.badge, context);
  }

  if (rule.kind === "INSIGHT_ONLY") {
    return operandPasses(rule.insight, context);
  }

  if (rule.kind === "OBSERVED_SIGNAL_ONLY") {
    return operandPasses(rule.observedSignal, context);
  }

  if (rule.conditions.length === 0) {
    return false;
  }

  return rule.kind === "ALL_OF"
    ? rule.conditions.every((condition) => operandPasses(condition, context))
    : rule.conditions.some((condition) => operandPasses(condition, context));
}

function describeOperand(operand: OutputGateOperand) {
  if (operand.type === "INSIGHT") {
    return `insight:${operand.insightKey}`;
  }

  if (operand.type === "OBSERVED_SIGNAL") {
    return `observed:${operand.cardId}`;
  }

  if (operand.badgeName?.trim()) {
    return `badge:${operand.badgeName.trim()}`;
  }

  return `badge:${operand.badgeId ?? "unknown"}`;
}

export function summarizeOutputGateRule(rule: OutputGateRule | null | undefined) {
  if (!rule) {
    return "No gate";
  }

  if (rule.kind === "BADGE_ONLY") {
    return `Requires ${describeOperand(rule.badge)}`;
  }

  if (rule.kind === "INSIGHT_ONLY") {
    return `Requires ${describeOperand(rule.insight)}`;
  }

  if (rule.kind === "OBSERVED_SIGNAL_ONLY") {
    return `Requires ${describeOperand(rule.observedSignal)}`;
  }

  const joined = rule.conditions.map((condition) => describeOperand(condition)).join(rule.kind === "ALL_OF" ? " + " : " or ");
  return rule.kind === "ALL_OF" ? `Requires all of ${joined}` : `Requires any of ${joined}`;
}
