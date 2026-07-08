import { describe, expect, it } from "vitest";
import { ModuleDifficulty, ModuleSourceLicense } from "@prisma/client";
import {
  QBANK_ANCHOR_CODES,
  QBANK_TEMPLATE_KEY,
  classifyQbankSources,
  parseQbank,
} from "@/lib/modules/qbankParser";

/**
 * Parser contract (Sprint 4 M2). Uses an inline fixture in the exact bank
 * format so the test never depends on the gitignored source doc. Exercises the
 * hard cases: an em dash *inside* an option (must not be mistaken for the
 * answer marker), anchor flagging, and multi-tier source classification.
 */

const FIXTURE = `
## SECTION A — Control Environment & Firm Governance (27: 8E/14M/5H)

**A1 (E)** The foundation of any internal control system is: a) monitoring software b) the control environment — the tone and discipline leadership sets c) segregation of duties d) an annual audit — **b.** All other components rest on leadership's demonstrated commitment to integrity. *[Green Book 2025, Component: Control Environment]*

**A9 (M)** A managing partner overrides a documented billing control "just this once". The primary damage is: a) the dollar amount b) the demonstrated message that controls yield to convenience, undermining P1 c) client perception d) none, if disclosed — **b.** Management override signals that standards are negotiable. *[Green Book 2025, P1; COSO cited]*

## SECTION B — Risk Assessment & Vendor Risk (23: 7E/12M/4H)

**B4 (E)** NIST CSF 2.0 added a sixth function to the original five. It is: a) Govern b) Encrypt c) Insure d) Archive — **a.** GOVERN covers risk strategy, roles, policy, and supply-chain oversight. *[NIST CSF 2.0]*

## SECTION C — Control Activities, Access & IT (22: 7E/11M/4H)

**C19 (H)** Design the minimal control stack for firm-initiated client payments, combining P10 + PR.AA: a) one partner does it all b) dual authorization with distinct credentials, out-of-band verification, immutable logs, same-day reconciliation c) email approval d) vendor handles it — **b.** Payment redirection is the top small-firm loss vector. *[Green Book 2025 P10; NIST CSF 2.0 PR.AA; Appendix II]*

## SECTION D — Information, Communication & Monitoring (18: 5E/9M/4H)

**D6 (M)** A dashboard shows "firm alignment 73" with no source. Its P13 defect: a) ugly font b) the number lacks source, currency, and completeness c) too precise d) too round — **b.** Every metric needs its unit and provenance. *[Green Book 2025, P13]*
`;

describe("qbank parser", () => {
  const items = parseQbank(FIXTURE);

  it("parses every item with a stable namespaced key", () => {
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.code)).toEqual(["A1", "A9", "B4", "C19", "D6"]);
    expect(items[0]!.key).toBe(`${QBANK_TEMPLATE_KEY}-a1`);
  });

  it("assigns category from the section header", () => {
    expect(items[0]!.category).toBe("Control Environment & Firm Governance");
    expect(items[2]!.category).toBe("Risk Assessment & Vendor Risk");
    expect(items[3]!.category).toBe("Control Activities, Access & IT");
    expect(items[4]!.category).toBe("Information, Communication & Monitoring");
  });

  it("maps difficulty letters and reads the correct answer", () => {
    expect(items[0]!.difficulty).toBe(ModuleDifficulty.EASY);
    expect(items[1]!.difficulty).toBe(ModuleDifficulty.MODERATE);
    expect(items[3]!.difficulty).toBe(ModuleDifficulty.HARD);
    expect(items[0]!.correctKey).toBe("b");
    expect(items[2]!.correctKey).toBe("a");
  });

  it("parses four choices even when an option contains an em dash", () => {
    const a1 = items[0]!;
    expect(a1.choices).toHaveLength(4);
    expect(a1.choices.map((c) => c.key)).toEqual(["a", "b", "c", "d"]);
    expect(a1.choices[1]!.label).toBe(
      "the control environment — the tone and discipline leadership sets"
    );
    // The em dash inside choice b must not have been mistaken for the answer marker.
    expect(a1.feedback.startsWith("All other components")).toBe(true);
  });

  it("flags exactly the documented anchor items", () => {
    const anchors = items.filter((i) => i.isAnchor).map((i) => i.code);
    expect(anchors).toEqual(["A9", "C19", "D6"]);
    for (const code of anchors) expect(QBANK_ANCHOR_CODES.has(code)).toBe(true);
  });

  it("attaches at least one source to every item", () => {
    for (const item of items) {
      expect(item.sources.length).toBeGreaterThanOrEqual(1);
      expect(item.sources.some((s) => s.sourceOrg === "UNCLASSIFIED")).toBe(false);
    }
  });

  it("classifies government sources public-domain and COSO as cited", () => {
    const a9 = items[1]!;
    const orgs = a9.sources.map((s) => s.sourceOrg);
    expect(orgs).toContain("GAO");
    expect(orgs).toContain("COSO");
    const gao = a9.sources.find((s) => s.sourceOrg === "GAO")!;
    const coso = a9.sources.find((s) => s.sourceOrg === "COSO")!;
    expect(gao.licenseType).toBe(ModuleSourceLicense.PUBLIC_DOMAIN);
    expect(coso.licenseType).toBe(ModuleSourceLicense.CITED);

    // NIST alone is public domain.
    expect(classifyQbankSources("NIST CSF 2.0")).toEqual([
      { sourceOrg: "NIST", sourceDoc: "NIST CSF 2.0", licenseType: ModuleSourceLicense.PUBLIC_DOMAIN },
    ]);
  });
});
