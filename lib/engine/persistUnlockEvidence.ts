import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

type DbExecutor = Prisma.TransactionClient;

type CreateSelfSubmissionUnlockEvidenceInput = {
  tx: DbExecutor;
  companyBadgeId: string;
  surveySubmissionId: string;
  moduleId: string;
  badgeId: string;
  requiredMinScore: number;
  achievedScore: number;
};

export async function createSelfSubmissionUnlockEvidence(
  input: CreateSelfSubmissionUnlockEvidenceInput
) {
  const {
    tx,
    companyBadgeId,
    surveySubmissionId,
    moduleId,
    badgeId,
    requiredMinScore,
    achievedScore,
  } = input;

  return tx.unlockEvidence.create({
    data: {
      id: randomUUID(),
      companyBadgeId,
      sourceType: "SELF_SUBMISSION",
      surveySubmissionId,
      ruleKey: "badge_rule_min_score",
      detailsJson: {
        moduleId,
        badgeId,
        requiredMinScore,
        achievedScore,
      },
    },
  });
}
