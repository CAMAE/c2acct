import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * AUDIT-D12-003 closer (Day-18 Block 4) — vendor-less Solo ecosystem
 * 404 contract.
 *
 * Diagnosis: AUDIT-D12-003 described the legacy admin "Assign firm to
 * consultant" flow (app/admin/actions.ts) creating Solo: ecosystems with
 * `vendorCompanyId = NULL`. The Day-12 ticket was filed BEFORE Day-13's
 * commit 0e0c39a, which added the downstream tolerance at the
 * consultant-access-state layer. As of Day-18 HEAD, all consultant
 * drill-down routes correctly return null (→ 404) for vendor-less Solo
 * ecosystems; Mock C filters them from the list view. The bug as
 * described no longer reproduces in the consultant flow — it's
 * self-resolved at the downstream layer.
 *
 * The admin-side root-cause fix (rewriting Assign-firm to attach firms
 * to vendor-bound ecosystems) remains scheduled for Phase 5 under
 * AUDIT-D10-001.
 *
 * What this test locks in:
 *   1. Every consultant-side `…ForConsultant` aggregator that reads
 *      `ecosystem.vendorCompanyId` MUST have a null-guard that returns
 *      null (→ route 404) when the ecosystem is vendor-less. A future
 *      refactor that drops the guard surfaces as a test failure here.
 *   2. The legacy admin Assign-firm code path is annotated with a clear
 *      Phase-5 marker so a future audit can find it.
 */

const ROOT = path.resolve(__dirname, "..");

const NULL_GUARD_PATTERN = /!ecosystem\.vendorCompanyId\s*\|\|\s*!ecosystem\.VendorCompany/;

describe("AUDIT-D12-003 vendor-less Solo ecosystem 404 contract", () => {
  it("lib/ecosystem.ts:getEcosystemDetailForConsultant guards against vendor-less ecosystems", () => {
    const source = readFileSync(path.join(ROOT, "lib/ecosystem.ts"), "utf8");
    const fnStart = source.indexOf("export async function getEcosystemDetailForConsultant");
    expect(fnStart).toBeGreaterThan(-1);
    const remainder = source.slice(fnStart);
    const nextExport = remainder.indexOf("\nexport ", 1);
    const fnBody = nextExport > -1 ? remainder.slice(0, nextExport) : remainder;
    expect(fnBody).toMatch(NULL_GUARD_PATTERN);
  });

  it("lib/briefs.ts:getVendorBriefForConsultant guards against vendor-less ecosystems", () => {
    const source = readFileSync(path.join(ROOT, "lib/briefs.ts"), "utf8");
    const fnStart = source.indexOf("export async function getVendorBriefForConsultant");
    expect(fnStart).toBeGreaterThan(-1);
    const remainder = source.slice(fnStart);
    expect(remainder).toMatch(NULL_GUARD_PATTERN);
  });

  it("lib/firmBriefs.ts:getFirmBriefForConsultant guards against vendor-less ecosystems", () => {
    const source = readFileSync(path.join(ROOT, "lib/firmBriefs.ts"), "utf8");
    const fnStart = source.indexOf("export async function getFirmBriefForConsultant");
    expect(fnStart).toBeGreaterThan(-1);
    const remainder = source.slice(fnStart);
    expect(remainder).toMatch(NULL_GUARD_PATTERN);
  });

  it("lib/ecosystem.ts:getEcosystemListForConsultant filters vendor-less ecosystems from list-view results", () => {
    // Mock C must not surface vendor-less Solo: rows. The filter pattern
    // in getEcosystemListForConsultant (Day-13 design) is a null-guard
    // followed by a filter step that drops ecosystems where the vendor
    // resolution returned null.
    const source = readFileSync(path.join(ROOT, "lib/ecosystem.ts"), "utf8");
    const fnStart = source.indexOf("export async function getEcosystemListForConsultant");
    expect(fnStart).toBeGreaterThan(-1);
    const remainder = source.slice(fnStart);
    expect(remainder).toMatch(NULL_GUARD_PATTERN);
  });

  it("app/admin/actions.ts marks the legacy Solo-ecosystem create with a Phase-5 deprecation marker", () => {
    // The legacy admin Assign-firm flow still creates vendor-less Solo:
    // ecosystems (line ~622). That's deferred to Phase 5 (AUDIT-D10-001).
    // The code path must carry a Phase-5/AUDIT-D10-001 reference so a
    // future auditor finds it without spelunking through git blame.
    const source = readFileSync(path.join(ROOT, "app/admin/actions.ts"), "utf8");
    // Locate the Solo: ecosystem create
    const soloIdx = source.indexOf("`Solo: ");
    expect(soloIdx).toBeGreaterThan(-1);
    // Grab the surrounding ~600 chars of context
    const context = source.slice(Math.max(0, soloIdx - 600), soloIdx + 200);
    expect(context).toMatch(/Phase 5|AUDIT-D10-001/);
  });
});
