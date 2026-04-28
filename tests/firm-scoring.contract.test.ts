import { describe, expect, it } from "vitest";
import { PAT_PRODUCT_NAME } from "@/lib/displayCopy";
import { computeScore, summarizeSubmissionScores } from "@/lib/scoring";
import {
  buildFirmProductQuestions,
  buildFirmModuleOpenEndedPrompts,
  FIRM_MODULE_DEFINITIONS,
  FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT,
  FIRM_MODULE_QUESTION_STEMS,
} from "@/lib/firmPat";

describe("firm modular scoring", () => {
  it("keeps firm assessment branding pinned to the PAT product name", () => {
    expect(PAT_PRODUCT_NAME).toBe("PAT | Performance Alignment Technology");
  });

  it("treats 0 as answered and keeps raw score canonical across the five PAT modules", () => {
    const answers = Object.fromEntries(
      FIRM_MODULE_QUESTION_STEMS.map((_, index) => [`q${index + 1}`, index % 6])
    );

    expect(FIRM_MODULE_DEFINITIONS).toHaveLength(5);

    for (const moduleDefinition of FIRM_MODULE_DEFINITIONS) {
      const score = computeScore({
        answers,
        scaleMin: 0,
        scaleMax: 5,
      });

      expect(moduleDefinition.key).toMatch(/^firm_alignment_/);
      expect(score.answeredCount).toBe(20);
      expect(score.totalWeight).toBe(20);
      expect(score.rawWeightedAvg).toBe(2.3);
      expect(score.rawScorePct).toBe(46);
      expect(score.score).toBe(score.rawScorePct);
    }
  });

  it("keeps confidence-adjusted display semantics separate from the raw unlock basis", () => {
    const score = computeScore({
      answers: {
        q1: 0,
        q2: 1,
        q3: 2,
        q4: 4,
        q5: 5,
      },
      scaleMin: 0,
      scaleMax: 5,
    });

    const summary = summarizeSubmissionScores({
      score: score.rawScorePct,
      weightedAvg: score.rawWeightedAvg,
      signalIntegrityScore: 0.75,
    });

    expect(score.answeredCount).toBe(5);
    expect(score.rawScorePct).toBe(48);
    expect(summary.unlockBasisScorePct).toBe(48);
    expect(summary.confidenceAdjustedScorePct).toBe(36);
    expect(summary.confidenceAdjustedWeightedAvg).toBe(1.8);
  });

  it("adds five module-specific open-ended follow-up prompts without changing numeric score semantics", () => {
    for (const moduleDefinition of FIRM_MODULE_DEFINITIONS) {
      const prompts = buildFirmModuleOpenEndedPrompts(moduleDefinition);

      expect(prompts).toHaveLength(FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT);
      expect(new Set(prompts.map((prompt) => prompt.keySuffix)).size).toBe(
        FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT
      );
      expect(prompts.every((prompt) => prompt.prompt.length > 40)).toBe(true);
      expect(prompts.every((prompt) => prompt.placeholder.length > 20)).toBe(true);
    }

    const score = computeScore({
      answers: Object.fromEntries(
        FIRM_MODULE_QUESTION_STEMS.map((_, index) => [`q${index + 1}`, index % 6])
      ),
      scaleMin: 0,
      scaleMax: 5,
    });

    expect(score.answeredCount).toBe(20);
    expect(score.totalWeight).toBe(20);
  });

  it("separates firm alignment final-answer coverage from raw numeric scoring", () => {
    const moduleDefinition = FIRM_MODULE_DEFINITIONS[0]!;
    const openEndedPrompts = buildFirmModuleOpenEndedPrompts(moduleDefinition);
    const numericAnswers = Object.fromEntries(
      FIRM_MODULE_QUESTION_STEMS.map((_, index) => [`q${index + 1}`, index % 6])
    );
    const numericScore = computeScore({
      answers: numericAnswers,
      scaleMin: 0,
      scaleMax: 5,
    });

    expect(openEndedPrompts).toHaveLength(FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT);
    expect(numericScore.answeredCount).toBe(FIRM_MODULE_QUESTION_STEMS.length);
    expect(Object.keys(numericAnswers)).toHaveLength(20);
    expect(Object.keys(numericAnswers).length + openEndedPrompts.length).toBe(25);
    expect(Object.keys(numericAnswers).length).toBeLessThan(
      Object.keys(numericAnswers).length + openEndedPrompts.length
    );
  });

  it("proves firm product assessments require complete feature-aligned answers before submission", () => {
    const utilityKeys = ["ap_payables_spend", "reporting_analytics_fpa"];
    const questions = buildFirmProductQuestions(utilityKeys);
    const emptyAnswers = {};
    const partialAnswers = Object.fromEntries(
      questions.slice(0, -1).map((question, index) => [question.id, index % 6])
    );
    const completeAnswers = Object.fromEntries(
      questions.map((question, index) => [question.id, index % 6])
    );
    const missingFromPartial = questions.filter((question) => !Object.hasOwn(partialAnswers, question.id));
    const completeScore = computeScore({
      answers: completeAnswers,
      scaleMin: 0,
      scaleMax: 5,
    });

    expect(questions).toHaveLength(utilityKeys.length * 20);
    expect(Object.keys(emptyAnswers)).toHaveLength(0);
    expect(Object.keys(partialAnswers)).toHaveLength(questions.length - 1);
    expect(missingFromPartial).toHaveLength(1);
    expect(completeScore.answeredCount).toBe(questions.length);
    expect(completeScore.totalWeight).toBe(questions.length);
    expect(completeScore.rawScorePct).toBeGreaterThan(0);
  });
});
