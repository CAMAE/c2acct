import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MEMBERSHIP_PRICE_DISPLAY } from "@/lib/membershipContent";
import { BOARD_PRICE_BAND } from "@/lib/alignmentBoard";
import { HELP_ARTICLE_BY_CARD, helpArticleHref } from "@/lib/helpArticleLinks";
import { listHelpArticleSlugs, toHelpBlocks } from "@/lib/helpArticles";

/**
 * Depth box (2026-09-09) — pins for the rulings and the flag-off approvals:
 * one card hover on three surfaces (0.1), the public footer row (0.2), the
 * agreed prices (5), the dead-end redirects (9), the veil (3), the guide home
 * panels (4), help links (6), the status strip (7), the rail (8), the
 * dashboards (1), how-it-works (2). Source pins only; behaviour is proved by
 * the atlas and the flag-off diff.
 */
const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("0 — hover + footer", () => {
  it("one shared hover class on the hero band, the Pro insight cards and the Elite insight cards", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.pat-hover-card \{\s*transition:\s*border-color 150ms ease,\s*background-color 150ms ease;/);
    expect(css).toMatch(/\.pat-hover-card:hover,[\s\S]{0,120}border-color: var\(--brand-c2-blue\);\s*background-color: rgba\(6, 54, 116, 0\.02\);/);
    expect((read("app/components/frontdoor/V7DoorBand.tsx").match(/[`"]pat-hover-card /g) || []).length).toBe(3);
    const grid = read("app/components/insights/InsightSurfaceCardGrid.tsx");
    expect(grid).toContain('"pat-card pat-hover-card"'); // Pro and Elite cards both render here
    expect(grid).not.toContain("pat-card-interactive");
    expect(css).not.toMatch(/\.v7-band-cell/); // the fill tint is gone
  });
  it("the public footer renders the portal's nine-link row; the door has no trust accordion", () => {
    const shell = read("app/components/frontdoor/V7PublicShell.tsx");
    expect(shell).toMatch(/<footer[\s\S]*\{TRUST_FOOTER_LINKS\.map\(\(link\) => \(/);
    expect(read("app/components/frontdoor/V7FrontDoor.tsx")).not.toContain("v7-trust-accordion");
  });
});

describe("5 — prices (approved flag-off)", () => {
  it("carries the pricing memo's annual figures; the user tier stays hidden", () => {
    expect(MEMBERSHIP_PRICE_DISPLAY.firm?.PRO).toEqual({ priceDisplay: "$4,800", cadence: "per year" });
    expect(MEMBERSHIP_PRICE_DISPLAY.firm?.ELITE).toEqual({ priceDisplay: "$24,000", cadence: "per year" });
    expect(MEMBERSHIP_PRICE_DISPLAY.vendor?.PRO).toEqual({ priceDisplay: "$9,000", cadence: "per year" });
    expect(MEMBERSHIP_PRICE_DISPLAY.vendor?.ELITE?.priceDisplay).toBe("Ecosystem license");
    expect(MEMBERSHIP_PRICE_DISPLAY.user).toBeUndefined();
    expect(BOARD_PRICE_BAND).toBe("$24,000/yr");
  });
});

describe("9 — dead ends (approved flag-off)", () => {
  it("no entry to user-insight or engagement score; direct hits redirect with a notice", () => {
    expect(read("app/components/firm/FirmAdminPanels.tsx")).not.toContain("/firm/admin/user-insight");
    expect(read("app/(app)/firm/admin/user-insight/page.tsx")).toContain('redirect("/firm?panel=admin&notice=user-insight")');
    const score = read("app/(app)/engagements/[id]/score/page.tsx");
    expect(score).toContain("?notice=engagement-score");
    expect(score).not.toContain("Open firm PAT");
    const notice = read("app/components/shell/WorkspaceNotice.tsx");
    expect(notice).toContain('"user-insight"');
    expect(notice).toContain('"engagement-score"');
    for (const rel of ["app/(app)/firm/page.tsx", "app/(app)/vendor/page.tsx"]) {
      expect(read(rel)).toContain("<WorkspaceNotice notice={params?.notice} />");
    }
  });
});

describe("3 — locked pages (flag-on)", () => {
  it("Pro tier sees the real surface behind blur + 60% white with the Elite lock card", () => {
    const veil = read("app/components/membership/LockedSurfaceVeil.tsx");
    expect(veil).toContain("blur-[3px]");
    expect(veil).toContain("bg-white/60");
    expect(veil).toContain("Upgrade to Elite");
    const board = read("app/(app)/firm/alignment-board/page.tsx");
    expect(board).toMatch(/!entitlement\.allowed && isNewFrontDoorEnabled\(\)[\s\S]{0,400}<LockedSurfaceVeil/);
    expect(board).toContain("price={`${BOARD_PRICE_BAND} · Firm Elite`}");
    const card = read("app/(app)/vendor/battlecard/page.tsx");
    expect(card).toMatch(/!entitlement\.allowed && isNewFrontDoorEnabled\(\)[\s\S]{0,400}<LockedSurfaceVeil/);
    expect(card).toContain('price="Ecosystem license · contact us"');
  });
});

describe("4 — guide home (flag-on)", () => {
  it("freshness and nudges open with the new front door; request refresh drafts through the approval path; briefing + week cards", () => {
    const page = read("app/(app)/consultants/page.tsx");
    expect(page).toContain("const freshnessEnabled = isPingsEnabled() || isNewFrontDoorEnabled();");
    expect(page).toContain("<LowestEngagementFirmsCard key={detail.ecosystemId} data={detail} />");
    expect(page).toContain("<ConsultantWeekCards week={week} />");
    expect(read("app/(app)/consultants/_components/FreshnessBoard.tsx")).toContain('label="Request refresh"');
    expect(read("lib/consultantWeek.ts")).toContain("quarterCutoff(now)");
  });
});

describe("6 — help (flag-on)", () => {
  it("every mapped card points at an existing help/public article; Ask Pat card is first", () => {
    const slugs = new Set(listHelpArticleSlugs());
    for (const [title, entry] of Object.entries(HELP_ARTICLE_BY_CARD)) {
      expect(slugs.has(entry.slug), `${title} → ${entry.slug}`).toBe(true);
      expect(helpArticleHref(title)?.href).toBe(`/help/${entry.slug}`);
    }
    for (const rel of [
      "app/components/firm/FirmPortalContent.tsx",
      "app/components/vendor/VendorPortalContent.tsx",
      "app/(app)/survey/help/page.tsx",
      "app/components/consultants/ConsultantHelpContent.tsx",
    ]) {
      const src = read(rel);
      expect(src, rel).toContain("<AskPatCard");
      expect(src, rel).toContain("<HelpArticleLink cardTitle=");
    }
    expect(toHelpBlocks("## A\n\ntext **bold** more\n\n- one\n- two\n").map((b) => b.kind)).toEqual(["h2", "p", "ul"]);
  });
});

describe("7 — product lists (flag-on)", () => {
  it("both lists render the status strip, needs-attention first, table at md and cards below", () => {
    const strip = read("app/components/products/ProductStatusStrip.tsx");
    expect(strip).toContain("hidden overflow-x-auto");
    expect(strip).toContain("grid gap-4 md:hidden");
    for (const col of ["Declared features", "Firm reviews on file", "Last updated", "Divergence"]) expect(strip).toContain(col);
    const rows = read("lib/productStatusRows.ts");
    expect(rows).toMatch(/rows\.filter\(\(row\) => row\.needsAttention\), \.\.\.rows\.filter\(\(row\) => !row\.needsAttention\)/);
    expect(read("app/(app)/vendor/product-assessment/page.tsx")).toContain("buildVendorProductStatusRows(");
    expect(read("app/(app)/firm/product-assessments/page.tsx")).toContain("buildFirmProductStatusRows(products)");
  });
});

describe("8 — onboarding rail (flag-on)", () => {
  it("the rail renders on /onboarding, /onboarding/[audience] and the account wizard, filling as steps complete", () => {
    expect(read("app/(public)/onboarding/page.tsx")).toContain("<OnboardingPreviewRail completed={0}");
    expect(read("app/(public)/onboarding/[audience]/page.tsx")).toContain("<OnboardingPreviewRail completed={railCompleted}");
    const wizard = read("app/components/create-account/CreateAccountWizard.tsx");
    expect(wizard).toContain("if (!showRail) return body;"); // flag-off root is the old root, byte for byte
    expect(wizard).toContain("<OnboardingPreviewRail completed={railCompleted}");
    expect(read("app/(public)/create-account/page.tsx")).toContain("{...(isNewFrontDoorEnabled() ? { showRail: true } : {})}"); // no prop flag-off
    for (const rel of ["app/(public)/onboarding/page.tsx", "app/(public)/onboarding/[audience]/page.tsx"]) expect(read(rel), rel).toContain("if (!rail) return body;");
  });
});

describe("1 — workspace homes (flag-on)", () => {
  it("firm and vendor homes render the dashboards flag-on and keep the slogan + cards flag-off", () => {
    const firm = read("app/(app)/firm/page.tsx");
    expect(firm).toContain("<FirmWorkspaceDashboard view={dashboard} />");
    expect(firm).toContain("{messages.portal.firm.body}"); // flag-off path intact
    const vendor = read("app/(app)/vendor/page.tsx");
    expect(vendor).toContain("<VendorWorkspaceDashboard view={dashboard} />");
    expect(vendor).toContain("{messages.portal.vendor.body}");
    const firmDash = read("app/components/workspace/FirmWorkspaceDashboard.tsx");
    for (const t of ["Alignment index", "Modules complete", "Capabilities met", "Next best step", "Open readout", "Since your last visit", "<RadarChart"]) expect(firmDash).toContain(t);
    expect(firmDash).toContain("view.modules.map((module, index)"); // 0/5 empty state lists the five modules
    const vendorDash = read("app/components/workspace/VendorWorkspaceDashboard.tsx");
    for (const t of ["Products declared", "Firm reviews on file", "Largest divergence", "Next briefing", "Open readout", "Since your last visit"]) expect(vendorDash).toContain(t);
  });
});

describe("2 — how it works (flag-on)", () => {
  it("/pat is four numbered chapters ending in the fork; no intelligence-layer copy", () => {
    const how = read("app/components/frontdoor/HowItWorks.tsx");
    for (const n of ["01", "02", "03", "04"]) expect(how).toContain(`number: "${n}"`);
    expect(how).toContain("<V7RadarFigure />");
    expect(how).toContain("<V7DoorBand start={false} />");
    expect(how).not.toMatch(/intelligence layer/i);
    expect(how.match(/provenance: "/g)?.length).toBe(4);
    expect(read("app/(public)/pat/page.tsx")).toMatch(/if \(isNewFrontDoorEnabled\(\)\) \{\s*return <HowItWorks \/>;/);
  });
});
