import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  VENDOR_FOLLOWUP_MC_QUESTIONS,
  VENDOR_FOLLOWUP_MC_VERSION,
  VENDOR_FOLLOWUP_MODULE_KEY,
  VENDOR_FOLLOWUP_MULTI_QUESTION_KEYS,
  VENDOR_FOLLOWUP_OPTIONS_SHA256,
  VENDOR_FOLLOWUP_OTHER_MAX_LENGTH,
  getVendorFollowUpQuestion,
  getVendorFollowUpQuestionForId,
} from "@/lib/assessment/vendorFollowUpOptions";
import { applyFollowUpPick, validateFollowUpMcAnswer } from "@/lib/assessment/firmFollowUpOptions";
import { isVendorFollowUpMcEnabled, PAT_VENDOR_FOLLOWUP_MC_FLAG_ENV } from "@/lib/vendorFollowUpMc";
import { getLocaleMessages, SUPPORTED_LOCALES } from "@/lib/locale";
import { demoVendorFollowUpPick } from "@/lib/demoPatEcosystemSeed";

/**
 * vendor-followup-mc box (2026-09-30). The registry is generated from Mythos's
 * option file; these pins hold it to the file verbatim, the same way the firm
 * registry is held to Leslie's file.
 */
const ROOT = path.resolve(__dirname, "..");
const FILE = readFileSync(path.join(ROOT, "docs/assessment/vendor-followup-mc-options-2026-09-30.md"), "utf8");

type ParsedOption = { letter: string; kind: "choice" | "not_significant" | "other"; label: string; consequence: string | null };
type ParsedQuestion = { n: number; questionKey: string; selectionMode: "SINGLE" | "MULTI"; stem: string; options: ParsedOption[] };

function parseOptionsFile(source: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  let current: ParsedQuestion | null = null;
  for (const line of source.split("\n")) {
    const header = line.match(/^## Q(\d+) ([a-z_]+) \((SINGLE|MULTI)\)$/);
    if (header) {
      current = { n: Number(header[1]), questionKey: header[2], selectionMode: header[3] as "SINGLE" | "MULTI", stem: "", options: [] };
      questions.push(current);
      continue;
    }
    if (!current) continue;
    const stem = line.match(/^Stem as built \(adaptive\): (.+)$/);
    if (stem) {
      current.stem = stem[1].trim();
      continue;
    }
    const option = line.match(/^- ([a-h])\. (.+)$/);
    if (!option) continue;
    const [, letter, text] = option;
    if (letter === "g") current.options.push({ letter, kind: "not_significant", label: "Not a significant issue here", consequence: null });
    else if (letter === "h") current.options.push({ letter, kind: "other", label: "Other (short answer)", consequence: null });
    else {
      const [label, consequence] = text.trim().split(" Consequence: ");
      current.options.push({ letter, kind: "choice", label, consequence });
    }
  }
  return questions;
}

const PARSED = parseOptionsFile(FILE);

describe("vendor follow-up registry — verbatim from the options file", () => {
  it("the file is the one the registry names (sha256) and parses to ten questions of eight options", () => {
    expect(createHash("sha256").update(FILE).digest("hex")).toBe(VENDOR_FOLLOWUP_OPTIONS_SHA256);
    expect(PARSED).toHaveLength(10);
    expect(PARSED.every((question) => question.options.length === 8)).toBe(true);
  });

  it("every key, mode, stem, label and consequence matches the file, in order", () => {
    expect(VENDOR_FOLLOWUP_MC_QUESTIONS).toHaveLength(10);
    PARSED.forEach((parsed, index) => {
      const question = VENDOR_FOLLOWUP_MC_QUESTIONS[index];
      expect(question.questionKey).toBe(parsed.questionKey);
      expect(question.index).toBe(parsed.n);
      expect(question.selectionMode).toBe(parsed.selectionMode);
      expect(question.stem).toBe(parsed.stem);
      expect(question.moduleKey).toBe(VENDOR_FOLLOWUP_MODULE_KEY);
      expect(question.options.map((option) => option.letter)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
      parsed.options.forEach((option, optionIndex) => {
        const registry = question.options[optionIndex];
        expect(registry.kind).toBe(option.kind);
        expect(registry.label).toBe(option.label);
        expect(registry.consequence).toBe(option.consequence);
        const suffix = option.kind === "choice" ? option.letter : option.kind === "other" ? "other" : "none";
        expect(registry.key).toBe(`prod.q${parsed.n}.${suffix}`);
      });
    });
  });

  it("modes: MULTI for exactly Q7, Q8, Q9; SINGLE for the rest; version 1; Other at most 280", () => {
    expect([...VENDOR_FOLLOWUP_MULTI_QUESTION_KEYS]).toEqual(["best_fit_customer", "poor_fit_customer", "evidence_needed_next"]);
    for (const question of VENDOR_FOLLOWUP_MC_QUESTIONS) {
      const multi = (VENDOR_FOLLOWUP_MULTI_QUESTION_KEYS as readonly string[]).includes(question.questionKey);
      expect(question.selectionMode).toBe(multi ? "MULTI" : "SINGLE");
    }
    expect(VENDOR_FOLLOWUP_MC_VERSION).toBe(1);
    expect(VENDOR_FOLLOWUP_OTHER_MAX_LENGTH).toBe(280);
  });

  it("lookups: by key and by the runtime id's last __ segment; unknown keys are null", () => {
    expect(getVendorFollowUpQuestion("strongest_workflow")?.index).toBe(1);
    expect(getVendorFollowUpQuestionForId("product_open_ended_v1__recommended_next_action")?.index).toBe(10);
    expect(getVendorFollowUpQuestion("operating-model_open_1")).toBeNull();
  });

  it("the firm rulings apply through the shared helpers (no fork): exclusive none, Other needs text, SINGLE one pick", () => {
    const single = getVendorFollowUpQuestion("strongest_workflow")!;
    const multi = getVendorFollowUpQuestion("best_fit_customer")!;
    expect(applyFollowUpPick(single, { optionKeys: ["prod.q1.a"], otherText: null }, "prod.q1.b").optionKeys).toEqual(["prod.q1.b"]);
    expect(applyFollowUpPick(multi, { optionKeys: ["prod.q7.a", "prod.q7.b"], otherText: null }, "prod.q7.none").optionKeys).toEqual(["prod.q7.none"]);
    expect(validateFollowUpMcAnswer(single, { optionKeys: ["prod.q1.a", "prod.q1.b"] }, true).ok).toBe(false);
    expect(validateFollowUpMcAnswer(multi, { optionKeys: ["prod.q7.a", "prod.q7.other"], otherText: "Bookkeeping-led firms" }, true)).toEqual({
      ok: true,
      value: { optionKeys: ["prod.q7.a", "prod.q7.other"], otherText: "Bookkeeping-led firms" },
    });
    expect(validateFollowUpMcAnswer(multi, { optionKeys: ["prod.q7.other"], otherText: "" }, true).ok).toBe(false);
    expect(validateFollowUpMcAnswer(multi, { optionKeys: ["prod.q7.other"], otherText: "x".repeat(281) }, true).ok).toBe(false);
  });

  it("flag: PAT_ENABLE_VENDOR_FOLLOWUP_MC === \"1\" only, independent of the firm flag", () => {
    expect(PAT_VENDOR_FOLLOWUP_MC_FLAG_ENV).toBe("PAT_ENABLE_VENDOR_FOLLOWUP_MC");
    expect(isVendorFollowUpMcEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(isVendorFollowUpMcEnabled({ PAT_ENABLE_VENDOR_FOLLOWUP_MC: "true" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isVendorFollowUpMcEnabled({ PAT_ENABLE_FOLLOWUP_MC: "1" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isVendorFollowUpMcEnabled({ PAT_ENABLE_VENDOR_FOLLOWUP_MC: "1" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("change 8 — locale carries the panel title and the row states in all three languages", () => {
  it("every locale has the vendorFollowUp group with non-empty, distinct strings", () => {
    const seen = new Set<string>();
    for (const locale of SUPPORTED_LOCALES) {
      const group = getLocaleMessages(locale).vendorFollowUp;
      for (const key of ["panelEyebrow", "panelTitle", "unitSingular", "unitPlural", "captured", "awaiting", "shortAnswer", "otherAria"] as const) {
        expect(group[key].trim().length).toBeGreaterThan(0);
      }
      seen.add(group.panelEyebrow);
    }
    expect(seen.size).toBe(3);
  });
});

describe("change 7 — seeded picks answer every question and never one option at 100 percent", () => {
  it("over twenty products every registry question sees at least two distinct choices; MULTI takes two; Q9 carries an Other write-in", () => {
    for (const question of VENDOR_FOLLOWUP_MC_QUESTIONS) {
      const keys = new Set<string>();
      for (let productIndex = 0; productIndex < 20; productIndex += 1) {
        const pick = demoVendorFollowUpPick(question.questionKey, productIndex)!;
        expect(pick.optionKeys.length).toBeGreaterThan(0);
        for (const key of pick.optionKeys) keys.add(key);
        if (question.selectionMode === "MULTI") expect(pick.optionKeys.length).toBeGreaterThanOrEqual(2);
        if (pick.optionKeys.some((key) => key.endsWith(".other"))) expect(pick.otherText?.length ?? 0).toBeGreaterThan(0);
      }
      expect([...keys].filter((key) => !key.endsWith(".none") && !key.endsWith(".other")).length).toBeGreaterThanOrEqual(2);
    }
    expect(demoVendorFollowUpPick("evidence_needed_next", 0)!.optionKeys.some((key) => key === "prod.q9.other")).toBe(true);
    expect(demoVendorFollowUpPick("unknown_key", 0)).toBeNull();
  });
});
