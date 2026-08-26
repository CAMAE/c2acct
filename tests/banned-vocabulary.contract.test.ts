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

/**
 * Block-19 copy-lexicon rider: public and pilot-facing surfaces must not use
 * internal roadmap tone. "shelved" and "staged" describe our backlog, not the
 * customer's product — a surface that is not in the pilot is "not part of the
 * current pilot", and unbilled is "you will not be charged", not "conversion
 * stays staged".
 *
 * Phrase-level, and scoped to copy files rather than the whole repo, so it does
 * not fire on legitimate domain vocabulary: the Alignment Board's "staged
 * candidate" means a swap placed in the sandbox, which is the product's own
 * language and stays.
 */
const copyLexiconFiles = [
  "app/(public)/page.tsx",
  "app/(app)/firm/admin/user-insight/page.tsx",
  "app/components/firm/FirmAdminPanels.tsx",
  "app/components/assessment/AssessmentModuleClient.tsx",
];

/** Internal-tone phrases as they would appear in rendered customer copy. */
const bannedCopyPhrases = [
  "are shelved",
  "is shelved",
  "Shelved for",
  "shelved for the current",
  "stays clearly staged",
  "staged for phase",
] as const;

describe("copy lexicon — no internal roadmap tone on customer surfaces", () => {
  it("no guarded copy surface uses shelved/staged internal tone", () => {
    for (const relativePath of copyLexiconFiles) {
      const text = readFileSync(path.join(ROOT, relativePath), "utf8");
      for (const phrase of bannedCopyPhrases) {
        expect(text, `${relativePath} should not contain "${phrase}"`).not.toContain(phrase);
      }
    }
  });

  it("keeps the Alignment Board's own 'staged candidate' vocabulary", () => {
    // Guard against an over-eager future sweep: this is product language for a
    // swap placed on the board, not the banned "not really live" sense.
    const board = readFileSync(path.join(ROOT, "app/components/firm/AlignmentBoardClient.tsx"), "utf8");
    expect(board).toContain("staged candidate");
  });
});

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

describe("dev-speak sweep (B8-5)", () => {
  it("the mode toggle never renders the dev-speak label 'Disabled'", () => {
    const text = readFileSync(path.join(ROOT, "app/components/pat/PatModeToggle.tsx"), "utf8");
    expect(text).not.toContain('return "Disabled"');
  });

  // Customer-facing copy surfaces must not leak internal build vocabulary as
  // rendered text. NOTE: the billing "scaffold / no live charge" copy is a
  // REQUIRED truthful disclosure (provider proof absent) and is intentionally
  // not swept here.
  const devSpeakGuardedFiles = [
    "app/components/pat/PatModeToggle.tsx",
    "app/components/vendor/VendorBattleCardClient.tsx",
    "app/components/firm/AlignmentBoardClient.tsx",
  ];
  const devSpeakPhrases = ['>DISABLED<', '>DRAFT<', "demo-bench", "hello-world"];

  it("no guarded customer surface renders internal build vocabulary", () => {
    for (const relativePath of devSpeakGuardedFiles) {
      const text = readFileSync(path.join(ROOT, relativePath), "utf8");
      for (const phrase of devSpeakPhrases) {
        expect(text, `${relativePath} should not render "${phrase}"`).not.toContain(phrase);
      }
    }
  });
});

describe("membership customer copy — no dev-speak / stale staged claims (13d)", () => {
  // Elite is a LIVE tier; automated billing is off, disclosed in plain language
  // ("no charge today"). The "checkout scaffold" / "truthful scope" dev-speak and
  // the stale "Elite is staged/future" claims were the class Mythos bounced (13d) —
  // banned here so they can't return on any membership customer surface. The
  // required no-live-charge disclosure stays (plain "no charge" wording); the bare
  // billing "scaffold" mode key is internal and is NOT the banned "checkout scaffold"
  // phrase.
  const membershipGuardedFiles = [
    "lib/membershipContent.ts",
    "app/components/membership/MembershipPlanPanel.tsx",
    "app/components/membership/MembershipCheckoutShell.tsx",
    "app/components/membership/MembershipSurfaceGate.tsx",
    "app/(app)/vendor/membership/page.tsx",
    "app/(app)/firm/membership/page.tsx",
    "app/(app)/user/membership/page.tsx",
  ];
  const bannedMembershipPhrases = ["checkout scaffold", "truthful scope", "staged"];

  it("no membership surface carries the banned dev-speak / staged-claim vocabulary", () => {
    for (const relativePath of membershipGuardedFiles) {
      const text = readFileSync(path.join(ROOT, relativePath), "utf8").toLowerCase();
      for (const phrase of bannedMembershipPhrases) {
        expect(text, `${relativePath} should not contain "${phrase}"`).not.toContain(phrase);
      }
    }
  });
});
