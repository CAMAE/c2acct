import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  FIRM_FOLLOWUP_MC_QUESTIONS,
  FIRM_FOLLOWUP_MC_VERSION,
  type FollowUpQuestion,
} from "@/lib/assessment/firmFollowUpOptions";

/**
 * V3 box 7.2 (2026-09-09): one firm in the review ecosystem carries follow-up
 * OPTION answers (not free text), so the MC consumer surfaces from 71054ed2
 * (consultant firm brief ?panel=follow-ups, briefings, ecosystem picks,
 * /admin/followup-other) have rows to render locally.
 *
 * Firm: the review consultant's (review.consultant@pat.local) ecosystem, first
 * member firm by name with a submission for every firm module — locally
 * that is "Atlas Family Office Services" (32 rows across 5 submissions). For each latest submission per module, one
 * AssessmentItemResponse row per registry option picked; deterministic picks
 * (SINGLE → option index (question.index - 1) mod choices; MULTI → that one
 * plus the next), one "Other" write-in on the first MULTI question so the
 * Other-rate gauge has a non-zero row. Idempotent: skips a submission that
 * already has option rows.
 */
export const REVIEW_ECOSYSTEM_CONSULTANT_EMAIL = "review.consultant@pat.local";

function pickOptionKeys(question: FollowUpQuestion): { keys: string[]; otherText: string | null } {
  const choices = question.options.filter((option) => option.kind === "choice");
  if (choices.length === 0) return { keys: [], otherText: null };
  const first = choices[(question.index - 1) % choices.length];
  if (question.selectionMode === "SINGLE") return { keys: [first.key], otherText: null };
  const second = choices[question.index % choices.length];
  const keys = second.key === first.key ? [first.key] : [first.key, second.key];
  return { keys, otherText: null };
}

export async function seedReviewFollowUpOptions(prisma: PrismaClient): Promise<{
  companyId: string;
  companyName: string;
  submissionsSeeded: number;
  rowsWritten: number;
} | null> {
  const consultant = await prisma.user.findUnique({
    where: { email: REVIEW_ECOSYSTEM_CONSULTANT_EMAIL },
    select: { ConsultantProfile: { select: { Ecosystem: { select: { id: true } } } } },
  });
  const ecosystemId = consultant?.ConsultantProfile?.Ecosystem?.id;
  if (!ecosystemId) return null;

  const modules = await prisma.surveyModule.findMany({ select: { id: true, key: true, version: true } });
  const moduleById = new Map(modules.map((entry) => [entry.id, entry]));
  const firmModuleKeys = new Set(FIRM_FOLLOWUP_MC_QUESTIONS.map((question) => question.moduleKey));

  const members = await prisma.ecosystemFirm.findMany({
    where: { ecosystemId },
    select: { FirmCompany: { select: { id: true, name: true } } },
    orderBy: { FirmCompany: { name: "asc" } },
  });

  for (const member of members) {
    const company = member.FirmCompany;
    const submissions = await prisma.surveySubmission.findMany({
      where: { companyId: company.id },
      select: { id: true, moduleId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const latestByModuleKey = new Map<string, { id: string; moduleVersion: number }>();
    for (const submission of submissions) {
      const mod = moduleById.get(submission.moduleId);
      if (!mod || !firmModuleKeys.has(mod.key) || latestByModuleKey.has(mod.key)) continue;
      latestByModuleKey.set(mod.key, { id: submission.id, moduleVersion: mod.version });
    }
    if (latestByModuleKey.size < firmModuleKeys.size) continue;

    let submissionsSeeded = 0;
    let rowsWritten = 0;
    let otherWritten = false;
    for (const [moduleKey, submission] of latestByModuleKey) {
      const existing = await prisma.assessmentItemResponse.count({
        where: { submissionId: submission.id, optionKey: { not: null } },
      });
      if (existing > 0) continue;
      const rows = [];
      for (const question of FIRM_FOLLOWUP_MC_QUESTIONS.filter((q) => q.moduleKey === moduleKey)) {
        const picked = pickOptionKeys(question);
        for (const optionKey of picked.keys) {
          rows.push({
            id: randomUUID(),
            submissionId: submission.id,
            companyId: company.id,
            moduleKey,
            questionKey: question.questionKey,
            questionVersion: submission.moduleVersion,
            optionSetVersion: FIRM_FOLLOWUP_MC_VERSION,
            selectionMode: question.selectionMode,
            optionKey,
            otherText: null,
            numericValue: null,
            orderingSeed: null,
          });
        }
        if (!otherWritten && question.selectionMode === "MULTI") {
          const other = question.options.find((option) => option.kind === "other");
          if (other) {
            rows.push({
              id: randomUUID(),
              submissionId: submission.id,
              companyId: company.id,
              moduleKey,
              questionKey: question.questionKey,
              questionVersion: submission.moduleVersion,
              optionSetVersion: FIRM_FOLLOWUP_MC_VERSION,
              selectionMode: question.selectionMode,
              optionKey: other.key,
              otherText: "Seasonal staffing swings between busy-season and the rest of the year.",
              numericValue: null,
              orderingSeed: null,
            });
            otherWritten = true;
          }
        }
      }
      if (rows.length === 0) continue;
      await prisma.assessmentItemResponse.createMany({ data: rows });
      submissionsSeeded += 1;
      rowsWritten += rows.length;
    }
    return { companyId: company.id, companyName: company.name, submissionsSeeded, rowsWritten };
  }
  return null;
}
