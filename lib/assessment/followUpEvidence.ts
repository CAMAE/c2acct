import prisma from "@/lib/prisma";
import {
  FIRM_FOLLOWUP_MC_QUESTIONS,
  aggregateFollowUpOptionCounts,
  getFirmFollowUpQuestion,
  isFollowUpMcAnswer,
  type FollowUpOptionKind,
  type FollowUpQuestion,
  type FollowUpSelectionMode,
} from "@/lib/assessment/firmFollowUpOptions";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { isPrismaMissingSchemaError, warnPrismaCompatibilityOnce } from "@/lib/prisma-compat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

/**
 * MC follow-on box (Part B) — the consumer side of AssessmentItemResponse.
 *
 * Three read models, each with a PURE builder (unit-tested) and a Prisma reader:
 *   - firm follow-up EVIDENCE: for one firm, the latest final submission per
 *     module, each of its five follow-ups as a selection (option rows), legacy
 *     text (TEXT row / string answer), or nothing;
 *   - ecosystem AGGREGATE: top-picked option per question with n, over the
 *     latest final submission per firm per module, through the tested exclusion
 *     helper ("Not a significant issue here" and "Other" never count);
 *   - OTHER texts: every "Other" write-in per question with counts and rate —
 *     the Other-rate gauge that tells us where an option set is missing a row.
 *
 * Nothing here reads the flag: the pages that mount these panels do.
 */
export type FollowUpEvidenceOption = {
  key: string;
  label: string;
  consequence: string | null;
  kind: FollowUpOptionKind;
};

export type FollowUpEvidenceItem = {
  questionKey: string;
  index: number;
  stem: string;
  selectionMode: FollowUpSelectionMode;
  kind: "selection" | "text" | "none";
  options: FollowUpEvidenceOption[];
  otherText: string | null;
  text: string | null;
};

export type FirmFollowUpEvidenceModule = {
  moduleKey: string;
  title: string;
  pillar: string;
  submissionId: string | null;
  submittedAt: string | null;
  items: FollowUpEvidenceItem[];
};

export type FollowUpEvidenceRow = {
  questionKey: string;
  selectionMode: string;
  optionKey: string | null;
  otherText: string | null;
};

const MODULE_BY_KEY = new Map(FIRM_MODULE_DEFINITIONS.map((definition) => [definition.key, definition]));

function questionsForModule(moduleKey: string): FollowUpQuestion[] {
  return FIRM_FOLLOWUP_MC_QUESTIONS.filter((question) => question.moduleKey === moduleKey);
}

function emptyItem(question: FollowUpQuestion): FollowUpEvidenceItem {
  return {
    questionKey: question.questionKey,
    index: question.index,
    stem: question.stem,
    selectionMode: question.selectionMode,
    kind: "none",
    options: [],
    otherText: null,
    text: null,
  };
}

function selectionItem(question: FollowUpQuestion, optionKeys: string[], otherText: string | null): FollowUpEvidenceItem {
  const picked = new Set(optionKeys);
  const options = question.options
    .filter((option) => picked.has(option.key))
    .map((option) => ({ key: option.key, label: option.label, consequence: option.consequence, kind: option.kind }));
  if (options.length === 0) return emptyItem(question);
  const hasOther = options.some((option) => option.kind === "other");
  return { ...emptyItem(question), kind: "selection", options, otherText: hasOther ? otherText : null };
}

/** Rows → items, in registry order. Option rows win; a TEXT row is legacy text. */
export function buildFollowUpEvidenceItems(moduleKey: string, rows: readonly FollowUpEvidenceRow[]): FollowUpEvidenceItem[] {
  return questionsForModule(moduleKey).map((question) => {
    const forQuestion = rows.filter((row) => row.questionKey === question.questionKey);
    const optionRows = forQuestion.filter((row) => row.optionKey);
    if (optionRows.length > 0) {
      const otherRow = optionRows.find((row) => row.optionKey?.endsWith(".other"));
      return selectionItem(
        question,
        optionRows.map((row) => row.optionKey as string),
        otherRow?.otherText ?? null
      );
    }
    const textRow = forQuestion.find((row) => row.selectionMode === "TEXT" && row.otherText && row.otherText.trim().length > 0);
    if (textRow) return { ...emptyItem(question), kind: "text", text: textRow.otherText };
    return emptyItem(question);
  });
}

/** Submission JSON (keyed by question KEY) → items; the fallback when a submission has no rows yet. */
export function buildFollowUpEvidenceFromAnswers(moduleKey: string, answersByQuestionKey: Record<string, unknown>): FollowUpEvidenceItem[] {
  return questionsForModule(moduleKey).map((question) => {
    const answer = answersByQuestionKey[question.questionKey];
    if (isFollowUpMcAnswer(answer)) return selectionItem(question, answer.optionKeys, answer.otherText ?? null);
    if (typeof answer === "string" && answer.trim().length > 0) return { ...emptyItem(question), kind: "text", text: answer };
    return emptyItem(question);
  });
}

type LatestSubmission = { id: string; companyId: string; moduleKey: string; createdAt: Date; answers: unknown };

async function latestFinalFirmSubmissions(companyIds: string[]): Promise<LatestSubmission[]> {
  if (companyIds.length === 0) return [];
  const submissions = await prisma.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      companyId: { in: companyIds },
      SurveyModule: { key: { in: FIRM_MODULE_DEFINITIONS.map((definition) => definition.key) } },
    }),
    orderBy: { createdAt: "desc" },
    select: { id: true, companyId: true, createdAt: true, answers: true, SurveyModule: { select: { key: true } } },
  });
  const latest = new Map<string, LatestSubmission>();
  for (const submission of submissions) {
    const key = `${submission.companyId}::${submission.SurveyModule.key}`;
    if (!latest.has(key)) {
      latest.set(key, {
        id: submission.id,
        companyId: submission.companyId,
        moduleKey: submission.SurveyModule.key,
        createdAt: submission.createdAt,
        answers: submission.answers,
      });
    }
  }
  return Array.from(latest.values());
}

type ItemRow = { submissionId: string; questionKey: string; selectionMode: string; optionKey: string | null; otherText: string | null };

async function followUpRowsFor(submissionIds: string[]): Promise<ItemRow[]> {
  if (submissionIds.length === 0) return [];
  try {
    return await prisma.assessmentItemResponse.findMany({
      where: { submissionId: { in: submissionIds }, questionKey: { contains: "_open_" } },
      select: { submissionId: true, questionKey: true, selectionMode: true, optionKey: true, otherText: true },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    if (isPrismaMissingSchemaError(error)) {
      warnPrismaCompatibilityOnce(
        "followup-evidence-item-response-missing",
        "AssessmentItemResponse is missing in the local database. Follow-up evidence falls back to submission JSON until local Prisma migrations are applied."
      );
      return [];
    }
    throw error;
  }
}

async function questionKeyMap(moduleKeys: string[]): Promise<Map<string, string>> {
  const questions = await prisma.surveyQuestion.findMany({
    where: { SurveyModule: { key: { in: moduleKeys } } },
    select: { id: true, key: true },
  });
  return new Map(questions.map((question) => [question.id, question.key]));
}

function answersByKey(answers: unknown, idToKey: Map<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (answers && typeof answers === "object" && !Array.isArray(answers)) {
    for (const [questionId, value] of Object.entries(answers as Record<string, unknown>)) {
      const key = idToKey.get(questionId);
      if (key) out[key] = value;
    }
  }
  return out;
}

/** One firm: the latest final submission per module, its five follow-ups as evidence. */
export async function getFirmFollowUpEvidence(companyId: string): Promise<FirmFollowUpEvidenceModule[]> {
  const latest = await latestFinalFirmSubmissions([companyId]);
  const rows = await followUpRowsFor(latest.map((submission) => submission.id));
  const idToKey = await questionKeyMap(FIRM_MODULE_DEFINITIONS.map((definition) => definition.key));
  return FIRM_MODULE_DEFINITIONS.map((definition) => {
    const submission = latest.find((entry) => entry.moduleKey === definition.key) ?? null;
    let items: FollowUpEvidenceItem[];
    if (!submission) {
      items = questionsForModule(definition.key).map(emptyItem);
    } else {
      const own = rows.filter((row) => row.submissionId === submission.id);
      items =
        own.length > 0
          ? buildFollowUpEvidenceItems(definition.key, own)
          : buildFollowUpEvidenceFromAnswers(definition.key, answersByKey(submission.answers, idToKey));
    }
    return {
      moduleKey: definition.key,
      title: definition.title,
      pillar: definition.pillarName,
      submissionId: submission?.id ?? null,
      submittedAt: submission?.createdAt.toISOString() ?? null,
      items,
    };
  });
}

// ---------------------------------------------------------------------------
// Ecosystem aggregate
// ---------------------------------------------------------------------------
export type FollowUpAggregateRow = {
  questionKey: string;
  moduleKey: string;
  pillar: string;
  index: number;
  stem: string;
  topOption: { key: string; label: string; count: number } | null;
  includedPicks: number;
  excludedPicks: number;
  firmsAnswered: number;
};

/** Pure: option rows (with submissionId) → per-question top option with n. */
export function summarizeFollowUpAggregate(
  rows: ReadonlyArray<{ questionKey: string; optionKey: string | null; submissionId: string }>
): FollowUpAggregateRow[] {
  const counts = aggregateFollowUpOptionCounts(rows);
  return FIRM_FOLLOWUP_MC_QUESTIONS.map((question) => {
    const bucket = counts[question.questionKey];
    const firms = new Set(rows.filter((row) => row.questionKey === question.questionKey && row.optionKey).map((row) => row.submissionId));
    let topOption: FollowUpAggregateRow["topOption"] = null;
    if (bucket) {
      for (const option of question.options) {
        const count = bucket.counts[option.key] ?? 0;
        if (count > 0 && (!topOption || count > topOption.count)) {
          topOption = { key: option.key, label: option.label, count };
        }
      }
    }
    return {
      questionKey: question.questionKey,
      moduleKey: question.moduleKey,
      pillar: question.pillar,
      index: question.index,
      stem: question.stem,
      topOption,
      includedPicks: bucket?.includedPicks ?? 0,
      excludedPicks: bucket?.excludedPicks ?? 0,
      firmsAnswered: firms.size,
    };
  });
}

export async function getEcosystemFollowUpAggregate(firmCompanyIds: string[]): Promise<{
  rows: FollowUpAggregateRow[];
  firmCount: number;
  firmsWithSelections: number;
}> {
  const latest = await latestFinalFirmSubmissions(firmCompanyIds);
  const rows = (await followUpRowsFor(latest.map((submission) => submission.id))).filter((row) => row.optionKey);
  const submissionCompany = new Map(latest.map((submission) => [submission.id, submission.companyId]));
  const firmsWithSelections = new Set(rows.map((row) => submissionCompany.get(row.submissionId))).size;
  return { rows: summarizeFollowUpAggregate(rows), firmCount: firmCompanyIds.length, firmsWithSelections };
}

// ---------------------------------------------------------------------------
// "Other" texts (admin gauge)
// ---------------------------------------------------------------------------
export type FollowUpOtherGroup = {
  questionKey: string;
  moduleKey: string;
  pillar: string;
  index: number;
  stem: string;
  otherCount: number;
  totalPicks: number;
  otherRate: number | null;
  texts: { text: string; companyId: string; submittedAt: string }[];
};

/** Pure: all option rows → per question: Other write-ins, counts, and Other-rate over all picks. */
export function summarizeFollowUpOtherTexts(
  rows: ReadonlyArray<{ questionKey: string; optionKey: string | null; otherText: string | null; companyId: string; createdAt: Date }>
): FollowUpOtherGroup[] {
  return FIRM_FOLLOWUP_MC_QUESTIONS.map((question) => {
    const picks = rows.filter((row) => row.questionKey === question.questionKey && row.optionKey);
    const others = picks.filter((row) => row.optionKey?.endsWith(".other"));
    const texts = others
      .filter((row) => row.otherText && row.otherText.trim().length > 0)
      .map((row) => ({ text: row.otherText as string, companyId: row.companyId, submittedAt: row.createdAt.toISOString() }))
      .sort((left, right) => (left.submittedAt < right.submittedAt ? 1 : -1));
    return {
      questionKey: question.questionKey,
      moduleKey: question.moduleKey,
      pillar: question.pillar,
      index: question.index,
      stem: question.stem,
      otherCount: others.length,
      totalPicks: picks.length,
      otherRate: picks.length > 0 ? others.length / picks.length : null,
      texts,
    };
  });
}

export async function getFollowUpOtherTexts(): Promise<FollowUpOtherGroup[]> {
  try {
    const rows = await prisma.assessmentItemResponse.findMany({
      where: { optionKey: { not: null }, questionKey: { contains: "_open_" } },
      select: { questionKey: true, optionKey: true, otherText: true, companyId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return summarizeFollowUpOtherTexts(rows);
  } catch (error) {
    if (isPrismaMissingSchemaError(error)) {
      warnPrismaCompatibilityOnce(
        "followup-other-item-response-missing",
        "AssessmentItemResponse is missing in the local database. The Other-rate gauge is empty until local Prisma migrations are applied."
      );
      return summarizeFollowUpOtherTexts([]);
    }
    throw error;
  }
}

export { MODULE_BY_KEY as FIRM_MODULE_BY_KEY, getFirmFollowUpQuestion };
