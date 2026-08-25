import prisma from "@/lib/prisma";
import { scoreBandFor, type ScoreBandKey } from "@/lib/bandLexicon";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

/**
 * Adaptive module unlock resolver (Block A).
 *
 * DERIVED STATE, NO NEW TABLES — the same discipline as the agent circuit
 * breaker. A firm's scoring pattern and its unlocked modules are computed from
 * rows that already exist (SurveySubmission, ModuleUnlockRule, ModuleTemplate,
 * EngagementQuarter), so the resolver can never drift out of sync with the data
 * an operator is looking at, and there is no cache to invalidate.
 *
 * PURE AND DETERMINISTIC: same DB state in, same output out. No writes, no
 * model calls, no notification wiring — unlock pings are Block C.
 *
 * FLAG-DARK: nothing in the serving path calls this yet. The functions are
 * callable with the flag off by design (that is what makes them testable);
 * the flag gates SURFACES, not the arithmetic.
 */

export const ADAPTIVE_MODULES_FLAG_ENV = "PAT_ENABLE_ADAPTIVE_MODULES";

/** Adaptive module surfaces are off unless explicitly enabled. Default off. */
export function isAdaptiveModulesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[ADAPTIVE_MODULES_FLAG_ENV] === "1";
}

/**
 * Pattern-key vocabulary: "<category>:<band>". ONE spelling of every fact.
 *
 * `category` is the pillar's lowercased short name (Operations → "operations"),
 * the axis label already used everywhere customer-facing.
 *
 * `band` is the five-band lexicon key from scoreBandFor(), and nothing else:
 *   early | developing | building | established | leading
 *
 * A coarse low/mid/high vocabulary was considered and rejected (Mythos, Box 4
 * verdict): coarse is always recoverable by authoring two precise rules
 * (early + developing), but precise can never be recovered from coarse. One
 * vocabulary means rule authoring and future eval goldens have exactly one
 * spelling of every fact.
 */

/** Pillar category token for a module key, e.g. "integration". */
export function categoryForModuleKey(moduleKey: string): string | null {
  const definition = FIRM_MODULE_DEFINITIONS.find((entry) => entry.key === moduleKey);
  return definition ? definition.pillarName.toLowerCase() : null;
}

export interface PillarBand {
  moduleKey: string;
  category: string;
  scorePercent: number;
  band: ScoreBandKey;
  submittedAt: Date;
}

export interface ScoringPattern {
  companyId: string;
  /** One entry per pillar with a scored submission, ordered by category. */
  pillars: PillarBand[];
  /** Every "<category>:<band>" key, sorted and deduped. */
  keys: string[];
  /**
   * The composite: every pillar key, sorted, joined with "+". One string
   * identifying the whole pattern, so a rule can target a full profile rather
   * than a single weak pillar. Empty string when no pillar is scored.
   */
  composite: string;
}

/**
 * Latest scored submission per pillar module → band → pattern keys.
 *
 * "Latest" is per module, by createdAt desc, and only final (non-draft)
 * submissions count — a half-finished module must not move a firm's pattern.
 */
export async function computeScoringPattern(companyId: string): Promise<ScoringPattern> {
  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((definition) => definition.key);

  const modules = await prisma.surveyModule.findMany({
    where: { key: { in: moduleKeys } },
    select: { id: true, key: true },
  });
  const moduleKeyById = new Map(modules.map((entry) => [entry.id, entry.key]));

  const submissions = await prisma.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      companyId,
      SurveyModule: { key: { in: moduleKeys } },
    }),
    orderBy: { createdAt: "desc" },
    select: { moduleId: true, score: true, createdAt: true },
  });

  // First row per module wins — the list is already newest-first.
  const latestByModuleKey = new Map<string, { score: number; createdAt: Date }>();
  for (const submission of submissions) {
    const key = moduleKeyById.get(submission.moduleId);
    if (!key || latestByModuleKey.has(key)) {
      continue;
    }
    latestByModuleKey.set(key, { score: submission.score, createdAt: submission.createdAt });
  }

  const pillars: PillarBand[] = [];
  for (const definition of FIRM_MODULE_DEFINITIONS) {
    const latest = latestByModuleKey.get(definition.key);
    if (!latest) {
      continue;
    }
    const band = scoreBandFor(latest.score);
    pillars.push({
      moduleKey: definition.key,
      category: definition.pillarName.toLowerCase(),
      scorePercent: latest.score,
      band: band.key,
      submittedAt: latest.createdAt,
    });
  }
  // Stable ordering by category so output is byte-identical run to run.
  pillars.sort((left, right) => (left.category < right.category ? -1 : left.category > right.category ? 1 : 0));

  const patternKeys = pillars.map((pillar) => `${pillar.category}:${pillar.band}`);

  return {
    companyId,
    pillars,
    keys: [...new Set(patternKeys)].sort(),
    composite: [...patternKeys].sort().join("+"),
  };
}

export interface UnlockedModule {
  templateId: string;
  unlockedAsOf: Date;
  ruleId: string;
}

/**
 * Resolve which module templates are unlocked for a firm as of `now`.
 *
 * Gates, in order:
 *   1. Rule must be active, and its patternSubset must match one of the firm's
 *      pattern keys (or a composite).
 *   2. Template must be reviewStatus=APPROVED AND active=true. This is a HARD
 *      gate, not a preference: a DRAFT / CLARITY_REVIEW / CPA_REVIEW / RETIRED
 *      module is unreachable even with a perfectly matching rule. Content
 *      reaches customers only when the two-signature publish gate has been
 *      satisfied.
 *   3. quarterOffset drips availability across the firm's EngagementQuarter
 *      rows: offset 0 opens immediately, offset N opens at the due date of the
 *      Nth quarter after the pattern was established.
 *
 * Returns one entry per unlocked template, earliest unlock wins on ties, sorted
 * by templateId for deterministic output.
 */
export async function resolveUnlocks(companyId: string, now: Date = new Date()): Promise<UnlockedModule[]> {
  const pattern = await computeScoringPattern(companyId);
  if (pattern.keys.length === 0) {
    return [];
  }

  const candidateSubsets = [...pattern.keys, pattern.composite].filter((entry) => entry.length > 0);

  const rules = await prisma.moduleUnlockRule.findMany({
    where: { active: true, patternSubset: { in: candidateSubsets } },
    select: {
      id: true,
      templateId: true,
      patternSubset: true,
      quarterOffset: true,
      ModuleTemplate: { select: { id: true, reviewStatus: true, active: true } },
    },
    orderBy: { id: "asc" },
  });
  if (rules.length === 0) {
    return [];
  }

  // The publish gate. Filtering here rather than in the query keeps the reason
  // explicit and greppable.
  const publishable = rules.filter(
    (rule) => rule.ModuleTemplate.reviewStatus === "APPROVED" && rule.ModuleTemplate.active
  );
  if (publishable.length === 0) {
    return [];
  }

  const quarters = await prisma.engagementQuarter.findMany({
    where: { companyId },
    orderBy: { dueDate: "asc" },
    select: { dueDate: true },
  });

  // The pattern's own establishment time is the drip anchor: the most recent
  // pillar submission that produced it.
  const patternAsOf = pattern.pillars.reduce<Date | null>(
    (latest, pillar) => (latest === null || pillar.submittedAt > latest ? pillar.submittedAt : latest),
    null
  );

  const unlocked = new Map<string, UnlockedModule>();
  for (const rule of publishable) {
    const unlockedAsOf = unlockDateFor(rule.quarterOffset, patternAsOf, quarters);
    if (unlockedAsOf === null || unlockedAsOf > now) {
      continue; // still dripping
    }
    const existing = unlocked.get(rule.templateId);
    if (!existing || unlockedAsOf < existing.unlockedAsOf) {
      unlocked.set(rule.templateId, { templateId: rule.templateId, unlockedAsOf, ruleId: rule.id });
    }
  }

  return [...unlocked.values()].sort((left, right) =>
    left.templateId < right.templateId ? -1 : left.templateId > right.templateId ? 1 : 0
  );
}

/**
 * When a rule with `quarterOffset` opens.
 *
 * Offset 0 opens as soon as the pattern exists. Offset N opens at the due date
 * of the Nth engagement quarter that ends after the pattern was established —
 * so the drip follows the firm's own engagement calendar rather than a rolling
 * 90 days. A firm with no quarters configured gets no dripped modules (null);
 * offset-0 modules still open, because they do not depend on the calendar.
 */
export function unlockDateFor(
  quarterOffset: number,
  patternAsOf: Date | null,
  quarters: ReadonlyArray<{ dueDate: Date }>
): Date | null {
  if (patternAsOf === null) {
    return null;
  }
  if (quarterOffset <= 0) {
    return patternAsOf;
  }
  const upcoming = quarters.filter((quarter) => quarter.dueDate >= patternAsOf);
  const target = upcoming[quarterOffset - 1];
  return target ? target.dueDate : null;
}
