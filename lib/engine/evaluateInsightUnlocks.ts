import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getDefaultReportProfileForAssessmentTarget } from "@/lib/report-profiles";
import { INSIGHT_UNLOCK_CONFIG } from "@/lib/insight-unlock-config";

type EvaluateInsightUnlocksInput = {
  companyId: string;
  productId: string | null;
};

type EvaluatedInsightUnlock = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
};

export async function evaluateAndPersistUnlockedInsights(
  input: EvaluateInsightUnlocksInput
) {
  const reportProfile = getDefaultReportProfileForAssessmentTarget({
    productId: input.productId,
  });

  if (!reportProfile) {
    return { unlocked: [] as EvaluatedInsightUnlock[], reportProfileKey: null };
  }

  const profileEntries = INSIGHT_UNLOCK_CONFIG.filter(
    (entry) => entry.reportProfileKey === reportProfile.key
  );

  if (profileEntries.length === 0) {
    return { unlocked: [] as EvaluatedInsightUnlock[], reportProfileKey: reportProfile.key };
  }

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: reportProfile.primaryModuleKey },
    select: { id: true, key: true },
  });

  if (!moduleRecord) {
    return { unlocked: [] as EvaluatedInsightUnlock[], reportProfileKey: reportProfile.key };
  }

  const badgeIds = [...new Set(profileEntries.map((entry) => entry.badgeId))];
  const earnedBadges = await prisma.companyBadge.findMany({
    where: {
      companyId: input.companyId,
      productId: input.productId,
      moduleId: moduleRecord.id,
      badgeId: { in: badgeIds },
    },
    select: { id: true, badgeId: true },
  });
  const earnedBadgeById = new Map(earnedBadges.map((badge) => [badge.badgeId, badge]));

  const insightKeys = profileEntries.map((entry) => entry.insightKey);
  const insights = await prisma.insight.findMany({
    where: { key: { in: insightKeys }, active: true },
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      title: true,
      body: true,
      tier: true,
      InsightCapabilityRule: {
        select: {
          nodeId: true,
          minScore: true,
          required: true,
          CapabilityNode: { select: { key: true } },
        },
      },
    },
  });

  const latestSubmission = await prisma.surveySubmission.findFirst({
    where: {
      companyId: input.companyId,
      productId: input.productId,
      moduleId: moduleRecord.id,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const capabilityScores = await prisma.companyCapabilityScore.findMany({
    where: {
      companyId: input.companyId,
      productId: input.productId,
      moduleId: moduleRecord.id,
      sourceType: "SELF_SUBMISSION",
    },
    orderBy: { computedAt: "desc" },
    select: {
      nodeId: true,
      score: true,
      surveySubmissionId: true,
      CapabilityNode: { select: { key: true } },
    },
  });

  const scoreByCapabilityKey = new Map(
    capabilityScores.map((row) => [
      row.CapabilityNode.key,
      {
        nodeId: row.nodeId,
        score: row.score,
        surveySubmissionId: row.surveySubmissionId,
      },
    ])
  );

  const unlocked: EvaluatedInsightUnlock[] = [];

  for (const insight of insights) {
    const config = profileEntries.find((entry) => entry.insightKey === insight.key);
    if (!config) {
      continue;
    }

    const earnedBadge = earnedBadgeById.get(config.badgeId) ?? null;
    if (!earnedBadge) {
      continue;
    }

    const matchedRules = insight.InsightCapabilityRule.filter((rule) =>
      config.capabilityKeys.includes(rule.CapabilityNode.key)
    );

    const hasAllEvidence =
      matchedRules.length > 0 &&
      matchedRules.every((rule) => {
        const scoreEntry = scoreByCapabilityKey.get(rule.CapabilityNode.key);
        if (!scoreEntry) {
          return false;
        }
        if (!rule.required) {
          return true;
        }
        return scoreEntry.score >= rule.minScore;
      });

    if (!hasAllEvidence) {
      continue;
    }

    const evidenceKey = `insight_unlock:${insight.key}`;
    const representativeSource =
      matchedRules
        .map((rule) => scoreByCapabilityKey.get(rule.CapabilityNode.key)?.surveySubmissionId ?? null)
        .find((value): value is string => typeof value === "string" && value.length > 0) ??
      latestSubmission?.id ??
      null;

    const existingEvidence = await prisma.unlockEvidence.findFirst({
      where: {
        companyBadgeId: earnedBadge.id,
        ruleKey: evidenceKey,
      },
      select: { id: true },
    });

    const detailsJson = {
      insightKey: insight.key,
      reportProfileKey: reportProfile.key,
      moduleKey: moduleRecord.key,
      badgeId: config.badgeId,
      capabilityEvidence: matchedRules.map((rule) => ({
        capabilityKey: rule.CapabilityNode.key,
        minScore: rule.minScore,
        score: scoreByCapabilityKey.get(rule.CapabilityNode.key)?.score ?? null,
      })),
    };

    if (existingEvidence) {
      await prisma.unlockEvidence.update({
        where: { id: existingEvidence.id },
        data: {
          sourceType: config.sourceType,
          surveySubmissionId: representativeSource,
          detailsJson,
        },
      });
    } else {
      await prisma.unlockEvidence.create({
        data: {
          id: randomUUID(),
          companyBadgeId: earnedBadge.id,
          sourceType: config.sourceType,
          surveySubmissionId: representativeSource,
          ruleKey: evidenceKey,
          detailsJson,
        },
      });
    }

    unlocked.push({
      id: insight.id,
      key: insight.key,
      title: insight.title,
      body: insight.body,
      tier: insight.tier,
    });
  }

  return { unlocked, reportProfileKey: reportProfile.key };
}
