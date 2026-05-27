import prisma from "@/lib/prisma";
import {
  isPrismaMissingSchemaError,
  warnPrismaCompatibilityOnce,
} from "@/lib/prisma-compat";
import { recordPatDiagnostic } from "@/lib/patDiagnostics";

type ScopeInput = {
  companyId: string;
  subjectId?: string | null;
};

export type InsightUnlockEvaluationInput = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
  badgeRuleIds: string[];
  capabilityRules: Array<{ nodeId: string; minScore: number }>;
};

type UnlockEvidence = {
  requiredBadgeIds: string[];
  earnedBadgeIds: string[];
  missingBadgeIds: string[];
  requiredCapabilityRules: Array<{ nodeId: string; minScore: number }>;
  satisfiedCapabilityRules: string[];
  missingCapabilityRules: string[];
};

export type UnlockedInsightRecord = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
  unlocked: boolean;
  unlockReason: "ungated" | "badge_rules" | "capability_rules" | "badge_and_capability_rules";
  evidence: UnlockEvidence;
};

export function resolveUnlockedInsights(input: {
  insights: InsightUnlockEvaluationInput[];
  earnedBadgeIds: Iterable<string>;
  capabilityScores: Iterable<{ nodeId: string; score: number }>;
}): UnlockedInsightRecord[] {
  const earnedBadgeIds = new Set(input.earnedBadgeIds);
  const capabilityScoreByNodeId = new Map(
    Array.from(input.capabilityScores, (capabilityScore) => [capabilityScore.nodeId, capabilityScore.score])
  );

  return input.insights
    .map((insight) => {
      const requiredBadgeIds = insight.badgeRuleIds;
      const missingBadgeIds = requiredBadgeIds.filter((badgeId) => !earnedBadgeIds.has(badgeId));
      const requiredCapabilityRules = insight.capabilityRules;
      const satisfiedCapabilityRules: string[] = [];
      const missingCapabilityRules: string[] = [];

      for (const capabilityRule of requiredCapabilityRules) {
        const actualScore = capabilityScoreByNodeId.get(capabilityRule.nodeId);
        if (typeof actualScore === "number" && actualScore >= capabilityRule.minScore) {
          satisfiedCapabilityRules.push(capabilityRule.nodeId);
        } else {
          missingCapabilityRules.push(capabilityRule.nodeId);
        }
      }

      const badgeRuleSatisfied = requiredBadgeIds.length === 0 || missingBadgeIds.length === 0;
      const capabilityRuleSatisfied =
        requiredCapabilityRules.length === 0 || missingCapabilityRules.length === 0;

      const unlockReason =
        requiredBadgeIds.length > 0 && requiredCapabilityRules.length > 0
          ? "badge_and_capability_rules"
          : requiredBadgeIds.length > 0
            ? "badge_rules"
            : requiredCapabilityRules.length > 0
              ? "capability_rules"
              : "ungated";

      return {
        id: insight.id,
        key: insight.key,
        title: insight.title,
        body: insight.body,
        tier: insight.tier,
        unlocked: badgeRuleSatisfied && capabilityRuleSatisfied,
        unlockReason,
        evidence: {
          requiredBadgeIds,
          earnedBadgeIds: requiredBadgeIds.filter((badgeId) => earnedBadgeIds.has(badgeId)),
          missingBadgeIds,
          requiredCapabilityRules,
          satisfiedCapabilityRules,
          missingCapabilityRules,
        },
      } satisfies UnlockedInsightRecord;
    })
    .filter((insight) => insight.unlocked);
}

export async function evaluateUnlocked(scope: ScopeInput): Promise<UnlockedInsightRecord[]> {
  let earnedBadges: Array<{ badgeId: string }> = [];

  try {
    earnedBadges = await prisma.companyBadge.findMany({
      where: scope.subjectId ? { subjectId: scope.subjectId } : { companyId: scope.companyId },
      select: { badgeId: true },
    });
  } catch (error) {
    if (scope.subjectId && isPrismaMissingSchemaError(error)) {
      warnPrismaCompatibilityOnce(
        "evaluate-unlocked-companybadge-scope",
        "CompanyBadge subject-aware scope is unavailable in the local database. Using the legacy company-backed compatibility scope for unlocked insight evaluation."
      );
      recordPatDiagnostic({
        area: "db_compat",
        level: "warn",
        status: "compat",
        summary: "Insight unlock evaluation used legacy company badge scope.",
        details: {
          subjectScoped: true,
        },
      });
      earnedBadges = await prisma.companyBadge.findMany({
        where: { companyId: scope.companyId },
        select: { badgeId: true },
      });
    } else {
      throw error;
    }
  }

  let insights;
  let capabilityScores;

  try {
    [insights, capabilityScores] = await Promise.all([
      prisma.insight.findMany({
        where: { active: true },
        orderBy: { key: "asc" },
        include: {
          InsightUnlockRule: {
            where: { required: true },
            select: { badgeId: true },
          },
          InsightCapabilityRule: {
            where: { required: true },
            select: { nodeId: true, minScore: true },
          },
        },
      }),
      prisma.companyCapabilityScore.findMany({
        where: { companyId: scope.companyId },
        select: { nodeId: true, score: true },
      }),
    ]);
  } catch (error) {
    if (isPrismaMissingSchemaError(error)) {
      warnPrismaCompatibilityOnce(
        "evaluate-unlocked-missing-tables",
        "One or more PAT insight-layer tables are missing in the local database. Returning an empty unlocked-insights list until local Prisma migrations are applied."
      );
      recordPatDiagnostic({
        area: "db_compat",
        level: "warn",
        status: "compat",
        summary: "Insight unlock evaluation is running without required PAT insight tables.",
        details: {
          subjectScoped: Boolean(scope.subjectId),
        },
      });
      return [];
    }

    throw error;
  }
  const unlocked = resolveUnlockedInsights({
    insights: insights.map((insight) => ({
      id: insight.id,
      key: insight.key,
      title: insight.title,
      body: insight.body,
      tier: insight.tier,
      badgeRuleIds: insight.InsightUnlockRule.map((rule) => rule.badgeId),
      capabilityRules: insight.InsightCapabilityRule.map((rule) => ({
        nodeId: rule.nodeId,
        minScore: rule.minScore,
      })),
    })),
    earnedBadgeIds: earnedBadges.map((badge) => badge.badgeId),
    capabilityScores,
  });

  recordPatDiagnostic({
    area: "firm_unlock_eval",
    level: capabilityScores.length === 0 ? "warn" : "info",
    status: capabilityScores.length === 0 ? "warn" : "ok",
    summary: "Firm insight unlock evaluation completed.",
    details: {
      activeInsightCount: insights.length,
      unlockedInsightCount: unlocked.length,
      earnedBadgeCount: earnedBadges.length,
      capabilityScoreCount: capabilityScores.length,
      subjectScoped: Boolean(scope.subjectId),
    },
  });

  return unlocked;
}
