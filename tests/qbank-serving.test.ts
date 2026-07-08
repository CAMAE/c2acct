import { describe, expect, it } from "vitest";
import { ModuleDifficulty, ModuleReviewStatus } from "@prisma/client";
import {
  DIFFICULTY_MIX,
  FINAL_EXAM_SIZE,
  planFinalExam,
  type ServableBankItem,
} from "@/lib/modules/qbankServing";

/**
 * Serving contract (Sprint 4 M2): the final-exam draw is a Latin-square,
 * stress-weighted, difficulty-balanced, anchor-preserving, deterministic
 * selection — and it never serves from an unapproved template or unsourced item.
 */

const APPROVED = { reviewStatus: ModuleReviewStatus.APPROVED };

// Build a 90-item bank matching the real 27/45/18 mix, with the 6 anchors
// (4 moderate, 2 hard) mirroring A9/B8/C8/D6 (M) and C19/D17 (H).
function buildBank(): ServableBankItem[] {
  const items: ServableBankItem[] = [];
  const add = (prefix: string, count: number, difficulty: ModuleDifficulty, anchorIdx: number[] = []) => {
    for (let i = 0; i < count; i += 1) {
      items.push({
        key: `${prefix}-${i}`,
        difficulty,
        isAnchor: anchorIdx.includes(i),
        // Spread discrimination so stress-weighting has something to prefer.
        discriminationSeed: 0.2 + ((i * 7) % 60) / 100,
        sources: [{ sourceOrg: "GAO" }],
      });
    }
  };
  add("e", 27, ModuleDifficulty.EASY);
  add("m", 45, ModuleDifficulty.MODERATE, [0, 1, 2, 3]); // 4 moderate anchors
  add("h", 18, ModuleDifficulty.HARD, [0, 1]); // 2 hard anchors
  return items;
}

const BANK = buildBank();

function diffCounts(items: ServableBankItem[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.difficulty] = (acc[item.difficulty] ?? 0) + 1;
    return acc;
  }, {});
}

describe("qbank final-exam serving", () => {
  it("difficulty mix sums to 1.0", () => {
    const total = Object.values(DIFFICULTY_MIX).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it("draws exactly the final-exam size", () => {
    const plan = planFinalExam(BANK, "firm-user-1", APPROVED);
    expect(plan.servable).toBe(true);
    expect(plan.items).toHaveLength(FINAL_EXAM_SIZE);
  });

  it("always includes every anchor item", () => {
    const plan = planFinalExam(BANK, "firm-user-1", APPROVED);
    const keys = new Set(plan.items.map((i) => i.key));
    for (const anchor of BANK.filter((i) => i.isAnchor)) {
      expect(keys.has(anchor.key)).toBe(true);
    }
  });

  it("hits the 30/50/20 difficulty target", () => {
    const plan = planFinalExam(BANK, "firm-user-1", APPROVED);
    const counts = diffCounts(plan.items);
    expect(counts[ModuleDifficulty.EASY]).toBe(9);
    expect(counts[ModuleDifficulty.MODERATE]).toBe(15);
    expect(counts[ModuleDifficulty.HARD]).toBe(6);
  });

  it("is deterministic and resume-stable for a given user", () => {
    const a = planFinalExam(BANK, "firm-user-42", APPROVED);
    const b = planFinalExam(BANK, "firm-user-42", APPROVED);
    expect(a.items.map((i) => i.key)).toEqual(b.items.map((i) => i.key));
  });

  it("varies the draw between users (order-bias + answer-sharing defense)", () => {
    const a = planFinalExam(BANK, "firm-user-1", APPROVED).items.map((i) => i.key);
    const b = planFinalExam(BANK, "firm-user-2", APPROVED).items.map((i) => i.key);
    expect(a).not.toEqual(b);
  });

  it("favors higher-discrimination items (stress-weighting)", () => {
    // Average discrimination of the served easy items should beat the bank's
    // easy-tier average, since selection prefers high-discrimination items.
    const served = planFinalExam(BANK, "firm-user-7", APPROVED).items.filter(
      (i) => i.difficulty === ModuleDifficulty.EASY
    );
    const servedAvg = served.reduce((s, i) => s + i.discriminationSeed, 0) / served.length;
    const easyPool = BANK.filter((i) => i.difficulty === ModuleDifficulty.EASY);
    const poolAvg = easyPool.reduce((s, i) => s + i.discriminationSeed, 0) / easyPool.length;
    expect(servedAvg).toBeGreaterThan(poolAvg);
  });

  it("withholds everything from an unapproved template", () => {
    for (const status of Object.values(ModuleReviewStatus)) {
      if (status === ModuleReviewStatus.APPROVED) continue;
      const plan = planFinalExam(BANK, "firm-user-1", { reviewStatus: status });
      expect(plan.servable).toBe(false);
      expect(plan.items).toHaveLength(0);
    }
  });

  it("never serves an unsourced item", () => {
    const withUnsourced: ServableBankItem[] = [
      ...BANK,
      { key: "unsourced-1", difficulty: ModuleDifficulty.EASY, isAnchor: false, discriminationSeed: 9.9, sources: [] },
    ];
    const plan = planFinalExam(withUnsourced, "firm-user-1", APPROVED);
    expect(plan.items.some((i) => i.key === "unsourced-1")).toBe(false);
  });
});
