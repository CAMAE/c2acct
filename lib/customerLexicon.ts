/**
 * Block 17 Track B / B2 — customer-surface lexicon sweep. The BattleCard v2
 * discovery-question strings are rendered by the SHARED consultant question
 * engine ([[perFirmQuestionLibrary]]), whose copy was written for an internal
 * consultant audience. Before those (and any other ported) strings render on a
 * VENDOR customer surface, they pass through this sweep: internal shorthand and
 * analyst jargon are rewritten to plain buyer-facing language, and no consultant
 * reference survives. Pinned by tests/customer-lexicon.contract.test.ts, which
 * runs every library template through the sweep and asserts zero violations —
 * so a new template can't reintroduce internal vocab on the customer surface.
 */

type LexiconRule = { pattern: RegExp; replacement: string };

/** Internal-shorthand / analyst phrases → plain buyer-facing equivalents. */
const LEXICON_RULES: readonly LexiconRule[] = [
  { pattern: /surface that to other prospects honestly/gi, replacement: "address it openly with other buyers" },
  { pattern: /\bthe canary\b/gi, replacement: "the first to raise it" },
  { pattern: /\bcanary\b/gi, replacement: "early indicator" },
  { pattern: /\boff-ramp\b/gi, replacement: "exit path" },
  { pattern: /\bscope-reduce\b/gi, replacement: "narrow the scope" },
  { pattern: /rebuild internal capability/gi, replacement: "build the capability in-house" },
  { pattern: /\bself-aligned\b/gi, replacement: "self-reported in line" },
  { pattern: /\bself-read\b/gi, replacement: "self-reported score" },
  { pattern: /\bother prospects\b/gi, replacement: "other buyers" },
];

/** Tokens that must NEVER appear on the vendor customer surface. */
const BANNED_TOKENS: readonly RegExp[] = [
  /\bcanary\b/i,
  /\boff-ramp\b/i,
  /\bscope-reduce\b/i,
  /\bself-aligned\b/i,
  /\bself-read\b/i,
  /rebuild internal capability/i,
  /\bother prospects\b/i,
  /\bconsultant\b/i,
  /\badvisor\b/i,
];

/** Rewrite one string for the vendor customer surface. */
export function sweepVendorSurfaceCopy(text: string): string {
  let out = text;
  for (const rule of LEXICON_RULES) out = out.replace(rule.pattern, rule.replacement);
  return out;
}

/** The banned tokens still present in a string (empty = clean). */
export function vendorSurfaceCopyViolations(text: string): string[] {
  return BANNED_TOKENS.filter((re) => re.test(text)).map((re) => re.source);
}
