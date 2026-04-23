import { describe, expect, it } from "vitest";
import { PAT_PRODUCT_NAME } from "@/lib/displayCopy";
import { computeScore, summarizeSubmissionScores } from "@/lib/scoring";
import {
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
});
