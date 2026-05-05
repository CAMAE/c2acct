import { QuestionInputType, type Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAssessmentModulePayload,
  buildAssessmentRollups,
  normalizeAssessmentStep,
  normalizeQuestionRuntime,
} from "@/lib/assessmentRuntime";
import {
  buildFirmModuleOpenEndedPrompts,
  FIRM_MODULE_DEFINITIONS,
  FIRM_MODULE_QUESTION_STEMS,
} from "@/lib/firmPat";

const ROOT = "/Users/camerongarrett/work/c2acct-live";

const moduleFixture = {
  id: "module-1",
  key: "vendor_product_alignment_v1",
  title: "Vendor Product Assessment",
  description: "Fixture module",
  scope: "PRODUCT",
  version: 1,
};

const sectionFixtures = [
  {
    id: "section-1",
    key: "utility-a-subcategory-1",
    title: "Utility A: Subcategory 1",
    description: "First 5-question section",
    order: 1,
    utilityFamily: "Utility A",
    utilityKey: "utility-a",
    utilityLabel: "Utility A",
    subcategoryKey: "subcategory-1",
    subcategoryTitle: "Subcategory 1",
    basisKey: "workflow-fit",
  },
  {
    id: "section-2",
    key: "utility-a-subcategory-2",
    title: "Utility A: Subcategory 2",
    description: "Second 5-question section",
    order: 2,
    utilityFamily: "Utility A",
    utilityKey: "utility-a",
    utilityLabel: "Utility A",
    subcategoryKey: "subcategory-2",
    subcategoryTitle: "Subcategory 2",
    basisKey: "integration-readiness",
  },
];

const questionFixtures: Array<{
  id: string;
  key: string;
  prompt: string;
  inputType: QuestionInputType;
  weight: number;
  order: number;
  required: boolean;
  sectionId: string | null;
  SurveySection: (typeof sectionFixtures)[number] | null;
  meta: Prisma.JsonValue;
}> = [
  ...Array.from({ length: 10 }, (_, index) => {
    const section = index < 5 ? sectionFixtures[0] : sectionFixtures[1];
    return {
      id: `q-${index + 1}`,
      key: `q_${index + 1}`,
      prompt: `Question ${index + 1}`,
      inputType: QuestionInputType.SLIDER,
      weight: 1,
      order: index + 1,
      required: true,
      sectionId: section.id,
      SurveySection: section,
      meta: {
        slider: {
          min: 0,
          max: 5,
          step: 1,
        },
      },
    };
  }),
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `q-open-${index + 1}`,
    key: `q_open_${index + 1}`,
    prompt: `Open-ended question ${index + 1}`,
    inputType: QuestionInputType.TEXT,
    weight: 0,
    order: 11 + index,
    required: true,
    sectionId: null,
    SurveySection: null,
    meta: {
      section: {
        key: "module-follow-up",
        title: "Module follow-up",
        description: "Five module-specific follow-up questions.",
        order: 3,
      },
      text: {
        multiline: true,
      },
    },
  })),
];

describe("assessment section contracts", () => {
  it("builds section-aware payloads with ten-question pages while preserving section metadata", () => {
    const payload = buildAssessmentModulePayload(moduleFixture, questionFixtures, sectionFixtures);

    expect(payload.sections).toHaveLength(3);
    expect(payload.sections.map((section) => section.order)).toEqual([1, 2, 3]);
    expect(payload.sections.map((section) => section.questionIds.length)).toEqual([5, 5, 5]);
    expect(payload.sections[0]).toMatchObject({
      key: "utility-a-subcategory-1",
      utilityKey: "utility-a",
      subcategoryKey: "subcategory-1",
      basisKey: "workflow-fit",
    });
    expect(payload.sections[2]).toMatchObject({
      key: "module-follow-up",
      title: "Module follow-up",
    });
    expect(payload.pages).toHaveLength(2);
    expect(payload.pages[0]).toMatchObject({
      key: "page-1",
      title: "Questions 1-10",
      questionCount: 10,
      sectionKeys: ["utility-a-subcategory-1", "utility-a-subcategory-2"],
      startQuestionNumber: 1,
      endQuestionNumber: 10,
    });
    expect(payload.pages[1]).toMatchObject({
      key: "page-2",
      title: "Questions 11-15",
      questionCount: 5,
      sectionKeys: ["module-follow-up"],
      startQuestionNumber: 11,
      endQuestionNumber: 15,
    });
  });

  it("keeps raw score semantics separate while exposing section and utility rollups", () => {
    const runtimeQuestions = questionFixtures.map((question) => normalizeQuestionRuntime(question));
    const answers = Object.fromEntries(
      runtimeQuestions.map((question, index) => {
        if (question.inputType === QuestionInputType.TEXT) {
          return [question.id, `Open-ended response ${index + 1}`];
        }

        return [question.id, index < 5 ? 5 : 2];
      })
    );

    const rollups = buildAssessmentRollups(runtimeQuestions, answers);

    expect(rollups.sections).toHaveLength(3);
    expect(rollups.sections[0].score).toBe(100);
    expect(rollups.sections[1].score).toBe(40);
    expect(rollups.sections[2]).toMatchObject({
      key: "module-follow-up",
      score: null,
      answeredCount: 0,
      questionCount: 5,
    });
    expect(rollups.utilities).toHaveLength(1);
    expect(rollups.utilities[0]).toMatchObject({
      key: "utility-a",
      answeredCount: 10,
      questionCount: 10,
    });
    expect(rollups.utilities[0].score).toBe(70);
  });

  it("normalizes assessment step values against page count", () => {
    expect(normalizeAssessmentStep(-3, 2)).toBe(1);
    expect(normalizeAssessmentStep(Number.NaN, 2)).toBe(1);
    expect(normalizeAssessmentStep(Number.POSITIVE_INFINITY, 2)).toBe(1);
    expect(normalizeAssessmentStep(1, 2)).toBe(1);
    expect(normalizeAssessmentStep(4, 2)).toBe(2);
  });

  it("keeps all firm modules on ten-question pacing with fixed conservative follow-up pages", () => {
    for (const moduleDefinition of FIRM_MODULE_DEFINITIONS) {
      const scoredQuestions = FIRM_MODULE_QUESTION_STEMS.map((stem, index) => ({
        id: `${moduleDefinition.key}-q-${index + 1}`,
        key: `${moduleDefinition.sectionKey}_q${index + 1}`,
        prompt: `${moduleDefinition.title}: ${stem}`,
        inputType: QuestionInputType.SLIDER,
        weight: 1,
        order: index + 1,
        required: true,
        sectionId: null,
        SurveySection: null,
        meta: {
          section: {
            key: `${moduleDefinition.sectionKey}-scored`,
            title: moduleDefinition.title,
            description: moduleDefinition.summary,
            order: 1,
          },
          slider: {
            min: 0,
            max: 5,
            step: 1,
          },
        },
      }));
      const followUpQuestions = buildFirmModuleOpenEndedPrompts(moduleDefinition).map((prompt, index) => ({
        id: `${moduleDefinition.key}-open-${index + 1}`,
        key: `${moduleDefinition.sectionKey}_open_${index + 1}`,
        prompt: `${moduleDefinition.title}: ${prompt.prompt}`,
        inputType: QuestionInputType.TEXT,
        weight: 0,
        order: FIRM_MODULE_QUESTION_STEMS.length + index + 1,
        required: true,
        sectionId: null,
        SurveySection: null,
        meta: {
          section: {
            key: `${moduleDefinition.sectionKey}-module-follow-up`,
            title: `${moduleDefinition.title}: Module follow-up`,
            description:
              "Five module-specific follow-up questions capture current operating context that PAT cannot read from numeric scores alone.",
            order: 2,
          },
          text: {
            multiline: true,
          },
          placeholder: prompt.placeholder,
        },
      }));

      const payload = buildAssessmentModulePayload(
        {
          id: moduleDefinition.key,
          key: moduleDefinition.key,
          title: moduleDefinition.title,
          description: moduleDefinition.description,
          scope: "FIRM",
          version: 1,
        },
        [...scoredQuestions, ...followUpQuestions],
        []
      );

      expect(payload.questions).toHaveLength(25);
      expect(payload.pages.map((page) => page.questionCount)).toEqual([10, 10, 5]);
      expect(payload.pages.map((page) => page.title)).toEqual([
        "Questions 1-10",
        "Questions 11-20",
        "Questions 21-25",
      ]);
      expect(payload.pages[2]?.sectionKeys).toEqual([`${moduleDefinition.sectionKey}-module-follow-up`]);
      expect(followUpQuestions.every((question) => question.prompt.startsWith(`${moduleDefinition.title}:`))).toBe(
        true
      );
      expect(
        followUpQuestions.some((question) =>
          /benchmark|projection|adaptive|generated/i.test(`${question.prompt} ${question.meta.placeholder ?? ""}`)
        )
      ).toBe(false);
    }
  });

  it("keeps assessment client pacing, autosave, top-scroll, and submit guard copy explicit", () => {
    const text = readFileSync(
      path.join(ROOT, "app/components/assessment/AssessmentModuleClient.tsx"),
      "utf8"
    );

    expect(text).toContain("topCardRef.current?.scrollIntoView");
    expect(text).toContain("normalizeAssessmentStep");
    expect(text).toContain("Progress saves automatically as you move through the module.");
    expect(text).toContain("Saving progress...");
    expect(text).toContain("Progress saved");
    expect(text).toContain("Autosave issue:");
    expect(text).toContain("Complete the remaining");
    expect(text).toContain("required question");
    expect(text).toContain("PAT keeps this module in ten-question pages");
  });
});
