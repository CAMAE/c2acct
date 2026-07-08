import { describe, expect, it } from "vitest";
import { ModuleReviewStatus } from "@prisma/client";
import {
  MODULE_SERVE_REVIEW_STATUS,
  canServeTemplate,
  evaluateItemServe,
  filterServableItems,
  itemHasSource,
} from "@/lib/modules/serving";

/**
 * Contract test (Sprint 4 M1): the two hard rules of the adaptive-module
 * content bar are enforced in one place and cannot be bypassed:
 *   1. reviewStatus != APPROVED CANNOT serve to customers.
 *   2. An item WITHOUT a source row fails (unsourced content never serves).
 *
 * If a future refactor loosens either rule, this test goes red.
 */

const ALL_STATUSES = Object.values(ModuleReviewStatus);

describe("adaptive module serving guard", () => {
  it("only APPROVED is the serve status, and it is a real enum member", () => {
    expect(MODULE_SERVE_REVIEW_STATUS).toBe(ModuleReviewStatus.APPROVED);
    expect(ALL_STATUSES).toContain(MODULE_SERVE_REVIEW_STATUS);
  });

  it("canServeTemplate is true ONLY for APPROVED across every review status", () => {
    for (const reviewStatus of ALL_STATUSES) {
      const expected = reviewStatus === ModuleReviewStatus.APPROVED;
      expect(canServeTemplate({ reviewStatus })).toBe(expected);
    }
    // Guard against an enum that silently gains a second passing status.
    const passing = ALL_STATUSES.filter((reviewStatus) => canServeTemplate({ reviewStatus }));
    expect(passing).toEqual([ModuleReviewStatus.APPROVED]);
  });

  it("itemHasSource requires at least one source row", () => {
    expect(itemHasSource({ sources: [] })).toBe(false);
    expect(itemHasSource({ sources: [{ sourceOrg: "GAO" }] })).toBe(true);
    expect(itemHasSource({ sources: [{}, {}] })).toBe(true);
  });

  it("an approved template still cannot serve an item that has no source", () => {
    const verdict = evaluateItemServe(
      { sources: [] },
      { reviewStatus: ModuleReviewStatus.APPROVED }
    );
    expect(verdict.servable).toBe(false);
    expect(verdict.reason).toMatch(/no ModuleSource/);
  });

  it("a sourced item cannot serve while the template is unapproved", () => {
    for (const reviewStatus of ALL_STATUSES) {
      if (reviewStatus === ModuleReviewStatus.APPROVED) continue;
      const verdict = evaluateItemServe(
        { sources: [{ sourceOrg: "IRS", sourceDoc: "Circular 230" }] },
        { reviewStatus }
      );
      expect(verdict.servable).toBe(false);
      expect(verdict.reason).toMatch(/not approved/);
    }
  });

  it("serves only when BOTH rules pass: approved template + sourced item", () => {
    const verdict = evaluateItemServe(
      { sources: [{ sourceOrg: "GAO", sourceDoc: "Yellow Book" }] },
      { reviewStatus: ModuleReviewStatus.APPROVED }
    );
    expect(verdict.servable).toBe(true);
    expect(verdict.reason).toBeNull();
  });

  it("filterServableItems drops unsourced items and passes sourced ones under an approved template", () => {
    const items = [
      { id: "a", sources: [{ sourceOrg: "NIST" }] },
      { id: "b", sources: [] },
      { id: "c", sources: [{ sourceOrg: "GAO" }, { sourceOrg: "IRS" }] },
    ];
    const approved = filterServableItems(items, { reviewStatus: ModuleReviewStatus.APPROVED });
    expect(approved.map((item) => item.id)).toEqual(["a", "c"]);

    // Under any non-approved status the whole set is withheld.
    const draft = filterServableItems(items, { reviewStatus: ModuleReviewStatus.DRAFT });
    expect(draft).toEqual([]);
  });
});
