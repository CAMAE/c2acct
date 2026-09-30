import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  decodeVendorFollowUpAnswer,
  decorateVendorFollowUpMcQuestions,
  encodeVendorFollowUpAnswer,
  isVendorFollowUpAnswerComplete,
  validateVendorOpenEndedResponses,
} from "@/lib/assessment/vendorFollowUpMcRuntime";

/**
 * vendor-followup-mc box — flag-off identity and the flag-on rulings, at the
 * function level (the firm side's helpers with the vendor registry passed in).
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const OFF = { PAT_ENABLE_VENDOR_FOLLOWUP_MC: "0" } as unknown as NodeJS.ProcessEnv;
const ON = { PAT_ENABLE_VENDOR_FOLLOWUP_MC: "1" } as unknown as NodeJS.ProcessEnv;

const Q1 = { id: "product_open_ended_v1__strongest_workflow", key: "strongest_workflow", prompt: "Adaptive: Workflow Fit is your strongest section. What evidence supports that read?" };
const Q7 = { id: "product_open_ended_v1__best_fit_customer", key: "best_fit_customer", prompt: "Adaptive: which firm size and type fit best today?" };
const OTHER = { id: "product_open_ended_v1__not_in_registry", key: "not_in_registry", prompt: "Some other prompt" };
const QUESTIONS = [Q1, Q7, OTHER];

describe("decorateVendorFollowUpMcQuestions — identity flag-off, adaptive stem flag-on", () => {
  it("flag-off (env or false) returns the SAME array instance with no followUpMc anywhere", () => {
    expect(decorateVendorFollowUpMcQuestions(QUESTIONS, OFF)).toBe(QUESTIONS);
    expect(decorateVendorFollowUpMcQuestions(QUESTIONS, {} as NodeJS.ProcessEnv)).toBe(QUESTIONS);
    expect(decorateVendorFollowUpMcQuestions(QUESTIONS, false)).toBe(QUESTIONS);
    expect(decorateVendorFollowUpMcQuestions(QUESTIONS, { PAT_ENABLE_FOLLOWUP_MC: "1" } as unknown as NodeJS.ProcessEnv)).toBe(QUESTIONS);
    expect(QUESTIONS.every((question) => !("followUpMc" in question))).toBe(true);
  });

  it("flag-on decorates registry keys with the ADAPTIVE prompt as the stem; unknown keys are the same objects", () => {
    const result = decorateVendorFollowUpMcQuestions(QUESTIONS, ON);
    expect(result).not.toBe(QUESTIONS);
    expect(result[0].followUpMc?.stem).toBe(Q1.prompt);
    expect(result[0].followUpMc?.selectionMode).toBe("SINGLE");
    expect(result[0].followUpMc?.options).toHaveLength(8);
    expect(result[0].followUpMc?.version).toBe(1);
    expect(result[1].followUpMc?.selectionMode).toBe("MULTI");
    expect(result[2]).toBe(OTHER);
    expect(decorateVendorFollowUpMcQuestions(QUESTIONS, true)[0].followUpMc?.questionKey).toBe("strongest_workflow");
  });
});

describe("encoded picks in the string record", () => {
  it("round-trips and never mistakes free text for a pick", () => {
    const encoded = encodeVendorFollowUpAnswer({ optionKeys: ["prod.q7.a", "prod.q7.other"], otherText: "Bookkeeping-led firms" });
    expect(typeof encoded).toBe("string");
    expect(decodeVendorFollowUpAnswer(encoded)).toEqual({ optionKeys: ["prod.q7.a", "prod.q7.other"], otherText: "Bookkeeping-led firms" });
    expect(decodeVendorFollowUpAnswer("We see daily use across the tax team.")).toBeNull();
    expect(decodeVendorFollowUpAnswer('{"optionKeys": "nope"}')).toBeNull();
    expect(decodeVendorFollowUpAnswer("")).toBeNull();
  });

  it("completeness: a pick is complete per the firm ruling; free text stays complete when non-empty", () => {
    expect(isVendorFollowUpAnswerComplete(Q1, encodeVendorFollowUpAnswer({ optionKeys: ["prod.q1.c"], otherText: null }))).toBe(true);
    expect(isVendorFollowUpAnswerComplete(Q1, encodeVendorFollowUpAnswer({ optionKeys: ["prod.q1.other"], otherText: "" }))).toBe(false);
    expect(isVendorFollowUpAnswerComplete(Q1, "legacy text")).toBe(true);
    expect(isVendorFollowUpAnswerComplete(Q1, "   ")).toBe(false);
  });
});

describe("validateVendorOpenEndedResponses — the rulings through the shared helper", () => {
  const record = (pairs: Array<[typeof Q1, unknown]>) =>
    Object.fromEntries(pairs.map(([question, value]) => [question.id, typeof value === "string" ? value : JSON.stringify(value)]));

  it("flag-off returns the record instance untouched", () => {
    const responses = record([[Q1, "text"]]);
    const result = validateVendorOpenEndedResponses(responses, QUESTIONS, { enabled: OFF, required: true });
    expect(result).toEqual({ ok: true, responses });
    expect(result.ok && result.responses).toBe(responses);
  });

  it("exclusivity: none cannot combine with a pick", () => {
    const result = validateVendorOpenEndedResponses(record([[Q7, { optionKeys: ["prod.q7.a", "prod.q7.none"], otherText: null }]]), QUESTIONS, { enabled: ON, required: false });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("cannot be combined");
  });

  it("Other: non-empty and at most 280 characters", () => {
    expect(validateVendorOpenEndedResponses(record([[Q1, { optionKeys: ["prod.q1.other"], otherText: "  " }]]), QUESTIONS, { enabled: ON, required: false }).ok).toBe(false);
    expect(validateVendorOpenEndedResponses(record([[Q1, { optionKeys: ["prod.q1.other"], otherText: "x".repeat(281) }]]), QUESTIONS, { enabled: ON, required: false }).ok).toBe(false);
    const ok = validateVendorOpenEndedResponses(record([[Q1, { optionKeys: ["prod.q1.other"], otherText: " Reference firms in the Midwest " }]]), [Q1, OTHER], { enabled: ON, required: true });
    expect(ok.ok).toBe(true);
    expect(ok.ok && decodeVendorFollowUpAnswer(ok.responses[Q1.id])).toEqual({ optionKeys: ["prod.q1.other"], otherText: "Reference firms in the Midwest" });
  });

  it("SINGLE rejects two picks; MULTI accepts Other plus picks; unknown keys are rejected", () => {
    expect(validateVendorOpenEndedResponses(record([[Q1, { optionKeys: ["prod.q1.a", "prod.q1.b"], otherText: null }]]), QUESTIONS, { enabled: ON, required: true }).ok).toBe(false);
    const multi = validateVendorOpenEndedResponses(record([[Q7, { optionKeys: ["prod.q7.other", "prod.q7.c", "prod.q7.a"], otherText: "Bookkeeping-led" }]]), [Q7], { enabled: ON, required: true });
    expect(multi.ok).toBe(true);
    // normalised: registry order, trimmed text
    expect(multi.ok && decodeVendorFollowUpAnswer(multi.responses[Q7.id])).toEqual({ optionKeys: ["prod.q7.a", "prod.q7.c", "prod.q7.other"], otherText: "Bookkeeping-led" });
    expect(validateVendorOpenEndedResponses(record([[Q1, { optionKeys: ["prod.q1.z"], otherText: null }]]), QUESTIONS, { enabled: ON, required: true }).ok).toBe(false);
  });

  it("required (submit): an empty or missing pick on a registry question fails; draft passes", () => {
    const empty = record([[Q1, { optionKeys: [], otherText: null }]]);
    expect(validateVendorOpenEndedResponses(empty, QUESTIONS, { enabled: ON, required: true }).ok).toBe(false);
    expect(validateVendorOpenEndedResponses(empty, QUESTIONS, { enabled: ON, required: false }).ok).toBe(true);
    expect(validateVendorOpenEndedResponses({}, QUESTIONS, { enabled: ON, required: true }).ok).toBe(false);
    // legacy free text on a registry question still passes flag-on (a submission from before the flag)
    expect(validateVendorOpenEndedResponses(record([[Q1, "typed answer"]]), [Q1], { enabled: ON, required: true }).ok).toBe(true);
    // required applies to EVERY registry question: a complete Q1 with Q7 missing fails the submit
    expect(validateVendorOpenEndedResponses(record([[Q1, { optionKeys: ["prod.q1.a"], otherText: null }]]), [Q1, Q7], { enabled: ON, required: true }).ok).toBe(false);
  });
});

describe("source pins — the flag gates every vendor mount; the firm page renders the lifted component", () => {
  it("the vendor page passes followUpMc only behind isVendorFollowUpMcEnabled(); the routes validate with process.env", () => {
    const page = read("app/(app)/vendor/product-assessment/[productId]/page.tsx");
    expect(page).toMatch(/isVendorFollowUpMcEnabled\(\)\s*\?\s*\{\s*followUpMc:/);
    for (const rel of ["app/api/vendor/product-assessment/draft/route.ts", "app/api/vendor/product-assessment/submit/route.ts"]) {
      expect(read(rel)).toContain("validateVendorOpenEndedResponses(");
      expect(read(rel)).toContain("enabled: process.env");
    }
  });

  it("one option-row component, shared: the firm module page and the vendor client both render FollowUpMcOptionRows", () => {
    expect(read("app/components/assessment/AssessmentModuleClient.tsx")).toContain("<FollowUpMcOptionRows");
    expect(read("app/components/vendor/VendorProductAssessmentClient.tsx")).toContain("<FollowUpMcOptionRows");
    const rows = read("app/components/assessment/FollowUpMcOptionRows.tsx");
    expect(rows).toContain('data-testid="followup-mc"');
    expect(rows).toContain('data-testid="followup-mc-other"');
    expect(rows).toContain("applyFollowUpPick(registryQuestion, current, optionKey)");
  });
});
