import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Repo root, resolved at run time — vitest runs from the project root.
// A hardcoded absolute path breaks the suite for every other machine (RK20).
const ROOT = process.cwd();

const brandedAssessmentHeroRoutes = [
  "app/(app)/user/alignment-assessment/page.tsx",
  "app/(app)/user/product-assessment/page.tsx",
  "app/(app)/vendor/product-assessment/page.tsx",
  "app/(app)/firm/alignment-assessment/page.tsx",
  "app/(app)/firm/product-assessments/page.tsx",
  "app/(app)/firm/product-assessments/[productId]/page.tsx",
] as const;

describe("assessment hero branding contracts", () => {
  it("keeps the intended assessment hero routes wired to the official PAT logo lockup", () => {
    for (const relativePath of brandedAssessmentHeroRoutes) {
      const text = readFileSync(path.join(ROOT, relativePath), "utf8");

      expect(text, `${relativePath} should import the PAT logo lockup`).toContain(
        'PatLogoLockup'
      );
      expect(text, `${relativePath} should render the image-backed PAT lockup`).toContain(
        '<PatLogoLockup mode="hero" tone="light" />'
      );
      expect(text, `${relativePath} should not render text-only PAT product labels`).not.toContain(
        '<div className="pat-label">{PAT_PRODUCT_NAME}</div>'
      );
    }
  });

  it("keeps the vendor product detail assessment hero image-backed", () => {
    const routeText = readFileSync(
      path.join(ROOT, "app/(app)/vendor/product-assessment/[productId]/page.tsx"),
      "utf8"
    );
    const clientText = readFileSync(
      path.join(ROOT, "app/components/vendor/VendorProductAssessmentClient.tsx"),
      "utf8"
    );

    expect(routeText).not.toContain('import { PAT_PRODUCT_NAME } from "@/lib/displayCopy";');
    expect(routeText).not.toContain("productBrand={PAT_PRODUCT_NAME}");
    expect(clientText).not.toContain("productBrand: string;");
    expect(clientText).toContain('<PatLogoLockup mode="hero" tone="light" />');
    expect(clientText).not.toContain('<div className="pat-label">{PAT_PRODUCT_NAME}</div>');
  });

  it("keeps the remaining assessment hero sources free of raw non-shared top-card brand labels", () => {
    const userAlignment = readFileSync(
      path.join(ROOT, "app/(app)/user/alignment-assessment/page.tsx"),
      "utf8"
    );
    const userProduct = readFileSync(
      path.join(ROOT, "app/(app)/user/product-assessment/page.tsx"),
      "utf8"
    );

    expect(userAlignment).not.toContain('<div className="pat-label">Individual alignment assessment</div>');
    expect(userProduct).not.toContain('<div className="pat-label">Individual product assessment</div>');
  });
});
