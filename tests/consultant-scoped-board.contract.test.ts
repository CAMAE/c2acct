import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Block 18 F14 — consultant scoped Alignment Board. The route MUST be a proper
 * scoped-tenancy check under /consultants (never a route exemption on the /firm
 * audience wall), and the board MUST render read-only (no swap staging).
 */

const ROOT = path.resolve(__dirname, "..");
const routeSrc = readFileSync(
  path.join(ROOT, "app/consultants/ecosystems/[ecosystemId]/firm/[firmCompanyId]/alignment-board/page.tsx"),
  "utf8"
);

describe("F14 route — scoped tenancy, not a route exemption", () => {
  it("lives under /consultants (reachable by consultants), not a /firm exemption", () => {
    // The file path itself is the proof it's a /consultants route; assert it does
    // NOT reach for the firm audience-wall bypass (?firm= exemption).
    expect(routeSrc).not.toMatch(/searchParams.*firm|params\?\.firm|firmParam/);
    expect(routeSrc).toContain("requireConsultantSession");
  });

  it("enforces ecosystem-scoped firm membership, 404 on out-of-scope", () => {
    // Firm must be in THIS ecosystem's firm set for THIS consultant, else notFound.
    expect(routeSrc).toMatch(/access\.ecosystems\.find\(\(eco\) => eco\.ecosystemId === ecosystemId\)/);
    expect(routeSrc).toMatch(/firmCompanies\.find\(\(f\) => f\.id === firmCompanyId\)/);
    expect(routeSrc).toContain("notFound()");
  });

  it("renders the board read-only (swap staging disabled)", () => {
    expect(routeSrc).toMatch(/<AlignmentBoardClient[^>]*\breadOnly\b/);
  });

  it("stays honest-empty when the board flag is off (never 'coming soon')", () => {
    expect(routeSrc).toContain("isAlignmentBoardEnabled");
    expect(routeSrc).not.toMatch(/coming soon/i);
  });
});
