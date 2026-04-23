import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildElitePlaceholderSurfaceContent,
  buildHelpSurfaceContent,
} from "@/lib/insightSurface";

const ROOT = "/Users/camerongarrett/work/c2acct-live";

const overviewRoutes = [
  "app/vendor/product-insight/[productId]/page.tsx",
  "app/vendor/alignment-insights/page.tsx",
  "app/firm/insights/page.tsx",
  "app/user/insights/page.tsx",
] as const;

const detailRoutes = [
  "app/vendor/product-insight/[productId]/[insightKey]/page.tsx",
  "app/vendor/alignment-insights/[key]/page.tsx",
  "app/firm/insights/[key]/page.tsx",
  "app/user/insights/[key]/page.tsx",
] as const;

describe("shared insight primitives", () => {
  it("keeps the shared Help and Elite placeholder section structure stable", () => {
    const help = buildHelpSurfaceContent({
      intro: "Help intro",
      what: "What",
      why: "Why",
      how: "How",
    });
    const elite = buildElitePlaceholderSurfaceContent({
      intro: "Elite intro",
      what: "What",
      why: "Why",
      how: "How",
    });

    expect(help.title).toBe("Help");
    expect(help.items.map((item) => item.title)).toEqual([
      "What it is",
      "Why it matters",
      "How to use it",
    ]);
    expect(elite.title).toBe("Elite");
    expect(elite.items.map((item) => item.title)).toEqual([
      "What it is",
      "Why it matters",
      "How to use it",
    ]);
  });

  it("keeps the insight overview routes on the shared overview shell", () => {
    for (const relativePath of overviewRoutes) {
      const text = readFileSync(path.join(ROOT, relativePath), "utf8");

      expect(text, `${relativePath} should import InsightsModeShell`).toContain(
        'import InsightsModeShell from "@/app/components/insights/InsightsModeShell";'
      );
      expect(text, `${relativePath} should render InsightsModeShell`).toContain("<InsightsModeShell");
    }
  });

  it("keeps the overview shell source free of legacy overview badge and count copy", () => {
    const userOverview = readFileSync(path.join(ROOT, "app/user/insights/page.tsx"), "utf8");
    const gridSource = readFileSync(
      path.join(ROOT, "app/components/insights/InsightSurfaceCardGrid.tsx"),
      "utf8"
    );

    expect(userOverview).not.toContain('statusLabel: proAvailable ? "Current-state signal"');
    expect(gridSource).toContain("const hasStatusLabel = Boolean(card.statusLabel);");
  });

  it("keeps the insight detail routes on the shared detail shell", () => {
    for (const relativePath of detailRoutes) {
      const text = readFileSync(path.join(ROOT, relativePath), "utf8");

      expect(text, `${relativePath} should import InsightDetailShell`).toContain(
        'import InsightDetailShell from "@/app/components/insights/InsightDetailShell";'
      );
      expect(text, `${relativePath} should render InsightDetailShell`).toContain("<InsightDetailShell");
    }
  });
});
