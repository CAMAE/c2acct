import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import {
  FIRM_FOLLOWUP_MC_QUESTIONS,
  type FollowUpMcAnswer,
  type FollowUpQuestion,
} from "@/lib/assessment/firmFollowUpOptions";
import { buildAssessmentItemResponseRows } from "@/lib/assessment/itemResponses";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

/**
 * hotfix-demo-1 (R59, change 10): the demo firms' module follow-ups are one seeded
 * sentence ("... intentionally demo-seeded for 2026-04-26-pat-demo-ecosystem-v2").
 * For each demo firm's latest FINAL submission per firm module, write one plausible
 * pick per follow-up question — into the stored answer (the FollowUpMcAnswer the
 * live flag-on submit path stores under the TEXT question's id) and into
 * AssessmentItemResponse through the shared row builder the submit route uses —
 * spread across the options, so the Guide and Enterprise "Follow-up picks" panels
 * fill and the briefing's firm disclosure shows selections. Data only, no schema.
 *
 * Picks: SINGLE -> choice[(firmIndex + question.index) mod choices]; MULTI -> that
 * one plus the next; every seventh (firm, question) pair picks "Not a significant
 * issue here"; every eleventh picks "Other" with a short write-in. A submission that
 * already carries option rows for its follow-ups is left alone (idempotent); legacy
 * TEXT rows for the same follow-ups are removed when the picks are written.
 *
 *   DATABASE_URL=... node --import tsx scripts/demo/seed-demo-firm-followup-picks.ts [--apply]
 */
const APPLY = process.argv.includes("--apply");
const SEEDED_SENTENCE = /intentionally demo-seeded for /;
const OTHER_TEXTS = [
  "Partner review queue backs up every quarter close.",
  "Client portals and the GL do not share a client id.",
  "No owner for the firm-wide tool list.",
  "Staff training lags each release.",
];

function pickFor(question: FollowUpQuestion, firmIndex: number, pairIndex: number): FollowUpMcAnswer {
  const choices = question.options.filter((option) => option.kind === "choice");
  const notSignificant = question.options.find((option) => option.kind === "not_significant");
  const other = question.options.find((option) => option.kind === "other");
  if (notSignificant && pairIndex % 7 === 6) return { optionKeys: [notSignificant.key], otherText: null };
  if (other && pairIndex % 11 === 10) return { optionKeys: [other.key], otherText: OTHER_TEXTS[pairIndex % OTHER_TEXTS.length] };
  const first = choices[(firmIndex + question.index) % choices.length];
  if (question.selectionMode === "SINGLE") return { optionKeys: [first.key], otherText: null };
  const second = choices[(firmIndex + question.index + 1) % choices.length];
  return { optionKeys: second.key === first.key ? [first.key] : [first.key, second.key], otherText: null };
}

async function main() {
  console.log(`\n================ DEMO FIRM FOLLOW-UP PICKS — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((definition) => definition.key);
  const modules = await prisma.surveyModule.findMany({
    where: { key: { in: moduleKeys } },
    select: {
      id: true,
      key: true,
      version: true,
      SurveyQuestion: { select: { id: true, key: true, inputType: true } },
    },
  });
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const firms = await prisma.company.findMany({
    where: { type: "FIRM", dataBoundary: "DEMO" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  console.log(`demo firms: ${firms.length}; firm modules: ${modules.length}`);

  const submissions = await prisma.surveySubmission.findMany({
    where: getSurveyFinalWhere({ companyId: { in: firms.map((firm) => firm.id) }, moduleId: { in: modules.map((module) => module.id) } }),
    orderBy: { createdAt: "desc" },
    select: { id: true, companyId: true, moduleId: true, answers: true },
  });
  const latestByFirmModule = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    const key = `${submission.companyId}:${submission.moduleId}`;
    if (!latestByFirmModule.has(key)) latestByFirmModule.set(key, submission);
  }
  const latest = [...latestByFirmModule.values()];
  const existingRows = await prisma.assessmentItemResponse.findMany({
    where: { submissionId: { in: latest.map((submission) => submission.id) }, questionKey: { contains: "_open_" } },
    select: { submissionId: true, selectionMode: true },
  });
  const withOptionRows = new Set(existingRows.filter((row) => row.selectionMode === "SINGLE" || row.selectionMode === "MULTI").map((row) => row.submissionId));

  let submissionsUpdated = 0;
  let picksWritten = 0;
  let rowsWritten = 0;
  let textRowsRemoved = 0;
  let skippedExisting = 0;
  let skippedNotSeeded = 0;
  const optionTally = new Map<string, number>();
  const firmIndexById = new Map(firms.map((firm, index) => [firm.id, index]));
  let pairIndex = 0;

  for (const submission of latest) {
    const surveyModule = moduleById.get(submission.moduleId);
    if (!surveyModule) continue;
    if (withOptionRows.has(submission.id)) {
      skippedExisting += 1;
      continue;
    }
    const answers =
      submission.answers && typeof submission.answers === "object" && !Array.isArray(submission.answers)
        ? { ...(submission.answers as Record<string, unknown>) }
        : null;
    if (!answers) continue;
    const followUps = FIRM_FOLLOWUP_MC_QUESTIONS.filter((question) => question.moduleKey === surveyModule.key);
    const questionIdByKey = new Map(surveyModule.SurveyQuestion.map((question) => [question.key, question.id]));
    const seededKeys = followUps.filter((question) => {
      const id = questionIdByKey.get(question.questionKey);
      const value = id ? answers[id] : undefined;
      return typeof value === "string" && SEEDED_SENTENCE.test(value);
    });
    if (seededKeys.length === 0) {
      skippedNotSeeded += 1;
      continue;
    }
    const firmIndex = firmIndexById.get(submission.companyId) ?? 0;
    const picks: Record<string, FollowUpMcAnswer> = {};
    for (const question of followUps) {
      const id = questionIdByKey.get(question.questionKey);
      if (!id) continue;
      const pick = pickFor(question, firmIndex, pairIndex);
      pairIndex += 1;
      picks[id] = pick;
      answers[id] = pick;
      for (const key of pick.optionKeys) optionTally.set(key, (optionTally.get(key) ?? 0) + 1);
    }
    const { rows } = buildAssessmentItemResponseRows({
      submissionId: submission.id,
      companyId: submission.companyId,
      moduleKey: surveyModule.key,
      moduleVersion: surveyModule.version ?? 1,
      questions: surveyModule.SurveyQuestion.filter((question) => question.id in picks),
      answers: picks,
      newId: randomUUID,
    });
    submissionsUpdated += 1;
    picksWritten += Object.keys(picks).length;
    rowsWritten += rows.length;
    if (APPLY) {
      await prisma.$transaction(async (tx) => {
        const removed = await tx.assessmentItemResponse.deleteMany({
          where: { submissionId: submission.id, questionKey: { contains: "_open_" }, selectionMode: "TEXT" },
        });
        textRowsRemoved += removed.count;
        await tx.surveySubmission.update({ where: { id: submission.id }, data: { answers: answers as object } });
        if (rows.length > 0) await tx.assessmentItemResponse.createMany({ data: rows });
      });
    }
  }

  console.log(`latest final submissions: ${latest.length}; updated: ${submissionsUpdated}; skipped (already option rows): ${skippedExisting}; skipped (not the seeded sentence): ${skippedNotSeeded}`);
  console.log(`picks written: ${picksWritten}; AssessmentItemResponse rows written: ${rowsWritten}; legacy TEXT rows removed: ${APPLY ? textRowsRemoved : "(dry run)"}`);
  const distinctOptions = optionTally.size;
  const perQuestion = new Map<string, Set<string>>();
  for (const key of optionTally.keys()) {
    const question = key.split(".").slice(0, 2).join(".");
    if (!perQuestion.has(question)) perQuestion.set(question, new Set());
    perQuestion.get(question)!.add(key);
  }
  console.log(`distinct options picked: ${distinctOptions} across ${perQuestion.size} questions; options per question: ${[...perQuestion.values()].map((set) => set.size).join(",")}`);
  if (!APPLY) console.log("dry run; re-run with --apply to write");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
