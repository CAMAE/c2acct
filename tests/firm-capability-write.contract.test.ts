import { describe, expect, it } from "vitest";
import { QuestionInputType } from "@prisma/client";
import type { AssessmentQuestionRuntime } from "@/lib/assessmentRuntime";
import {
  COMPANY_CAPABILITY_SCORE_VERSION,
  computeCapabilityScores,
  type CapabilityQuestionMapping,
} from "@/lib/capabilityScoring";
import { getFirmQuestionCapabilityKeys } from "@/lib/firmCapabilities";
import { FIRM_MODULE_DEFINITIONS, FIRM_MODULE_QUESTION_STEMS } from "@/lib/firmPat";

describe("company capability writes", () => {
  it("produces deterministic upsert targets from PAT question mappings", () => {
    const moduleDefinition = FIRM_MODULE_DEFINITIONS[0];

    const questions: AssessmentQuestionRuntime[] = FIRM_MODULE_QUESTION_STEMS.map((stem, index) => ({
      id: `question-${index + 1}`,
      key: `${moduleDefinition.sectionKey}_q${index + 1}`,
      prompt: `${moduleDefinition.title}: ${stem}`,
      inputType: QuestionInputType.SLIDER,
      weight: 1,
      order: index + 1,
      required: true,
      meta: {
        section: {
          key: moduleDefinition.sectionKey,
          title: moduleDefinition.title,
          description: moduleDefinition.summary,
        },
        slider: {
          min: 0,
          max: 5,
          step: 1,
        },
      },
      status: "ready",
      validation: {
        slider: {
          min: 0,
          max: 5,
          step: 1,
        },
      },
    }));

    const answers = Object.fromEntries(questions.map((question, index) => [question.id, index % 6]));

    const mappings: CapabilityQuestionMapping[] = questions.flatMap((question, index) =>
      getFirmQuestionCapabilityKeys(moduleDefinition.sectionKey, index).map((capabilityKey) => ({
        questionId: question.id,
        questionKey: question.key,
        nodeId: capabilityKey,
        weight: 1,
      }))
    );

    const scoring = computeCapabilityScores({
      questions,
      answers,
      mappings,
    });

    expect(scoring.diagnostics.unmappedQuestionIds).toEqual([]);
    expect(scoring.diagnostics.unansweredQuestionIds).toEqual([]);
    expect(scoring.diagnostics.questionsMissingScale).toEqual([]);
    expect(scoring.scores.length).toBeGreaterThanOrEqual(2);
    expect(scoring.scores.every((entry) => entry.score >= 0 && entry.score <= 100)).toBe(true);

    const persistedRows = scoring.scores.map((entry) => ({
      companyId: "company-fixture",
      nodeId: entry.nodeId,
      score: entry.score,
      scoreVersion: COMPANY_CAPABILITY_SCORE_VERSION,
    }));

    expect(persistedRows).toHaveLength(new Set(persistedRows.map((entry) => entry.nodeId)).size);
    expect(persistedRows.every((entry) => entry.scoreVersion === COMPANY_CAPABILITY_SCORE_VERSION)).toBe(true);
  });
});
