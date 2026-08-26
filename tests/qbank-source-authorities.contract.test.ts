import { ModuleSourceLicense } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  UNCLASSIFIED_SOURCE_ORG,
  classifyQbankSources,
  type QbankSourceAuthority,
} from "@/lib/modules/qbankParser";
import { loadQbankSourceAuthorities } from "@/lib/modules/qbankSourceAuthorities";
import { SOURCE_AUTHORITY_LICENSES, loadVerticalPack } from "@/lib/verticals/loader";

/**
 * W4 contract (VERTICAL-READINESS-AUDIT-2026-08 §1.3, §3.1).
 *
 * The five authority branches that used to be hardcoded at qbankParser.ts:61
 * now live in the accounting pack. PRE_MOVE is the behaviour of those branches
 * transcribed verbatim from commit 55954436 — org, license tier, and the exact
 * match tokens — so this test compares the pack against the deleted code rather
 * than against itself.
 *
 * The other half of the proof is not a unit test: `scripts/modules/
 * qbank-preflight.ts` was run against both approved banks before and after the
 * move and its output diffed empty. See the box report.
 */
const PRE_MOVE = [
  { sourceOrg: "GAO", match: ["Green Book", "Yellow Book", "GAGAS", "GAO"], licenseType: ModuleSourceLicense.PUBLIC_DOMAIN },
  { sourceOrg: "IRS", match: ["Circular 230", "IRS"], licenseType: ModuleSourceLicense.PUBLIC_DOMAIN },
  { sourceOrg: "NIST", match: ["NIST"], licenseType: ModuleSourceLicense.PUBLIC_DOMAIN },
  { sourceOrg: "FTC", match: ["FTC", "Safeguards Rule", "16 CFR", "GLBA"], licenseType: ModuleSourceLicense.PUBLIC_DOMAIN },
  { sourceOrg: "COSO", match: ["COSO"], licenseType: ModuleSourceLicense.CITED },
] as const satisfies readonly QbankSourceAuthority[];

/** Citations exercising every branch, both tiers, and the multi-match path. */
const CITATIONS = [
  "Green Book 2025, Component: Control Environment",
  "Green Book 2025, P1; COSO cited",
  "Yellow Book / GAGAS 2024",
  "GAO-14-704G",
  "IRS Circular 230 §10.33",
  "NIST CSF 2.0",
  "Green Book 2025 P10; NIST CSF 2.0 PR.AA; Appendix II",
  "FTC Safeguards Rule, 16 CFR Part 314",
  "GLBA implementing regulation",
  "COSO Internal Control — Integrated Framework (2013)",
  "AICPA Code of Professional Conduct",
  "",
] as const;

describe("qbank source authorities — the accounting pack reproduces the deleted branches", () => {
  it("declares exactly the five authorities, in the order the branches ran", async () => {
    // Order is behaviour: a citation naming both GAO and COSO produces two
    // ModuleSource rows, and reordering the manifest reorders those rows.
    expect(await loadQbankSourceAuthorities()).toEqual([...PRE_MOVE]);
  });

  it("classifies every citation shape identically to the hardcoded classifier", async () => {
    const authorities = await loadQbankSourceAuthorities();
    for (const raw of CITATIONS) {
      expect(classifyQbankSources(raw, authorities)).toEqual(classifyQbankSources(raw, PRE_MOVE));
    }
  });

  it("matches case-insensitively, as the old `has()` helper did", async () => {
    const authorities = await loadQbankSourceAuthorities();
    expect(classifyQbankSources("green book 2025", authorities).map((s) => s.sourceOrg)).toEqual(["GAO"]);
    expect(classifyQbankSources("nist csf 2.0", authorities).map((s) => s.sourceOrg)).toEqual(["NIST"]);
  });

  it("still fails an unrecognized citation loudly rather than seeding it unsourced", async () => {
    // The sourced-content bar is not pack data — every vertical owes it.
    const authorities = await loadQbankSourceAuthorities();
    expect(classifyQbankSources("AICPA Code of Professional Conduct", authorities)).toEqual([
      {
        sourceOrg: UNCLASSIFIED_SOURCE_ORG,
        sourceDoc: "AICPA Code of Professional Conduct",
        licenseType: ModuleSourceLicense.CITED,
      },
    ]);
  });

  it("marks everything UNCLASSIFIED when handed an empty authority list", () => {
    // Which is why loadQbankSourceAuthorities() throws on a pack with no
    // questionBank block: an empty list would present as a bank full of
    // unsourced items — a content defect, not the missing manifest block it is.
    expect(classifyQbankSources("NIST CSF 2.0", [])[0]!.sourceOrg).toBe(UNCLASSIFIED_SOURCE_ORG);
  });
});

describe("qbank source authorities — manifest wiring", () => {
  it("keeps the manifest license vocabulary in step with Prisma's enum", () => {
    expect([...SOURCE_AUTHORITY_LICENSES].sort()).toEqual(Object.keys(ModuleSourceLicense).sort());
  });

  it("rejects a manifest license outside that vocabulary", async () => {
    const pack = await loadVerticalPack("accounting");
    for (const authority of pack.questionBank.sourceAuthorities) {
      expect(SOURCE_AUTHORITY_LICENSES).toContain(authority.license);
    }
  });

  it("resolves through the flag-off resolver, i.e. the accounting pack", async () => {
    const pack = await loadVerticalPack("accounting");
    const resolved = await loadQbankSourceAuthorities();
    expect(resolved.map((a) => a.sourceOrg)).toEqual(
      pack.questionBank.sourceAuthorities.map((a) => a.org)
    );
  });
});
