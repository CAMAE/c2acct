import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  FIRM_TIER1_INSIGHT_CAPABILITY_RULES,
} from "@/lib/firmCapabilities";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT,
  FIRM_MODULE_QUESTION_STEMS,
  FIRM_TIER1_INSIGHT_DEFINITIONS,
} from "@/lib/firmPat";

const ROOT = process.cwd();
const LEGACY_FIRM_MODULE_KEY = ["firm", "alignment", "v1"].join("_");
const CANONICAL_DOC_ROOTS = [
  "README.md",
  "docs",
  "app",
  "lib",
  "prisma",
  "scripts",
] as const;
const IGNORED_SEGMENTS = new Set(["archive", "node_modules", ".next", "build", "out", "tmp"]);

function fail(message: string): never {
  throw new Error(message);
}

function listFiles(inputPath: string): string[] {
  const fullPath = join(ROOT, inputPath);
  const stats = statSync(fullPath);
  if (!stats.isDirectory()) {
    return [fullPath];
  }

  const entries = readdirSync(fullPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (IGNORED_SEGMENTS.has(entry.name)) {
      return [];
    }
    const nextPath = join(inputPath, entry.name);
    if (entry.isDirectory()) {
      return listFiles(nextPath);
    }
    return [join(ROOT, nextPath)];
  });
}

function scanForForbiddenCanonicalDrift() {
  const files = CANONICAL_DOC_ROOTS.flatMap((root) => listFiles(root));
  const forbiddenMatches: string[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    if (content.includes(LEGACY_FIRM_MODULE_KEY)) {
      forbiddenMatches.push(filePath.replace(`${ROOT}/`, ""));
    }
  }

  if (forbiddenMatches.length > 0) {
    fail(
      `Canonical PAT drift detected: found forbidden legacy key ${LEGACY_FIRM_MODULE_KEY} in ${forbiddenMatches.join(", ")}.`
    );
  }
}

function validateCanonicalFirmRuntime() {
  if (FIRM_MODULE_DEFINITIONS.length !== 5) {
    fail(`Expected 5 canonical PAT firm modules, found ${FIRM_MODULE_DEFINITIONS.length}.`);
  }

  if (FIRM_MODULE_QUESTION_STEMS.length !== 20) {
    fail(`Expected 20 canonical PAT question stems, found ${FIRM_MODULE_QUESTION_STEMS.length}.`);
  }

  if (FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT !== 5) {
    fail(
      `Expected 5 canonical PAT open-ended follow-up prompts per module, found ${FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT}.`
    );
  }

  const expectedScoredQuestionTotal =
    FIRM_MODULE_DEFINITIONS.length * FIRM_MODULE_QUESTION_STEMS.length;
  if (expectedScoredQuestionTotal !== 100) {
    fail(
      `Expected 100 total canonical PAT scored firm questions, computed ${expectedScoredQuestionTotal}.`
    );
  }

  const expectedQuestionTotal =
    FIRM_MODULE_DEFINITIONS.length *
    (FIRM_MODULE_QUESTION_STEMS.length + FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT);
  if (expectedQuestionTotal !== 125) {
    fail(`Expected 125 total canonical PAT firm questions, computed ${expectedQuestionTotal}.`);
  }
}

function validateProInsightRuleCoverage() {
  for (const insight of FIRM_TIER1_INSIGHT_DEFINITIONS) {
    const rules =
      FIRM_TIER1_INSIGHT_CAPABILITY_RULES[
        insight.key as keyof typeof FIRM_TIER1_INSIGHT_CAPABILITY_RULES
      ];
    if (!rules) {
      fail(`Firm Pro insight ${insight.key} is missing seeded capability rule coverage.`);
    }
  }
}

function main() {
  validateCanonicalFirmRuntime();
  validateProInsightRuleCoverage();
  scanForForbiddenCanonicalDrift();

  console.log(
    `PASS check-pat-runtime-consistency: ${FIRM_MODULE_DEFINITIONS.length} canonical firm modules, ${FIRM_MODULE_QUESTION_STEMS.length} scored questions plus ${FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT} open-ended follow-ups each, ${FIRM_TIER1_INSIGHT_DEFINITIONS.length} Pro insights with rule coverage, no canonical ${LEGACY_FIRM_MODULE_KEY} drift.`
  );
}

main();
