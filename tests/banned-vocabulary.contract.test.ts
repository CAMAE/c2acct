import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONFIDENCE_BAND_LABEL } from "@/lib/confidenceBands";

/**
 * Banned-vocabulary regression (B5-3, 4/22 rules). Customer-facing surfaces must
 * not use the rejected status/confidence vocabulary — the "Emerging signal" band
 * label (board hero regression) and "Live" status badges were the live offenders.
 * Extends the copy contract to the Alignment Board hero + the Elite Insights v2
 * cards. Phrase-level (not raw-token) so it does not false-positive on code
 * identifiers like `swapStaged` or the `emerging` band KEY.
 */

const ROOT = "/Users/camerongarrett/work/c2acct-live";

/** Customer-facing copy files this rule guards. */
const guardedFiles = [
  "app/components/firm/AlignmentBoardClient.tsx",
  "app/components/insights/elite/EliteCardShell.tsx",
  "app/components/insights/elite/FirmPeerPositionCard.tsx",
  "app/components/insights/elite/FirmGapPlanCard.tsx",
  "app/components/insights/elite/FirmTrajectoryCard.tsx",
  "app/components/insights/elite/VendorCategoryPositionCard.tsx",
  "app/components/insights/elite/VendorDemandSignalsCard.tsx",
  "app/components/insights/elite/VendorGapMapCard.tsx",
  "lib/confidenceBands.ts",
];

/** Rejected phrases as they would appear in rendered copy or status labels. */
const bannedPhrases = [
  "Emerging signal",
  "Live · Elite",
  'statusLabel: "Live',
  "Below threshold",
] as const;

describe("banned vocabulary — board + Elite v2 surfaces", () => {
  it("no guarded surface uses the rejected status/confidence vocabulary", () => {
    for (const relativePath of guardedFiles) {
      const text = readFileSync(path.join(ROOT, relativePath), "utf8");
      for (const phrase of bannedPhrases) {
        expect(text, `${relativePath} should not contain "${phrase}"`).not.toContain(phrase);
      }
    }
  });

  it("the shared confidence band labels carry no banned token", () => {
    for (const label of Object.values(CONFIDENCE_BAND_LABEL)) {
      expect(label).not.toMatch(/\bEmerging\b/i);
      expect(label).not.toMatch(/\bLive\b/i);
      expect(label).not.toMatch(/\bLocked\b/i);
      expect(label).not.toMatch(/Below threshold/i);
    }
  });
});
