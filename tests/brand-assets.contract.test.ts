import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { brandAssets } from "@/lib/brand/assets";

const ROOT = process.cwd();

function sha256(relativePath: string) {
  return createHash("sha256").update(readFileSync(path.join(ROOT, relativePath))).digest("hex");
}

describe("PAT brand asset contract", () => {
  it("keeps the exact public PAT.png proof file present and tied to the authoritative PAT asset", () => {
    expect(existsSync(path.join(ROOT, "public/PAT.png"))).toBe(true);
    expect(existsSync(path.join(ROOT, "public/brand/pat/pat-logo-accounting.png"))).toBe(true);
    expect(sha256("public/PAT.png")).toBe(sha256("public/brand/pat/pat-logo-accounting.png"));
  });

  it("points the active PAT registry entry at the exact public PAT.png proof file", () => {
    expect(brandAssets.pat.primaryMarkPath).toBe("/PAT.png");
    expect(brandAssets.pat.legacyPrimaryMarkPath).toBe("/brand/pat/pat-logo-accounting.png");
    expect(brandAssets.pat.status).toBe("official-public-pat-png");
  });

  it("keeps the shared header and hero brand lockups image-backed by the PAT mark", () => {
    const source = readFileSync(path.join(ROOT, "app/components/brand/BrandMarks.tsx"), "utf8");

    expect(source).toContain("src={brandAssets.pat.primaryMarkPath}");
    expect(source).toContain("export function PatLogoLockup");
    expect(source).toContain("<PatBrandMark mode={mode} />");
    expect(source).toContain("Performance Alignment Technology");
    expect(source).not.toContain("<C2BrandMark mode={mode} />");
  });

  it("keeps the app header on the official PAT lockup instead of the old C2/PAT combo", () => {
    const source = readFileSync(path.join(ROOT, "app/components/header/AppHeader.tsx"), "utf8");

    // wordmarkVariant is the PAT_HEADER_WORDMARK experiment seam; the default
    // ("pat") still renders the official PAT mark.
    expect(source).toContain('<BrandLockup mode="header" wordmarkVariant={wordmarkVariant} />');
    expect(source).not.toContain("C2BrandMark");
  });
});
