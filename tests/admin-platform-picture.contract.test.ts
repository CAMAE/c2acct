import { beforeAll, describe, expect, it } from "vitest";
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { getPlatformPicture } from "@/lib/adminPlatformPicture";

describe("admin platform picture", () => {
  beforeAll(() => {
    applyRepoEnv();
  });

  it("aggregates platform counts from final-submission evidence", async () => {
    const picture = await getPlatformPicture();

    expect(picture.firmCount).toBeGreaterThanOrEqual(0);
    expect(picture.vendorCount).toBeGreaterThanOrEqual(0);
    expect(picture.firmModuleSubmissionCount).toBeGreaterThanOrEqual(0);
    expect(picture.productAssessmentCount).toBeGreaterThanOrEqual(0);
    expect(picture.hotDivergenceCount).toBeGreaterThanOrEqual(0);
    expect(picture.hotDivergenceCount).toBeLessThanOrEqual(picture.productAssessmentCount);

    if (picture.averageAlignmentIndex !== null) {
      expect(picture.averageAlignmentIndex).toBeGreaterThanOrEqual(0);
      expect(picture.averageAlignmentIndex).toBeLessThanOrEqual(100);
      expect(picture.scoredFirmCount).toBeGreaterThan(0);
      expect(picture.scoredFirmCount).toBeLessThanOrEqual(picture.firmCount);
    } else {
      expect(picture.scoredFirmCount).toBe(0);
    }
  });
});
