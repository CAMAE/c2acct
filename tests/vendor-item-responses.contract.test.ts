import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildVendorAssessmentItemResponseRows } from "@/lib/assessment/vendorItemResponses";
import { encodeVendorFollowUpAnswer, validateVendorOpenEndedResponses } from "@/lib/assessment/vendorFollowUpMcRuntime";

/**
 * vendor-followup-mc box (change 5) — the rows written equal the picks; flag-off
 * writes TEXT rows for the strings (as the firm path does) and the submission
 * JSON is byte-identical to today's.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const OFF = { PAT_ENABLE_VENDOR_FOLLOWUP_MC: "0" } as unknown as NodeJS.ProcessEnv;
const ON = { PAT_ENABLE_VENDOR_FOLLOWUP_MC: "1" } as unknown as NodeJS.ProcessEnv;

const KEYS = [
  "strongest_workflow", "weakest_workflow", "implementation_risk", "change_management_risk", "integration_gap",
  "control_concern", "best_fit_customer", "poor_fit_customer", "evidence_needed_next", "recommended_next_action",
];
const QUESTIONS = KEYS.map((key) => ({ id: `product_open_ended_v1__${key}`, key, prompt: `Adaptive prompt for ${key}` }));
const id = (key: string) => `product_open_ended_v1__${key}`;
let counter = 0;
const newId = () => `row-${++counter}`;

describe("buildVendorAssessmentItemResponseRows", () => {
  it("flag-on: one SINGLE/MULTI row per selected option, Other carries its text, the rest TEXT", () => {
    counter = 0;
    const responses: Record<string, string> = {
      [id("strongest_workflow")]: encodeVendorFollowUpAnswer({ optionKeys: ["prod.q1.c"], otherText: null }),
      [id("best_fit_customer")]: encodeVendorFollowUpAnswer({ optionKeys: ["prod.q7.a", "prod.q7.c", "prod.q7.other"], otherText: "Bookkeeping-led firms" }),
      [id("control_concern")]: encodeVendorFollowUpAnswer({ optionKeys: ["prod.q6.none"], otherText: null }),
      [id("weakest_workflow")]: "Typed before the flag was on.",
      [id("integration_gap")]: "   ",
    };
    const { rows, skippedQuestionKeys } = buildVendorAssessmentItemResponseRows({
      submissionId: "sub-1",
      companyId: "vendor-1",
      moduleVersion: 3,
      questions: QUESTIONS,
      openEndedResponses: responses,
      enabled: ON,
      newId,
    });
    expect(rows.map((row) => [row.questionKey, row.selectionMode, row.optionKey, row.otherText])).toEqual([
      ["strongest_workflow", "SINGLE", "prod.q1.c", null],
      ["weakest_workflow", "TEXT", null, "Typed before the flag was on."],
      ["control_concern", "SINGLE", "prod.q6.none", null],
      ["best_fit_customer", "MULTI", "prod.q7.a", null],
      ["best_fit_customer", "MULTI", "prod.q7.c", null],
      ["best_fit_customer", "MULTI", "prod.q7.other", "Bookkeeping-led firms"],
    ]);
    expect(rows.every((row) => row.submissionId === "sub-1" && row.companyId === "vendor-1" && row.moduleKey === "vendor_product_alignment_v1" && row.questionVersion === 3 && row.numericValue === null)).toBe(true);
    expect(rows.filter((row) => row.optionKey).every((row) => row.optionSetVersion === 1)).toBe(true);
    expect(rows.find((row) => row.selectionMode === "TEXT")?.optionSetVersion).toBeNull();
    expect(skippedQuestionKeys).toEqual(["implementation_risk", "change_management_risk", "integration_gap", "poor_fit_customer", "evidence_needed_next", "recommended_next_action"]);
  });

  it("flag-off: TEXT rows for the ten strings and nothing else, even when a value looks like a pick", () => {
    const responses = Object.fromEntries(KEYS.map((key, index) => [id(key), index === 0 ? encodeVendorFollowUpAnswer({ optionKeys: ["prod.q1.a"], otherText: null }) : `Answer ${index + 1}`]));
    const { rows, skippedQuestionKeys } = buildVendorAssessmentItemResponseRows({ submissionId: "sub-2", companyId: "vendor-1", moduleVersion: 1, questions: QUESTIONS, openEndedResponses: responses, enabled: OFF, newId });
    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.selectionMode === "TEXT" && row.optionKey === null && row.optionSetVersion === null)).toBe(true);
    expect(rows[0].otherText).toBe(responses[id("strongest_workflow")]); // stored as the string it is
    expect(skippedQuestionKeys).toEqual([]);
    expect(buildVendorAssessmentItemResponseRows({ submissionId: "s", companyId: "c", moduleVersion: 1, questions: QUESTIONS, openEndedResponses: responses, enabled: {} as NodeJS.ProcessEnv, newId }).rows.every((row) => row.selectionMode === "TEXT")).toBe(true);
  });

  it("flag-off: the stored JSON is byte-identical to today's (the validator hands the record back untouched)", () => {
    const responses = Object.fromEntries(KEYS.map((key, index) => [id(key), `Answer ${index + 1}`]));
    const before = JSON.stringify({ openEndedResponses: responses });
    const result = validateVendorOpenEndedResponses(responses, QUESTIONS, { enabled: OFF, required: true });
    expect(result.ok).toBe(true);
    expect(result.ok && result.responses).toBe(responses);
    expect(JSON.stringify({ openEndedResponses: result.ok ? result.responses : null })).toBe(before);
    const submit = read("app/api/vendor/product-assessment/submit/route.ts");
    // the submission create stores the validator's record; flag-off that is the request's own object
    expect(submit).toMatch(/openEndedResponses: storedOpenEndedResponses,\s*openEndedPlan: adaptiveOpenEndedQuestions,/);
    // the rows are written after the transaction commits, never inside it, with the firm soft-fail
    expect(submit.indexOf("buildVendorAssessmentItemResponseRows(")).toBeGreaterThan(submit.indexOf("return createdSubmission;"));
    expect(submit).toContain("vendor-submit-assessment-item-response-missing");
  });
});
