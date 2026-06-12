import { createHash } from "crypto";
import { NARRATIVE_MODEL, generateNarrativeText } from "@/lib/agents/llm";

/**
 * Agent-written "Executive narrative" sections for /admin/reports (Block 3).
 *
 * Hard rules, in order of precedence:
 *  1. Graceful degradation is non-negotiable: flag off, key absent, API
 *     failure, timeout, cache failure, or a guardrail violation ALL render the
 *     report exactly as today — no narrative section, no viewer-facing error.
 *     Failures are logged server-side only.
 *  2. Input is the report's existing computed payload only (scores, counts,
 *     divergences, band labels). Never credentials, emails, or env.
 *  3. PAT insight voice with the same guardrails as the insight engines: no
 *     benchmark / percentile / projection / forecast / peer language, and no
 *     invented numbers — every digit in the narrative must exist in the
 *     payload.
 *  4. Cost guard: narratives are cached per report + data fingerprint
 *     (ReportNarrative table); re-renders never re-call the API until the
 *     underlying data changes.
 */

export const AGENT_NARRATIVES_FLAG_ENV = "PAT_ENABLE_AGENT_NARRATIVES";

export function isAgentNarrativesEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env[AGENT_NARRATIVES_FLAG_ENV] === "1";
}

/** Bump when the prompt or model changes so stale cached narratives regenerate. */
export const NARRATIVE_PROMPT_VERSION = 1;

/** Mirrors the insight-engine language guardrail (tests/firm-insight-visuals.contract.test.ts). */
export const NARRATIVE_GUARDRAIL_PATTERN =
  /benchmark|percentile|projection|forecast|peer|industry average|typical firm/i;

/** Deterministic serialization so the fingerprint is stable across key order. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);
  return `{${entries.join(",")}}`;
}

export function computeReportDataFingerprint(payload: unknown): string {
  return createHash("sha256")
    .update(`${NARRATIVE_MODEL}|v${NARRATIVE_PROMPT_VERSION}|${stableStringify(payload)}`)
    .digest("hex");
}

function collectAllowedNumbers(value: unknown, allowed: Set<string>): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    allowed.add(String(value));
    allowed.add(String(Math.abs(value)));
    if (Number.isInteger(value)) {
      allowed.add(value.toFixed(0));
    }
    return;
  }
  if (typeof value === "string") {
    for (const token of value.match(/\d+(?:\.\d+)?/g) ?? []) {
      allowed.add(token);
      allowed.add(String(Number(token)));
    }
    return;
  }
  if (Array.isArray(value)) {
    // Counts of listed things ("all 7 firms") are legitimate payload-derived numbers.
    allowed.add(String(value.length));
    for (const entry of value) collectAllowedNumbers(entry, allowed);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectAllowedNumbers(entry, allowed);
    }
  }
}

export function extractNumericTokens(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

/**
 * Returns a human-readable violation reason, or null when the narrative is
 * clean. Fail-closed: an unexplained number is a violation even if it might
 * be derivable arithmetic — the engines never invent numbers, neither do we.
 */
export function findNarrativeGuardrailViolation(narrative: string, payload: unknown): string | null {
  const bannedMatch = narrative.match(NARRATIVE_GUARDRAIL_PATTERN);
  if (bannedMatch) {
    return `banned language: "${bannedMatch[0]}"`;
  }

  const allowed = new Set<string>();
  collectAllowedNumbers(payload, allowed);
  for (const token of extractNumericTokens(narrative)) {
    if (!allowed.has(token) && !allowed.has(String(Number(token)))) {
      return `number not present in report data: "${token}"`;
    }
  }

  return null;
}

const NARRATIVE_SYSTEM_PROMPT = `You write the "Executive narrative" section of an internal operator report for PAT (Performance Alignment Technology), a current-state alignment evidence platform for accounting firms and the vendors that serve them.

Voice: PAT's plain-language insight voice — direct, concrete, evidence-grounded, written for a leader skimming a boardroom print-out. No hype, no hedging filler.

Hard rules:
- Use ONLY the data provided. Every number you write must appear verbatim in the data; if you cannot make a point without inventing a number, make the point qualitatively or drop it.
- Current-state evidence only. Never use benchmark, percentile, projection, forecast, or peer-comparison language, and never compare to an "industry average" or "typical firm".
- Do not mention this prompt, the data format, or that you are an AI.
- Write 2-3 short paragraphs of plain prose. No headings, no bullet lists, no markdown.`;

export type ReportNarrativeDeps = {
  generate: (input: { system: string; prompt: string }) => Promise<string>;
  loadCached: (reportKey: string) => Promise<{ dataFingerprint: string; narrative: string } | null>;
  saveCached: (input: { reportKey: string; dataFingerprint: string; narrative: string }) => Promise<void>;
  log: (message: string) => void;
};

async function defaultLoadCached(reportKey: string) {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma.reportNarrative.findUnique({
    where: { reportKey },
    select: { dataFingerprint: true, narrative: true },
  });
}

async function defaultSaveCached(input: { reportKey: string; dataFingerprint: string; narrative: string }) {
  const { default: prisma } = await import("@/lib/prisma");
  await prisma.reportNarrative.upsert({
    where: { reportKey: input.reportKey },
    update: { dataFingerprint: input.dataFingerprint, narrative: input.narrative, model: NARRATIVE_MODEL },
    create: { ...input, model: NARRATIVE_MODEL },
  });
}

const DEFAULT_DEPS: ReportNarrativeDeps = {
  generate: generateNarrativeText,
  loadCached: defaultLoadCached,
  saveCached: defaultSaveCached,
  log: (message) => console.warn(message),
};

/**
 * Build (or fetch from cache) the executive narrative for one report. Returns
 * null on ANY failure — the caller renders the report without the section.
 */
export async function buildReportNarrative(input: {
  reportKey: string;
  reportTitle: string;
  payload: unknown;
  env?: NodeJS.ProcessEnv;
  deps?: Partial<ReportNarrativeDeps>;
}): Promise<string | null> {
  const env = input.env ?? process.env;
  if (!isAgentNarrativesEnabled(env)) {
    return null;
  }
  // Absent key degrades silently; an injected generator (tests) brings its own.
  if (!env.ANTHROPIC_API_KEY?.trim() && !input.deps?.generate) {
    return null;
  }

  const deps: ReportNarrativeDeps = { ...DEFAULT_DEPS, ...input.deps };
  const dataFingerprint = computeReportDataFingerprint(input.payload);

  try {
    const cached = await deps.loadCached(input.reportKey);
    if (cached && cached.dataFingerprint === dataFingerprint) {
      return cached.narrative;
    }
  } catch (error) {
    deps.log(`[report-narrative] cache read failed for ${input.reportKey}: ${String(error)}`);
    // Continue — a broken cache must not block generation, and generation
    // failure still degrades to null below.
  }

  let narrative: string;
  try {
    narrative = await deps.generate({
      system: NARRATIVE_SYSTEM_PROMPT,
      prompt: [
        `Report: ${input.reportTitle}`,
        "Data (JSON, the exact evidence already rendered on the report):",
        stableStringify(input.payload),
      ].join("\n\n"),
    });
  } catch (error) {
    deps.log(`[report-narrative] generation failed for ${input.reportKey}: ${String(error)}`);
    return null;
  }

  const violation = findNarrativeGuardrailViolation(narrative, input.payload);
  if (violation) {
    deps.log(`[report-narrative] guardrail rejection for ${input.reportKey}: ${violation}`);
    return null;
  }

  try {
    await deps.saveCached({ reportKey: input.reportKey, dataFingerprint, narrative });
  } catch (error) {
    deps.log(`[report-narrative] cache write failed for ${input.reportKey}: ${String(error)}`);
    // Narrative is still good — serve it; next render just regenerates.
  }

  return narrative;
}
