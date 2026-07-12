import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OUTPUT_DISCLAIMER_TEXT } from "@/app/components/trust/OutputDisclaimer";
import { getTrustSurface } from "@/lib/trustContent";

/**
 * Liability surface (Governance Phase 3, A7/B8). Locks: the in-product disclaimer
 * copy + methodology link, that it is mounted near scores across all portals, the
 * trust subprocessor disclosure, and the watermarked legal drafts.
 */

const repoRoot = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

describe("in-product output disclaimer", () => {
  it("carries the exact directional/not-advice copy and links to methodology", () => {
    expect(OUTPUT_DISCLAIMER_TEXT).toBe("Directional, informational — not professional advice.");
    const component = read("app/components/trust/OutputDisclaimer.tsx");
    expect(component).toContain('href="/methodology"');
    expect(component).toContain("methodology");
  });

  it("is mounted near scores/benchmarks/recommendations in every portal", () => {
    const mountPoints = [
      "app/components/insights/InsightsModeShell.tsx", // firm + vendor insight overviews
      "app/components/insights/InsightDetailShell.tsx", // insight detail pages
      "app/components/firm/AlignmentBoardClient.tsx", // firm sandbox projection
      "app/components/vendor/VendorBattleCardClient.tsx", // vendor benchmark
      "app/consultants/ecosystems/[ecosystemId]/vendor-brief/page.tsx", // consultant benchmark
      "app/consultants/ecosystems/[ecosystemId]/firm/[firmCompanyId]/page.tsx", // consultant firm detail
    ];
    for (const file of mountPoints) {
      expect(read(file), `${file} mounts OutputDisclaimer`).toContain("OutputDisclaimer");
    }
  });
});

describe("trust security surface — subprocessors + practices", () => {
  it("discloses all four subprocessors and links to the methodology", () => {
    const text = getTrustSurface("security")
      .sections.flatMap((s) => [s.title, s.body, ...(s.bullets ?? [])])
      .join(" ");
    for (const provider of ["Vercel", "Neon", "Stripe", "Anthropic"]) {
      expect(text).toContain(provider);
    }
    expect(text).toContain("/methodology");
    // No unsupported certification claim slipped into the subprocessor copy.
    expect(text).not.toMatch(/SOC\s*2\s+(certified|compliant)/i);
  });
});

describe("legal drafts — watermarked for attorney review", () => {
  it("DPA and Security Addendum exist and are clearly marked draft/non-binding", () => {
    for (const file of ["docs/legal/DPA-DRAFT.md", "docs/legal/SECURITY-ADDENDUM-DRAFT.md"]) {
      const content = read(file);
      expect(content).toContain("DRAFT — FOR ATTORNEY REVIEW");
      expect(content).toMatch(/NOT LEGAL ADVICE/i);
      expect(content).toMatch(/NOT A BINDING AGREEMENT/i);
    }
  });
});
