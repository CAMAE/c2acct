import { describe, expect, it } from "vitest";
import { HELP_ARTICLES } from "@/scripts/index-help";

/**
 * Ask Pat help corpus (Block 4). Locks the corpus size and the required articles
 * so Ask Pat has grounded answers to cite. Retrieval + citation behaviour is
 * proven live by scripts/smoke-ask-pat.ts (in validate:db).
 */

describe("help corpus — Block 4 additions", () => {
  it("includes the Secret-Firms unlock article, vendor-scoped, naming the Elite path", () => {
    const article = HELP_ARTICLES.find((a) => a.path === "help/vendor/battlecard-secret-firms.md");
    expect(article, "Secret-Firms article must exist").toBeDefined();
    expect(article!.title).toMatch(/secret firms/i);
    expect(article!.roleAccess).toEqual(["vendor"]);
    expect(article!.body).toMatch(/elite/i);
  });

  it("covers the Block 4 / governance topics with citable articles", () => {
    const paths = HELP_ARTICLES.map((a) => a.path);
    for (const needle of ["sign-out", "methodology", "membership-tiers", "elite-insights", "insufficient-peer-data"]) {
      expect(paths.some((p) => p.includes(needle)), `missing help article for ${needle}`).toBe(true);
    }
  });

  it("every article has a body long enough to answer from", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.body.length, `${article.path} body too short`).toBeGreaterThan(80);
    }
  });
});
