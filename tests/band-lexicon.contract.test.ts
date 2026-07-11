import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SCORE_BANDS,
  SCORE_BAND_ORDER,
  scoreBandFor,
  scoreChipLabel,
  EVIDENCE_CONFIDENCE_LABEL,
  evidenceConfidenceLabel,
  BANNED_BAND_LABELS,
  ALLOWED_BAND_LABELS,
} from "@/lib/bandLexicon";
import { CONFIDENCE_BAND_LABEL } from "@/lib/confidenceBands";
import { getScoreBand } from "@/lib/scoreBands";

/**
 * B8-2 contract: ONE band lexicon (Cam's 2026-07-11 ruling). Score bands are
 * the five Early/Developing/Building/Established/Leading; evidence confidence is
 * the three Grounded / Early signal / No signal. The killed strays must not
 * surface as customer-facing band labels anywhere.
 */

describe("band lexicon — score bands", () => {
  it("defines exactly the five ruled score bands, low→high", () => {
    expect(SCORE_BAND_ORDER.map((k) => SCORE_BANDS[k].label)).toEqual([
      "Early",
      "Developing",
      "Building",
      "Established",
      "Leading",
    ]);
  });

  it("maps scores to the ruled ranges", () => {
    expect(scoreBandFor(0).label).toBe("Early");
    expect(scoreBandFor(39).label).toBe("Early");
    expect(scoreBandFor(40).label).toBe("Developing");
    expect(scoreBandFor(59).label).toBe("Developing");
    expect(scoreBandFor(60).label).toBe("Building");
    expect(scoreBandFor(74).label).toBe("Building");
    expect(scoreBandFor(75).label).toBe("Established");
    expect(scoreBandFor(89).label).toBe("Established");
    expect(scoreBandFor(90).label).toBe("Leading");
    expect(scoreBandFor(100).label).toBe("Leading");
  });

  it("renders the chip as '68 · Building'", () => {
    expect(scoreChipLabel(68)).toBe("68 · Building");
    expect(scoreChipLabel(91.4)).toBe("91 · Leading");
  });

  it("keeps lib/scoreBands.ts delegating to the lexicon", () => {
    expect(getScoreBand(68).label).toBe("Building");
    expect(getScoreBand(95).label).toBe("Leading");
  });
});

describe("band lexicon — evidence confidence", () => {
  it("defines exactly the three ruled confidence states", () => {
    expect(Object.values(EVIDENCE_CONFIDENCE_LABEL).sort()).toEqual(
      ["Early signal", "Grounded", "No signal"].sort()
    );
  });

  it("collapses the four internal keys to three public labels", () => {
    expect(evidenceConfidenceLabel("grounded")).toBe("Grounded");
    expect(evidenceConfidenceLabel("emerging")).toBe("Early signal");
    expect(evidenceConfidenceLabel("sample_thin")).toBe("Early signal");
    expect(evidenceConfidenceLabel("no_signal")).toBe("No signal");
  });

  it("keeps CONFIDENCE_BAND_LABEL sourced from the lexicon (no strays)", () => {
    expect(Object.values(CONFIDENCE_BAND_LABEL)).toEqual([
      "No signal",
      "Early signal",
      "Early signal",
      "Grounded",
    ]);
  });
});

describe("band lexicon — banned strays never surface", () => {
  it("no lexicon label is a banned stray", () => {
    for (const label of ALLOWED_BAND_LABELS) {
      expect(BANNED_BAND_LABELS).not.toContain(label);
    }
  });

  // Files that produce customer-facing band/confidence labels. The banned
  // strays (as quoted display labels) must not appear in any of them.
  const LABEL_SOURCE_FILES = [
    "lib/firmInsightEngine.ts",
    "lib/vendorProductInsightEngine.ts",
    "lib/vendorAlignmentInsightEngine.ts",
    "lib/adminBriefingEngine.ts",
    "lib/scoreBands.ts",
    "lib/confidenceBands.ts",
    "app/components/firm/AlignmentBoardClient.tsx",
    "app/components/vendor/VendorSalesCardClient.tsx",
    "app/consultants/_components/EcosystemListCard.tsx",
    "app/consultants/ecosystems/[ecosystemId]/_components/EcosystemHeader.tsx",
    "app/consultants/ecosystems/[ecosystemId]/_components/FirmGrid.tsx",
    "app/consultants/ecosystems/[ecosystemId]/firm/[firmCompanyId]/_components/FirmAlignmentHeader.tsx",
    "lib/briefs/executive-summary-templates.ts",
  ];

  // A quoted display label like `"Limited signal"` or `: "Optimizing"`.
  const bannedAsLabel = (src: string, term: string) =>
    src.includes(`"${term}"`) || src.includes(`"${term} `) || src.includes(` ${term}"`);

  for (const rel of LABEL_SOURCE_FILES) {
    it(`${rel} carries no banned band label`, () => {
      const src = readFileSync(path.join(process.cwd(), rel), "utf8");
      const offenders = BANNED_BAND_LABELS.filter((term) => bannedAsLabel(src, term));
      expect(offenders).toEqual([]);
    });
  }
});
