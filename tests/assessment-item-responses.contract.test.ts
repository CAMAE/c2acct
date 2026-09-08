import { describe, expect, it } from "vitest";
import { buildAssessmentItemResponseRows, type ItemResponseQuestion } from "@/lib/assessment/itemResponses";
import { FIRM_FOLLOWUP_MC_VERSION } from "@/lib/assessment/firmFollowUpOptions";

/** A firm module: 20 scored SLIDER items then 5 TEXT follow-ups keyed like the seed. */
function operationsModule(): ItemResponseQuestion[] {
  const scored = Array.from({ length: 20 }, (_, i) => ({
    id: `q-${i + 1}`,
    key: `operating-model_${i + 1}`,
    inputType: "SLIDER" as const,
  }));
  const followUps = Array.from({ length: 5 }, (_, i) => ({
    id: `q-open-${i + 1}`,
    key: `operating-model_open_${i + 1}`,
    inputType: "TEXT" as const,
  }));
  return [...scored, ...followUps];
}

let counter = 0;
const newId = () => `row-${++counter}`;

describe("AssessmentItemResponse rows — dual-write covers all 25 items of a firm module", () => {
  it("MC submission: 20 SCORED rows + one row per selected option; Other carries its text; 25 items covered", () => {
    const questions = operationsModule();
    const answers: Record<string, unknown> = {};
    for (let i = 1; i <= 20; i += 1) answers[`q-${i}`] = i % 6;
    answers["q-open-1"] = { optionKeys: ["ops.q1.c"], otherText: null }; // SINGLE
    answers["q-open-2"] = { optionKeys: ["ops.q2.a", "ops.q2.d", "ops.q2.other"], otherText: "Roll-forward owner" }; // MULTI + Other
    answers["q-open-3"] = { optionKeys: ["ops.q3.none"], otherText: null };
    answers["q-open-4"] = { optionKeys: ["ops.q4.other"], otherText: "Handoff to outsourced prep" };
    answers["q-open-5"] = { optionKeys: ["ops.q5.b", "ops.q5.f"], otherText: null };

    const { rows, skippedQuestionKeys } = buildAssessmentItemResponseRows({
      submissionId: "sub-1",
      companyId: "co-1",
      moduleKey: "firm_alignment_operating_model_v1",
      moduleVersion: 3,
      questions,
      answers,
      newId,
    });

    expect(skippedQuestionKeys).toEqual([]);
    expect(rows.filter((r) => r.selectionMode === "SCORED")).toHaveLength(20);
    expect(rows.filter((r) => r.selectionMode === "SCORED").map((r) => r.numericValue)).toEqual(
      Array.from({ length: 20 }, (_, i) => (i + 1) % 6)
    );
    expect(new Set(rows.map((r) => r.questionKey)).size).toBe(25);
    expect(rows).toHaveLength(20 + 1 + 3 + 1 + 1 + 2);

    const q2 = rows.filter((r) => r.questionKey === "operating-model_open_2");
    expect(q2.map((r) => r.optionKey)).toEqual(["ops.q2.a", "ops.q2.d", "ops.q2.other"]);
    expect(q2.map((r) => r.otherText)).toEqual([null, null, "Roll-forward owner"]);
    expect(q2.every((r) => r.selectionMode === "MULTI" && r.optionSetVersion === FIRM_FOLLOWUP_MC_VERSION)).toBe(true);

    const q1 = rows.filter((r) => r.questionKey === "operating-model_open_1");
    expect(q1).toEqual([
      expect.objectContaining({ selectionMode: "SINGLE", optionKey: "ops.q1.c", otherText: null, numericValue: null }),
    ]);
    expect(rows.every((r) => r.submissionId === "sub-1" && r.companyId === "co-1" && r.questionVersion === 3 && r.orderingSeed === null)).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it("legacy submission (flag-off shape): 20 SCORED rows + 5 TEXT rows carrying the free text", () => {
    const questions = operationsModule();
    const answers: Record<string, unknown> = {};
    for (let i = 1; i <= 20; i += 1) answers[`q-${i}`] = 4;
    for (let i = 1; i <= 5; i += 1) answers[`q-open-${i}`] = `Free text ${i}`;
    const { rows, skippedQuestionKeys } = buildAssessmentItemResponseRows({
      submissionId: "sub-2",
      companyId: "co-1",
      moduleKey: "firm_alignment_operating_model_v1",
      moduleVersion: 1,
      questions,
      answers,
      newId,
    });
    expect(skippedQuestionKeys).toEqual([]);
    expect(rows).toHaveLength(25);
    const text = rows.filter((r) => r.selectionMode === "TEXT");
    expect(text.map((r) => r.otherText)).toEqual(["Free text 1", "Free text 2", "Free text 3", "Free text 4", "Free text 5"]);
    expect(text.every((r) => r.optionKey === null && r.optionSetVersion === null && r.numericValue === null)).toBe(true);
  });

  it("absent, blank, or malformed answers produce no row and are reported as skipped", () => {
    const questions = operationsModule().slice(18); // q-19, q-20, five follow-ups
    const answers: Record<string, unknown> = {
      "q-19": 5,
      "q-20": "not a number",
      "q-open-1": "   ",
      "q-open-2": { optionKeys: [], otherText: null },
      "q-open-3": { nope: true },
    };
    const { rows, skippedQuestionKeys } = buildAssessmentItemResponseRows({
      submissionId: "sub-3",
      companyId: "co-1",
      moduleKey: "firm_alignment_operating_model_v1",
      moduleVersion: 1,
      questions,
      answers,
      newId,
    });
    expect(rows.map((r) => r.questionKey)).toEqual(["operating-model_19"]);
    expect(skippedQuestionKeys).toEqual([
      "operating-model_20",
      "operating-model_open_1",
      "operating-model_open_2",
      "operating-model_open_3",
      "operating-model_open_4",
      "operating-model_open_5",
    ]);
  });
});
