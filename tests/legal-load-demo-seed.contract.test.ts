import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getFirmFollowUpQuestions } from "@/lib/assessment/firmFollowUpOptions";
import { planEcosystems } from "@/lib/demo-seed/combinator";
import { planExpansionEcosystems } from "@/lib/demo-seed/expansion";
import { loadDemoSeedFlavor } from "@/lib/demo-seed/flavor";
import {
  LEGAL_ECOSYSTEM_PREFIX,
  LEGAL_ECOSYSTEM_SIZES,
  LEGAL_FIRM_PREFIX,
  LEGAL_VENDOR_PREFIX,
  planLegalEcosystems,
} from "@/lib/demo-seed/legal";
import { demoDate, demoFirmFollowUpPick } from "@/lib/demoPatEcosystemSeed";
import { LEGAL_PRODUCT_CATEGORIES } from "@/lib/productCategoryTaxonomy";

/**
 * legal-load (R64; audit section 12 items 11 and 13, delta 6, R-S). The demo words
 * moved from the combinator into data; the accounting planners must be byte-identical
 * to the output they produced before the move (hashes recorded on this branch before
 * the combinator was touched), and the legal planner must stay inside its namespace,
 * its vertical and its words.
 */

const ROOT = process.cwd();
const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("item 13 — the accounting demo planners are byte-identical with their words in data", () => {
  it("planEcosystems() and planExpansionEcosystems() hash exactly as before the move", () => {
    // Recorded with scripts/dev/plan-hash.ts at 23b53d76, before lib/demo-seed/combinator.ts read the flavor file.
    expect(sha(planEcosystems())).toBe("eb76321af0e3e7770455fd9832497000253e076d615bc2733366ec5900f29757");
    expect(sha(planExpansionEcosystems())).toBe("12b0a293b993b83c70463aec8edeccca49b8ad1cb4db2d0e7253282f5cc905da");
  });

  it("the accounting flavor file carries the literals the combinator used to hold", () => {
    const flavor = loadDemoSeedFlavor("accounting");
    expect(flavor.industry).toBe("Public accounting");
    expect(flavor.sizeBands).toEqual({ small: "<25 employees", mid: "25-100 employees", large: "100+ employees" });
    expect(flavor.firmIntegrationNeeds["struggling"]).toEqual(["QuickBooks Online", "spreadsheet import"]);
    expect(flavor.firmRiskFlags["struggling"]).toEqual(["staff churn slows process adoption", "key-person risk on tax season prep"]);
    expect(flavor.phraseBanks.adjacent_system).toContain("QuickBooks Online");
    expect(flavor.vendorTargetUseContext).toBe("Recurring monthly engagements + ad-hoc client work");
    const combinator = readFileSync(path.join(ROOT, "lib/demo-seed/combinator.ts"), "utf8");
    for (const literal of ["Public accounting", "QuickBooks Online", "<25 employees", "tax season", "Recurring monthly engagements"]) {
      expect(combinator, literal).not.toContain(literal);
    }
  });
});

describe("item 11 and delta 6 — the legal planner", () => {
  const plans = planLegalEcosystems();

  it("five ecosystems, 18 products, 40 firms, every id inside the demo-legal-* namespace", () => {
    expect(plans).toHaveLength(5);
    expect(plans.map((plan) => plan.firms.length)).toEqual(LEGAL_ECOSYSTEM_SIZES);
    expect(plans.flatMap((plan) => plan.vendor.demoVendorInput.products)).toHaveLength(18);
    for (const plan of plans) {
      expect(plan.ecosystemId.startsWith(LEGAL_ECOSYSTEM_PREFIX)).toBe(true);
      expect(plan.vendor.demoVendorInput.key.startsWith(LEGAL_VENDOR_PREFIX)).toBe(true);
      expect(plan.consultant.email).toMatch(/^review\.consultant\+legal-[a-z]+@pat\.local$/);
      expect(plan.consultant.name.startsWith("Guide ")).toBe(true);
      for (const firm of plan.firms) expect(firm.demoFirmInput.key.startsWith(LEGAL_FIRM_PREFIX)).toBe(true);
    }
    expect(new Set(plans.flatMap((plan) => plan.firms.map((firm) => firm.demoFirmInput.key))).size).toBe(40);
  });

  it("speaks the legal words: industry, band labels, needs, risks, quotes; no accounting noun, no vendor name", () => {
    const flavor = loadDemoSeedFlavor("legal");
    const text = JSON.stringify(plans);
    for (const banned of ["Public accounting", "QuickBooks", "tax season", "CPA", "bookkeep", "LedgerWorks", "audit prep", "tax workflow", "\"CAS\"", "NetSuite", "Xero", "DocuSign", "Bill.com", "Clio", "Westlaw", "Relativity"]) {
      expect(text, banned).not.toContain(banned);
    }
    for (const plan of plans) {
      expect(plan.vendor.demoVendorInput.products.every((product) => product.profile.targetUseContext === flavor.vendorTargetUseContext)).toBe(true);
      for (const firm of plan.firms) {
        expect(firm.demoFirmInput.industry).toBe("Law practice");
        expect(Object.values(flavor.sizeBands)).toContain(firm.demoFirmInput.sizeBand);
        expect(firm.demoFirmInput.integrationNeeds).toEqual(flavor.firmIntegrationNeeds[firm.bankEntry.archetype]);
        expect(firm.demoFirmInput.riskFlags).toEqual(flavor.firmRiskFlags[firm.bankEntry.archetype]);
      }
    }
  });

  it("every product lands in a legal canonical category, never an accounting one", () => {
    const categories = new Set(plans.flatMap((plan) => plan.vendor.demoVendorInput.products.map((product) => product.category)));
    for (const category of categories) expect(LEGAL_PRODUCT_CATEGORIES as readonly string[]).toContain(category);
    expect(categories.size).toBeGreaterThanOrEqual(5);
  });

  it("is deterministic and independent of the accounting planners", () => {
    expect(sha(planLegalEcosystems())).toBe(sha(plans));
    expect(sha(plans)).not.toBe(sha(planEcosystems()));
  });
});

describe("delta 6 and R-S — picks spread across options, dates never in the future", () => {
  it("demoFirmFollowUpPick spreads a legal question's picks across all eight options over forty firms", () => {
    const questions = getFirmFollowUpQuestions("legal");
    for (const question of questions) {
      const used = new Set<string>();
      for (let firmIndex = 0; firmIndex < 40; firmIndex += 1) {
        const pick = demoFirmFollowUpPick(question, firmIndex, firmIndex * 5 + question.index);
        expect(pick.optionKeys.length).toBeGreaterThan(0);
        for (const key of pick.optionKeys) {
          expect(question.options.some((option) => option.key === key), `${question.questionKey} ${key}`).toBe(true);
          used.add(key);
        }
        if (question.selectionMode === "SINGLE") expect(pick.optionKeys).toHaveLength(1);
        const other = question.options.find((option) => option.kind === "other")!;
        if (pick.optionKeys.includes(other.key)) expect(pick.otherText?.length ?? 0).toBeGreaterThan(0);
        else expect(pick.otherText).toBeNull();
      }
      expect(used.size, question.questionKey).toBe(8);
    }
  });

  it("demoDate never returns a future instant", () => {
    const now = Date.now();
    for (const offset of [0, 24, 96, 240, 1000, 100000]) expect(demoDate(offset).getTime()).toBeLessThan(now);
  });

  it("the seed script asserts the boundary, requires the flag, stamps the channel and keeps passwords off stdout (source pins)", () => {
    const script = readFileSync(path.join(ROOT, "scripts/demo/seed-legal-demo.ts"), "utf8");
    expect(script).toContain("assertLegalBoundary(plans)");
    expect(script).toContain("isVerticalPacksEnabled()");
    expect(script).toContain("classifyCompanyBoundaries(prisma)");
    expect(script).toMatch(/channel,?\s*\n/);
    expect(script).toContain("appendFileSync(ACCOUNTS_FILE");
    expect(script).not.toMatch(/console\.log\([^)]*DEMO_LEGAL_PASSWORD/);
    const seed = readFileSync(path.join(ROOT, "lib/demoPatEcosystemSeed.ts"), "utf8");
    expect(seed.match(/\.\.\.channelStamp\(input\.channel\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(seed).toContain("buildAssessmentItemResponseRows({");
    expect(seed).toContain("verticalId: input.channel.verticalId,");
  });
});
