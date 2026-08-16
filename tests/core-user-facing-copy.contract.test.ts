import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = "/Users/camerongarrett/work/c2acct-live";

const filesToCheck = [
  "app/(app)/vendor/product-assessment/page.tsx",
  "app/(app)/vendor/product-assessment/[productId]/page.tsx",
  "app/(app)/firm/product-assessments/page.tsx",
  "app/(app)/firm/product-assessments/[productId]/page.tsx",
  "app/(app)/user/page.tsx",
  "app/(app)/user/alignment-assessment/page.tsx",
  "app/(app)/user/product-assessment/page.tsx",
  "app/(app)/vendor/page.tsx",
  "app/(app)/firm/page.tsx",
  "app/(app)/firm/alignment-assessment/page.tsx",
  "app/(app)/user/profile/page.tsx",
  "app/components/individual/IndividualPortalContent.tsx",
  "app/components/vendor/VendorProductAssessmentClient.tsx",
  "app/components/firm/FirmProductAssessmentClient.tsx",
  "lib/locale.ts",
  "lib/vendorPat.ts",
] as const;

const bannedSnippets = [
  "Ready for assessment",
  "Ready for firm review",
  "Source-live",
  "what is live versus",
  "Enablement checks are live",
  "Sign in to edit the live individual profile settings.",
  "Person PAT subject",
  "The route architecture is live",
  "live person-level PAT alignment",
  "The live person-native path today",
] as const;

describe("core user-facing copy cleanup", () => {
  it("keeps low-value validation-harness wording out of core PAT routes", () => {
    for (const relativePath of filesToCheck) {
      const absolutePath = path.join(ROOT, relativePath);
      const text = readFileSync(absolutePath, "utf8");

      for (const snippet of bannedSnippets) {
        expect(text, `${relativePath} should not contain "${snippet}"`).not.toContain(snippet);
      }
    }
  });
});
