import { describe, expect, it } from "vitest";
import {
  formatFeatureCountLabel,
  PAT_PRODUCT_NAME,
  replaceUtilityTermsForDisplay,
  splitAudienceTitleSegments,
} from "@/lib/displayCopy";

describe("display copy helpers", () => {
  it("converts utility language to feature language for display-only copy", () => {
    expect(replaceUtilityTermsForDisplay("Utility scoring")).toBe("Feature scoring");
    expect(replaceUtilityTermsForDisplay("utilities selected")).toBe("features selected");
    expect(replaceUtilityTermsForDisplay("Utilities declared")).toBe("Features declared");
  });

  it("formats singular and plural feature counts", () => {
    expect(formatFeatureCountLabel(1)).toBe("1 feature");
    expect(formatFeatureCountLabel(4)).toBe("4 features");
  });

  it("exports the shared PAT product brand string for assessment heroes", () => {
    expect(PAT_PRODUCT_NAME).toBe("PAT | Performance Alignment Technology");
  });

  it("splits audience titles so the audience term can be emphasized", () => {
    expect(splitAudienceTitleSegments("Choose the Vendor PAT operating tier", ["Vendor"])).toEqual([
      { text: "Choose the ", emphasized: false },
      { text: "Vendor", emphasized: true },
      { text: " PAT operating tier", emphasized: false },
    ]);
  });
});
