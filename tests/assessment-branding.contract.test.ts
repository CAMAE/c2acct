import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = "/Users/camerongarrett/work/c2acct-live";

const brandedAssessmentHeroRoutes = [
  "app/user/alignment-assessment/page.tsx",
  "app/user/product-assessment/page.tsx",
  "app/vendor/product-assessment/page.tsx",
  "app/firm/alignment-assessment/page.tsx",
  "app/firm/product-assessments/page.tsx",
  "app/firm/product-assessments/[productId]/page.tsx",
] as const;

describe("assessment hero branding contracts", () => {
  it("keeps the intended assessment hero routes wired to shared PAT display copy", () => {
    for (const relativePath of brandedAssessmentHeroRoutes) {
      const text = readFileSync(path.join(ROOT, relativePath), "utf8");

      expect(text, `${relativePath} should import PAT_PRODUCT_NAME`).toContain(
        'PAT_PRODUCT_NAME'
      );
      expect(text, `${relativePath} should render the PAT hero label`).toContain(
        '<div className="pat-label">{PAT_PRODUCT_NAME}</div>'
      );
    }
  });

  it("keeps the vendor product detail route passing shared PAT branding into its hero source", () => {
    const routeText = readFileSync(
      path.join(ROOT, "app/vendor/product-assessment/[productId]/page.tsx"),
      "utf8"
    );
    const clientText = readFileSync(
      path.join(ROOT, "app/components/vendor/VendorProductAssessmentClient.tsx"),
      "utf8"
    );

    expect(routeText).toContain('import { PAT_PRODUCT_NAME } from "@/lib/displayCopy";');
    expect(routeText).toContain("productBrand={PAT_PRODUCT_NAME}");
    expect(clientText).toContain("productBrand: string;");
    expect(clientText).toContain('<div className="pat-label">{productBrand}</div>');
    expect(clientText).not.toContain('<div className="pat-label">{PAT_PRODUCT_NAME}</div>');
  });

  it("keeps the remaining assessment hero sources free of raw non-shared top-card brand labels", () => {
    const userAlignment = readFileSync(
      path.join(ROOT, "app/user/alignment-assessment/page.tsx"),
      "utf8"
    );
    const userProduct = readFileSync(
      path.join(ROOT, "app/user/product-assessment/page.tsx"),
      "utf8"
    );

    expect(userAlignment).not.toContain('<div className="pat-label">Individual alignment assessment</div>');
    expect(userProduct).not.toContain('<div className="pat-label">Individual product assessment</div>');
  });
});
