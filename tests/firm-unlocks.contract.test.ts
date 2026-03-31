import { describe, expect, it } from "vitest";
import { resolveUnlockedInsights } from "@/lib/insights/evaluateUnlocked";
import { TIER1_ALIGNMENT_BADGE_ID } from "@/lib/patUnlocks";

describe("firm pro unlock rules", () => {
  it("keeps firm pro insights locked without the required capability threshold", () => {
    const unlocked = resolveUnlockedInsights({
      insights: [
        {
          id: "insight-1",
          key: "firm_tier1_operating_baseline",
          title: "Operating baseline",
          body: "test",
          tier: 1,
          badgeRuleIds: [TIER1_ALIGNMENT_BADGE_ID],
          capabilityRules: [{ nodeId: "node-1", minScore: 60 }],
        },
      ],
      earnedBadgeIds: [TIER1_ALIGNMENT_BADGE_ID],
      capabilityScores: [{ nodeId: "node-1", score: 59 }],
    });

    expect(unlocked).toEqual([]);
  });

  it("unlocks firm pro insights only when badge and capability evidence are both present", () => {
    const unlocked = resolveUnlockedInsights({
      insights: [
        {
          id: "insight-1",
          key: "firm_tier1_operating_baseline",
          title: "Operating baseline",
          body: "test",
          tier: 1,
          badgeRuleIds: [TIER1_ALIGNMENT_BADGE_ID],
          capabilityRules: [{ nodeId: "node-1", minScore: 60 }],
        },
      ],
      earnedBadgeIds: [TIER1_ALIGNMENT_BADGE_ID],
      capabilityScores: [{ nodeId: "node-1", score: 81 }],
    });

    expect(unlocked).toHaveLength(1);
    expect(unlocked[0]?.key).toBe("firm_tier1_operating_baseline");
    expect(unlocked[0]?.evidence.earnedBadgeIds).toContain(TIER1_ALIGNMENT_BADGE_ID);
  });
});
