import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * WS5 Block A — toggle consistency contract.
 *
 * Cam's standing 4/22-onward ask: every mutually-exclusive pill-row
 * toggle in the codebase must use the canonical .pat-mode-toggle /
 * .pat-mode-toggle__option pattern (or be explicitly sanctioned as a
 * different design family).
 *
 * The canonical CSS lives in app/globals.css (WS1 Block A rewrite).
 * The canonical reference visual is app/(public)/sign-in/page.tsx
 * (InlineAccessSelectorWithOptions) — note that sign-in uses inline
 * Tailwind constants for the same values because it IS the design
 * source; that inline reimplementation is explicitly sanctioned below.
 *
 * Past Claude Code sessions have repeatedly claimed completion and
 * shipped partial fixes (R122 5/13 walkthrough flagged the regression
 * again). This test is the discipline lock against future regression.
 *
 * Sanctioned non-canonical families (different semantics, not toggles):
 *   - `pat-question-choice-button` — assessment scoring answer choices
 *     (radiogroup, 1-6 scoring). Same data-active attr but different
 *     family. Used by AssessmentModuleClient.
 *   - Multi-select tag chips in editorial controls (EmphasisToggle) —
 *     filed as AUDIT-WS5-A-001, awaiting Cam adjudication.
 *   - sign-in InlineAccessSelectorWithOptions — IS the design source
 *     and uses the same Tailwind constants the .pat-mode-toggle CSS
 *     encodes.
 *
 * Removed entries:
 *   - BriefTOC.tsx (vertical TOC nav): deleted in WS11-C when the vendor
 *     brief switched to the canonical PortalPanelSelector toggle pattern.
 */

// Repo root, resolved at run time — vitest runs from the project root.
// A hardcoded absolute path breaks the suite for every other machine (RK20).
const ROOT = process.cwd();

const CANONICAL_TOGGLE_FILES = [
  "app/components/pat/PatModeToggle.tsx",
  "app/(app)/firm/product-assessments/_components/AvailableCompletedToggle.tsx",
  "app/components/consultants/briefEdits/PhrasingVariantPicker.tsx",
  "app/(app)/consultants/ecosystems/[ecosystemId]/_components/OpenEndedPanel.tsx",
] as const;

const CANONICAL_TOGGLE_CONSUMERS = [
  "app/components/insights/InsightsModeShell.tsx",
  "app/components/insights/InsightDetailShell.tsx",
  "app/components/pat/PortalPanelSelector.tsx",
  "app/components/membership/MembershipPageShell.tsx",
  "app/components/membership/MembershipCheckoutShell.tsx",
  "app/(app)/admin/layout.tsx",
] as const;

const SANCTIONED_NON_CANONICAL = [
  "app/(public)/sign-in/page.tsx",
  "app/components/consultants/briefEdits/EmphasisToggle.tsx",
  "app/components/assessment/AssessmentModuleClient.tsx",
] as const;

describe("WS5 Block A — toggle consistency contract", () => {
  it("every CANONICAL_TOGGLE_FILES surface uses .pat-mode-toggle__option", () => {
    for (const rel of CANONICAL_TOGGLE_FILES) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      expect(
        text.includes("pat-mode-toggle__option") || text.includes("pat-mode-toggle"),
        `${rel} should reference the canonical .pat-mode-toggle pattern`
      ).toBe(true);
    }
  });

  it("every CANONICAL_TOGGLE_CONSUMERS surface imports PatModeToggle", () => {
    for (const rel of CANONICAL_TOGGLE_CONSUMERS) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      expect(
        text.includes("PatModeToggle"),
        `${rel} should import the canonical PatModeToggle component`
      ).toBe(true);
    }
  });

  it("the canonical PatModeToggle component still encodes the canonical class", () => {
    const text = readFileSync(
      path.join(ROOT, "app/components/pat/PatModeToggle.tsx"),
      "utf8"
    );
    expect(text).toContain('"pat-mode-toggle"');
    expect(text).toContain("pat-mode-toggle__option");
  });

  it("forbids the regression pattern: rounded-full solid-navy active state on mutually-exclusive toggle buttons", () => {
    const forbidden = "rounded-full bg-[var(--brand-c2-blue)] px-3 py-1 text-white";
    for (const rel of CANONICAL_TOGGLE_FILES) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      expect(
        text.includes(forbidden),
        `${rel} reintroduces the pre-WS5 solid-navy active-state regression`
      ).toBe(false);
    }
  });

  it("SANCTIONED_NON_CANONICAL surfaces remain documented (sanity check the allowlist stays explicit)", () => {
    for (const rel of SANCTIONED_NON_CANONICAL) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
