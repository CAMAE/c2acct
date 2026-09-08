import prisma from "@/lib/prisma";
import { buildAssessmentItemResponseRows } from "@/lib/assessment/itemResponses";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

/**
 * Backfill AssessmentItemResponse from existing FINAL firm-module submissions
 * (MC redesign box, Prerequisite Zero).
 *
 *   pnpm exec node --import tsx scripts/assessment/backfill-item-responses.ts           # dry run: counts only
 *   pnpm exec node --import tsx scripts/assessment/backfill-item-responses.ts --apply   # write rows
 *
 * Idempotent: for every submission it processes it deletes that submission's
 * existing rows and re-inserts, so a re-run converges. Reads SurveySubmission.answers
 * as-is (never rewrites it). Recoverable = the answer is a finite number for a
 * SLIDER, non-blank text for a TEXT follow-up, or a follow-up selection object;
 * anything else is counted as skipped, per question.
 */
const apply = process.argv.includes("--apply");

async function main() {
  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((definition) => definition.key);
  const modules = await prisma.surveyModule.findMany({
    where: { key: { in: moduleKeys } },
    select: { id: true, key: true, version: true },
  });
  const totals = {
    modules: modules.length,
    submissionsScanned: 0,
    submissionsWithRows: 0,
    submissionsUnrecoverable: 0,
    rowsBuilt: 0,
    rowsByMode: { SCORED: 0, TEXT: 0, SINGLE: 0, MULTI: 0 } as Record<string, number>,
    skippedItems: 0,
    rowsDeleted: 0,
    rowsWritten: 0,
  };

  for (const surveyModule of modules) {
    const questions = await prisma.surveyQuestion.findMany({
      where: { moduleId: surveyModule.id },
      select: { id: true, key: true, inputType: true },
      orderBy: { order: "asc" },
    });
    const submissions = await prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({ moduleId: surveyModule.id }),
      select: { id: true, companyId: true, version: true, answers: true },
      orderBy: { createdAt: "asc" },
    });

    for (const submission of submissions) {
      totals.submissionsScanned += 1;
      const answers =
        submission.answers && typeof submission.answers === "object" && !Array.isArray(submission.answers)
          ? (submission.answers as Record<string, unknown>)
          : null;
      if (!answers) {
        totals.submissionsUnrecoverable += 1;
        continue;
      }
      const { rows, skippedQuestionKeys } = buildAssessmentItemResponseRows({
        submissionId: submission.id,
        companyId: submission.companyId,
        moduleKey: surveyModule.key,
        moduleVersion: submission.version,
        questions,
        answers,
      });
      totals.skippedItems += skippedQuestionKeys.length;
      if (rows.length === 0) {
        totals.submissionsUnrecoverable += 1;
        continue;
      }
      totals.submissionsWithRows += 1;
      totals.rowsBuilt += rows.length;
      for (const row of rows) totals.rowsByMode[row.selectionMode] = (totals.rowsByMode[row.selectionMode] ?? 0) + 1;

      if (apply) {
        await prisma.$transaction(async (tx) => {
          const deleted = await tx.assessmentItemResponse.deleteMany({ where: { submissionId: submission.id } });
          totals.rowsDeleted += deleted.count;
          const written = await tx.assessmentItemResponse.createMany({ data: rows });
          totals.rowsWritten += written.count;
        });
      }
    }
  }

  const tableRows = await prisma.assessmentItemResponse.count();
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...totals, tableRowsAfter: tableRows }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
