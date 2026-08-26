import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { openEndedResponsesForEcosystem } from "@/lib/ecosystem";
import type { AdminCompanyBriefing } from "@/lib/adminBriefingEngine";

/**
 * B8-6: the ecosystem "Recent firm responses" panel (OpenEndedPanel) is
 * consultant-only, and its data must never span another vendor's products. The
 * COI wall holds at the COMPONENT/data level, not just the page: firm briefings
 * are firm-scoped (they carry the firm's reviews of every vendor), so the
 * ecosystem detail filters responses to the ecosystem vendor's own catalog.
 */

// Repo root, resolved at run time — vitest runs from the project root.
// A hardcoded absolute path breaks the suite for every other machine (RK20).
const ROOT = process.cwd();

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("consultant open-ended scoping — render context", () => {
  it("OpenEndedPanel is only ever imported under app/consultants (never vendor/firm)", () => {
    const importers = walk(path.join(ROOT, "app")).filter((file) =>
      readFileSync(file, "utf8").includes("OpenEndedPanel")
    );
    expect(importers.length).toBeGreaterThan(0);
    for (const file of importers) {
      const rel = path.relative(ROOT, file);
      expect(rel.startsWith("app/(app)/consultants/"), `${rel} must be under app/(app)/consultants/`).toBe(true);
      expect(rel.startsWith("app/(app)/vendor/")).toBe(false);
      expect(rel.startsWith("app/(app)/firm/")).toBe(false);
    }
  });
});

describe("consultant open-ended scoping — COI product wall", () => {
  const briefing = (companyId: string, entries: Array<{ productId: string; productName: string }>) =>
    ({
      company: { id: companyId, name: `Firm ${companyId}` },
      productLayer: {
        openEndedResponses: entries.map((entry, index) => ({
          productId: entry.productId,
          productName: entry.productName,
          questionId: `q${index}`,
          questionPrompt: "Prompt",
          sectionTitle: "Section",
          responseText: `Response about ${entry.productName}`,
          submittedAt: new Date(1_700_000_000_000 + index),
        })),
      },
    }) as unknown as AdminCompanyBriefing;

  it("drops responses about products outside the allowed (ecosystem vendor) catalog", () => {
    const briefings = [
      briefing("firm-a", [
        { productId: "own-1", productName: "Our Product" },
        { productId: "rival-9", productName: "Competitor Product" },
      ]),
    ];
    const allowed = new Set(["own-1"]);
    const { responses } = openEndedResponsesForEcosystem(briefings, undefined, allowed);

    expect(responses.map((r) => r.productId)).toEqual(["own-1"]);
    expect(responses.some((r) => r.productId === "rival-9")).toBe(false);
    expect(responses.some((r) => r.productName === "Competitor Product")).toBe(false);
  });

  it("without an allow-set behaves as before (back-compat for non-COI callers)", () => {
    const briefings = [
      briefing("firm-a", [
        { productId: "own-1", productName: "Our Product" },
        { productId: "rival-9", productName: "Competitor Product" },
      ]),
    ];
    const { responses } = openEndedResponsesForEcosystem(briefings);
    expect(responses).toHaveLength(2);
  });
});
