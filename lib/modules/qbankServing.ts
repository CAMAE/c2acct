import { ModuleDifficulty, ModuleReviewStatus } from "@prisma/client";

import { moduleRotationOffset, rotateByOffset } from "@/lib/moduleOrderRotation";
import { canServeTemplate } from "@/lib/modules/serving";

/**
 * PAT final-exam serving (Sprint 4 M2, 2026-07-08).
 *
 * Draws the per-sitting final exam from a bank larger than any one sitting,
 * per PATALIGN-MODULE-METHODOLOGY-OUTLINE §2–4:
 *   - Final assessment floor of 30 scored questions (Cam's floor, above the
 *     NASBA 5/credit minimum).
 *   - Anchor items appear for every firm unchanged (cross-firm benchmark thread).
 *   - Difficulty mix targets ~30 / 50 / 20 (easy / moderate / hard).
 *   - Selection is STRESS-WEIGHTED: highest-discrimination items are favored
 *     (calibration placeholders until real sitting data accrues).
 *   - Order is a Latin-square rotation deterministic from userId and stable on
 *     resume (same rotation primitive as module-order rotation), so order-bias
 *     is killed and answer-sharing between firms is devalued.
 *
 * Pure + deterministic (no Date/Math.random). Serving still routes through the
 * review-gate: an unapproved template yields an empty exam.
 */

export const FINAL_EXAM_SIZE = 30;

export const DIFFICULTY_MIX: Record<ModuleDifficulty, number> = {
  [ModuleDifficulty.EASY]: 0.3,
  [ModuleDifficulty.MODERATE]: 0.5,
  [ModuleDifficulty.HARD]: 0.2,
};

export type ServableBankItem = {
  key: string;
  difficulty: ModuleDifficulty;
  isAnchor: boolean;
  discriminationSeed: number;
  /** Attached source rows — an item with none is never servable. */
  sources: ReadonlyArray<unknown>;
};

// FNV-1a-style stable hash, mirrors lib/moduleOrderRotation for consistency.
function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Per-user stress rank: discrimination dominates, with a stable per-user jitter
 * that varies selection among similarly-discriminating items (so two firms draw
 * overlapping-but-not-identical exams) without ever using randomness.
 */
function stressRank(item: ServableBankItem, userId: string): number {
  const jitter = (stableHash(`${userId}:${item.key}`) % 1000) / 1000; // [0,1)
  return item.discriminationSeed * 1000 + jitter;
}

function targetPerTier(size: number): Record<ModuleDifficulty, number> {
  const easy = Math.round(size * DIFFICULTY_MIX[ModuleDifficulty.EASY]);
  const moderate = Math.round(size * DIFFICULTY_MIX[ModuleDifficulty.MODERATE]);
  const hard = size - easy - moderate;
  return {
    [ModuleDifficulty.EASY]: easy,
    [ModuleDifficulty.MODERATE]: moderate,
    [ModuleDifficulty.HARD]: hard,
  };
}

export type FinalExamPlan = {
  servable: boolean;
  reason: string | null;
  /** Ordered items for this user's sitting. */
  items: ServableBankItem[];
};

/**
 * Plan a user's final exam draw. Anchors are always included; the remainder is
 * stress-weighted and difficulty-balanced, then the whole set is Latin-square
 * rotated for this user.
 */
export function planFinalExam(
  bank: ReadonlyArray<ServableBankItem>,
  userId: string,
  template: { reviewStatus: ModuleReviewStatus },
  size: number = FINAL_EXAM_SIZE
): FinalExamPlan {
  if (!canServeTemplate(template)) {
    return { servable: false, reason: `template not approved (reviewStatus=${template.reviewStatus})`, items: [] };
  }

  // Only sourced items are ever eligible (the sourced-content bar).
  const eligible = bank.filter((item) => Array.isArray(item.sources) && item.sources.length > 0);

  const anchors = eligible.filter((item) => item.isAnchor);
  const selectedKeys = new Set(anchors.map((item) => item.key));

  // Remaining need per tier, after anchors already claim their slots.
  const targets = targetPerTier(size);
  const remaining: Record<ModuleDifficulty, number> = { ...targets };
  for (const anchor of anchors) {
    remaining[anchor.difficulty] = Math.max(0, remaining[anchor.difficulty] - 1);
  }

  const picked: ServableBankItem[] = [...anchors];

  const tierPool = (tier: ModuleDifficulty) =>
    eligible
      .filter((item) => item.difficulty === tier && !selectedKeys.has(item.key))
      .sort((a, b) => stressRank(b, userId) - stressRank(a, userId));

  for (const tier of [ModuleDifficulty.EASY, ModuleDifficulty.MODERATE, ModuleDifficulty.HARD]) {
    for (const item of tierPool(tier)) {
      if (remaining[tier] <= 0) break;
      picked.push(item);
      selectedKeys.add(item.key);
      remaining[tier] -= 1;
    }
  }

  // Backfill if any tier was too shallow to hit its target — draw the next
  // highest-stress items from whatever remains, so the exam still reaches `size`.
  if (picked.length < size) {
    const backfill = eligible
      .filter((item) => !selectedKeys.has(item.key))
      .sort((a, b) => stressRank(b, userId) - stressRank(a, userId));
    for (const item of backfill) {
      if (picked.length >= size) break;
      picked.push(item);
      selectedKeys.add(item.key);
    }
  }

  const capped = picked.slice(0, size);

  // Latin-square presentation order, deterministic + resume-stable per user.
  const ordered = rotateByOffset(capped, moduleRotationOffset(userId, capped.length));

  return { servable: ordered.length > 0, reason: null, items: ordered };
}
