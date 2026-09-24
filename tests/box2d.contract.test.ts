import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("box 2d — R17 Guide word (flag-gated)", () => {
  it("guideWord is the production word flag-off and Guide flag-on", async () => {
    const saved = process.env.PAT_ENABLE_NEW_FRONT_DOOR;
    try {
      delete process.env.PAT_ENABLE_NEW_FRONT_DOOR;
      const { guideWord } = await import("@/lib/roleWords");
      expect(guideWord()).toBe("Consultant");
      expect(guideWord("consultants")).toBe("consultants");
      process.env.PAT_ENABLE_NEW_FRONT_DOOR = "1";
      expect(guideWord()).toBe("Guide");
      expect(guideWord("consultant")).toBe("guide");
      expect(guideWord("Consultants")).toBe("Guides");
      process.env.PAT_ENABLE_NEW_FRONT_DOOR = "0";
      expect(guideWord()).toBe("Consultant");
    } finally {
      if (saved === undefined) delete process.env.PAT_ENABLE_NEW_FRONT_DOOR;
      else process.env.PAT_ENABLE_NEW_FRONT_DOOR = saved;
    }
  });

  it("no user-facing source string spells the role word directly any more (routes and identifiers excepted)", () => {
    const files = [
      "app/(app)/consultants/page.tsx",
      "app/(app)/consultants/ecosystems/[ecosystemId]/firm/[firmCompanyId]/page.tsx",
      "app/(app)/consultants/ecosystems/[ecosystemId]/vendor-brief/page.tsx",
      "app/(app)/consultants/ecosystems/[ecosystemId]/explainers/[metricKey]/page.tsx",
      "app/components/consultants/ConsultantHelpContent.tsx",
      "app/components/shell/AppShell.tsx",
      "app/components/shell/SignedInHeaderControls.tsx",
      "app/(public)/sign-in/page.tsx",
      "app/(public)/sign-in/consultant/page.tsx",
      "app/not-found.tsx",
      "app/(app)/admin/insights/page.tsx",
      "app/(app)/admin/briefings/page.tsx",
      "app/(app)/admin/users/page.tsx",
      "app/(app)/admin/consultants/page.tsx",
      "lib/notifications/nudge.ts",
      "lib/auth/localReview.ts",
      "lib/helpArticleLinks.ts",
      "lib/trustContent.ts",
    ];
    for (const rel of files) {
      const src = read(rel).replace(/guideWord\("[A-Za-z]+"\)/g, "guideWord()");
      // A quoted or JSX-text "Consultant"/"consultant" is a user-facing literal; identifiers,
      // route paths, emails and flag keys are not quoted words on their own.
      const literal = /(["'`>])\s*(Consultants?|consultants?)(\s+[a-z][^"'`<]{0,40})?(["'`<])/g;
      const hits = [...src.matchAll(literal)].map((m) => m[0]).filter((hit) => !/\/consultants|review\.consultant|@|consultant-access|"consultant"/.test(hit));
      expect(hits, rel).toEqual([]);
      expect(src, rel).toContain("guideWord(");
    }
  });

  it("the guard canonicalizes the flag-on Guide labels back to production's", () => {
    const src = read("tests/link-inventory.contract.test.ts");
    for (const entry of ['[/^Guide$/, "Consultant"]', '[/^Guide portal\\b/, "Consultant portal"]', '[/^Guide pilot user$/, "Consultant pilot user"]']) {
      expect(src).toContain(entry);
    }
  });

  it("the help corpus reads Guide (slugs keep their paths)", () => {
    const article = read("help/public/pat-for-consultants-and-ecosystem-owners.md");
    expect(article).toMatch(/^title: PAT for guides and ecosystem owners$/m);
    expect(article.replace(/^---[\s\S]*?---/, "")).not.toMatch(/\bconsultants?\b/i);
  });
});

describe("box 2d — R37 Product Fit Card brief in the shared drawer", () => {
  it("the insights drawer is one component (pure move) and the grid renders it", () => {
    const drawer = read("app/components/insights/ReadoutDrawer.tsx");
    const grid = read("app/components/insights/InsightSurfaceCardGrid.tsx");
    expect(drawer).toContain('role="dialog"');
    expect(drawer).toContain('data-testid={testId}');
    expect(drawer).toContain('data-readout-drawer=""');
    expect(grid).toContain('<ReadoutDrawer');
    expect(grid).toContain('open={expanded && readoutMode === "drawer"}');
    expect(grid).not.toContain('role="dialog"');
  });

  it("the Product Fit Card opens the brief in the drawer flag-on and inline flag-off", () => {
    const client = read("app/components/vendor/VendorBattleCardClient.tsx");
    const page = read("app/(app)/vendor/battlecard/page.tsx");
    expect(client).toContain('briefMode = "inline"');
    expect(client).toContain('{expanded && briefMode === "inline" ? (');
    expect(client).toContain('testId="battlecard-brief-drawer"');
    expect(client).toContain('expanded && briefMode === "inline" ? "md:col-span-2 xl:col-span-3" : ""');
    expect(page).toContain('briefMode={isNewFrontDoorEnabled() ? "drawer" : "inline"}');
  });
});

describe("box 2d — R40 labelled percentile charts (flag-on only)", () => {
  it("both charts default to the classic design and only flag-on pages ask for labelled", () => {
    expect(read("app/components/charts/PercentileBand.tsx")).toContain('design = "classic"');
    expect(read("app/components/charts/PercentileBandRow.tsx")).toContain('design = "classic"');
    expect(read("app/components/insights/elite/FirmPeerPositionCard.tsx")).toContain('chartDesign = "classic"');
    expect(read("app/components/insights/elite/VendorCategoryPositionCard.tsx")).toContain('chartDesign = "classic"');
    expect(read("app/(app)/firm/insights/[key]/page.tsx")).toContain('chartDesign={isNewFrontDoorEnabled() ? "labelled" : "classic"}');
    expect(read("app/(app)/vendor/alignment-insights/[key]/page.tsx")).toContain('chartDesign={isNewFrontDoorEnabled() ? "labelled" : "classic"}');
    // The benchmark page (production) keeps the classic chart in both flag sets.
    expect(read("app/(app)/firm/benchmark/page.tsx")).not.toContain("labelled");
  });

  it("the labelled design carries labelled bands, a median with value, a marker with value, an axis and a legend", () => {
    const band = read("app/components/charts/PercentileBand.tsx");
    for (const needle of ["pack", "top quartile", "median {Math.round(row.p50 as number)}", "you {Math.round(row.score as number)}", "[0, 25, 50, 75, 100]", "peer median", "top decile (p90)"]) {
      expect(band).toContain(needle);
    }
    const row = read("app/components/charts/PercentileBandRow.tsx");
    for (const needle of ["peer mean {Math.round(mean)}", "p25 {Math.round(p25 as number)}", "p75 {Math.round(p75 as number)}", "firm-reviewed strength, 0–100"]) {
      expect(row).toContain(needle);
    }
  });
});
