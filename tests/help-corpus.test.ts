import { describe, expect, it } from "vitest";
import { HELP_ARTICLES } from "@/scripts/index-help";

/**
 * Guards the customer-facing Pat help corpus (help_doc). retrieveHelp scopes by
 * roleAccess, so a typo'd audience would silently hide or leak an article.
 */

const VALID_AUDIENCES = new Set(["firm", "vendor", "individual", "consultant", "admin"]);

describe("Pat help corpus", () => {
  it("ships the expanded corpus of 30-40 articles (Block 4)", () => {
    expect(HELP_ARTICLES.length).toBeGreaterThanOrEqual(30);
    expect(HELP_ARTICLES.length).toBeLessThanOrEqual(40);
  });

  it("has unique paths and non-empty content", () => {
    const paths = HELP_ARTICLES.map((a) => a.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const article of HELP_ARTICLES) {
      expect(article.path).toMatch(/^help\/.+\.md$/);
      expect(article.title.trim().length).toBeGreaterThan(0);
      expect(article.body.trim().length).toBeGreaterThan(20);
    }
  });

  it("only tags known audiences ([] = global; consultant/admin are unrestricted)", () => {
    for (const article of HELP_ARTICLES) {
      for (const role of article.roleAccess) {
        expect(VALID_AUDIENCES.has(role)).toBe(true);
      }
    }
  });
});
