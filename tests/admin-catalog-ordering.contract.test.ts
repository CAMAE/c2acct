import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// DB-backed: like validate:launch, this needs DATABASE_URL. When vitest runs
// bare (no env sourced), read it from .env.local so the test is not skipped.
if (!process.env.DATABASE_URL) {
  try {
    const envFile = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const url = envFile.match(/^DATABASE_URL=(.*)$/m)?.[1];
    if (url) process.env.DATABASE_URL = url.replace(/^"|"$/g, "");
  } catch {
    // no .env.local — the loaders will fail loudly below
  }
}
const { loadAdminInsightRules, loadAdminModulesCatalog } = await import("@/lib/adminCatalogQueries");

/**
 * Finish box (2026-09-08), Mythos ruling "admin list ordering = fix by explicit
 * orderBy". /admin/modules and /admin/insights/rules rendered nested rules and
 * capability chips in an order that changed between server process starts
 * (seen in the Facelift 2 flag-off diff). Every list and nested relation now
 * carries an explicit order (stable key, then name) and two loads return the
 * same order. Runs against the local database like the other DB-backed tests.
 */
const source = readFileSync(path.join(process.cwd(), "lib/adminCatalogQueries.ts"), "utf8");

function sequence(value: unknown): string {
  return JSON.stringify(value, (key, v) => (key === "createdAt" || key === "updatedAt" ? undefined : v));
}

function isSortedBy<T>(rows: readonly T[], key: (row: T) => string) {
  for (let i = 1; i < rows.length; i += 1) {
    if (key(rows[i - 1]) > key(rows[i])) return false;
  }
  return true;
}

describe("admin catalog ordering: every list and nested relation is explicitly ordered", () => {
  it("source: each include carries an orderBy (stable key first, then name)", () => {
    const includes =
      source.match(
        /^\s*(ModuleCapability|SurveySection|SurveyQuestion|SurveyQuestionCapability|InsightCapabilityRule|InsightUnlockRule): \{/gm
      ) ?? [];
    expect(includes.length).toBe(6);
    expect(source).toContain('orderBy: [{ nodeId: "asc" }, { CapabilityNode: { title: "asc" } }]');
    expect(source).toContain('orderBy: [{ badgeId: "asc" }, { Badge: { name: "asc" } }]');
    expect(source).toContain('orderBy: [{ title: "asc" }, { id: "asc" }]');
    expect(source).toContain('orderBy: [{ name: "asc" }, { id: "asc" }]');
    expect(source).toMatch(/SurveySection: \{\s*orderBy: \{ order: "asc" \}/);
    expect(source).toMatch(/SurveyQuestion: \{\s*orderBy: \{ order: "asc" \}/);
  });

  it("the pages render through the loaders (no inline prisma queries left)", () => {
    for (const rel of ["app/(app)/admin/modules/page.tsx", "app/(app)/admin/insights/rules/page.tsx"]) {
      const page = readFileSync(path.join(process.cwd(), rel), "utf8");
      expect(page, rel).not.toContain("prisma.");
      expect(page, rel).toContain('from "@/lib/adminCatalogQueries"');
    }
  });

  it("/admin/modules: two loads return the same order and nested lists are sorted by their key", async () => {
    const first = await loadAdminModulesCatalog();
    const second = await loadAdminModulesCatalog();
    expect(sequence(second)).toBe(sequence(first));
    expect(isSortedBy(first.modules, (m) => m.key)).toBe(true);
    expect(isSortedBy(first.capabilityNodes, (n) => `${n.title} ${n.id}`)).toBe(true);
    for (const mod of first.modules) {
      expect(isSortedBy(mod.ModuleCapability, (c) => c.nodeId)).toBe(true);
      for (const section of mod.SurveySection) {
        for (const question of section.SurveyQuestion) {
          expect(isSortedBy(question.SurveyQuestionCapability, (c) => c.nodeId)).toBe(true);
        }
      }
    }
  });

  it("/admin/insights/rules: two loads return the same order and nested rules are sorted by their key", async () => {
    const first = await loadAdminInsightRules();
    const second = await loadAdminInsightRules();
    expect(sequence(second)).toBe(sequence(first));
    expect(isSortedBy(first.insights, (i) => i.key)).toBe(true);
    expect(isSortedBy(first.badges, (b) => `${b.name} ${b.id}`)).toBe(true);
    for (const insight of first.insights) {
      expect(isSortedBy(insight.InsightCapabilityRule, (r) => r.nodeId)).toBe(true);
      expect(isSortedBy(insight.InsightUnlockRule, (r) => r.badgeId)).toBe(true);
    }
  });
});
