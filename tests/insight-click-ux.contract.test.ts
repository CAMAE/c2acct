import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getRequestedFirmInsightDetailSurface } from "@/lib/firmInsightEngine";
import { getRequestedVendorAlignmentInsightDetailSurface } from "@/lib/vendorAlignmentInsightEngine";
import { getRequestedVendorProductInsightDetailSurface } from "@/lib/vendorProductInsightEngine";

/**
 * Block 11d: clicking an insight card must land on the Pro (data) pane — never
 * Help — on every insight surface, and cards expand the Pro readout in place
 * (sales-card style) with "Open full view" linking to the unchanged detail
 * route. Block 11e: the product-insight Elite upsell toggle is shown to
 * non-entitled vendors only.
 */

const ROOT = "/Users/camerongarrett/work/c2acct-live";
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("11d — insight detail defaults to the Pro/data pane, never Help", () => {
  it("firm insight detail defaults to Pro", () => {
    expect(getRequestedFirmInsightDetailSurface(undefined)).toBe("pro");
    expect(getRequestedFirmInsightDetailSurface("")).toBe("pro");
    expect(getRequestedFirmInsightDetailSurface("garbage")).toBe("pro");
  });

  it("vendor-alignment insight detail defaults to Pro", () => {
    expect(getRequestedVendorAlignmentInsightDetailSurface(undefined)).toBe("pro");
    expect(getRequestedVendorAlignmentInsightDetailSurface("garbage")).toBe("pro");
  });

  it("product-insight detail defaults to the Evidence data pane, not Help", () => {
    expect(getRequestedVendorProductInsightDetailSurface(undefined)).toBe("evidence");
    expect(getRequestedVendorProductInsightDetailSurface("garbage")).toBe("evidence");
    // help is still reachable explicitly, but is never the default
    expect(getRequestedVendorProductInsightDetailSurface("help")).toBe("help");
  });
});

describe("11d — cards expand the Pro readout in place", () => {
  it("the card grid renders inline expansion + an Open full view link", () => {
    const src = read("app/components/insights/InsightSurfaceCardGrid.tsx");
    expect(src).toContain('"use client"');
    expect(src).toContain("expandedContent");
    expect(src).toContain("Open full view");
    expect(src).toContain("aria-expanded");
  });

  it("firm + vendor Pro card builders attach the Pro readout as expandedContent", () => {
    expect(read("lib/firmInsightEngine.ts")).toContain("expandedContent");
    expect(read("lib/vendorAlignmentInsightEngine.ts")).toContain("expandedContent");
  });
});

describe("11e — product-insight Elite toggle is a non-entitled upsell only", () => {
  it("the toggle is gated on showElite in the surface-card builder", () => {
    const src = read("lib/vendorProductInsightEngine.ts");
    expect(src).toContain("showElite");
    expect(src).toContain('key: "elite"');
  });

  it("shows the upsell only to non-entitled; entitled gets live depth (hybrid Elite depth flip)", () => {
    const src = read("app/vendor/product-insight/[productId]/[insightKey]/page.tsx");
    // the toggle shows on every tier-1 surface; the UPSELL is non-entitled only
    expect(src).toContain("const showEliteToggle = !isTier2");
    expect(src).toContain("showEliteUpsell = showEliteToggle && !eliteEntitled");
    // a direct ?surface=elite on a tier-2 route (no toggle) falls back to data
    expect(src).toContain('requestedSurface === "elite" && !showEliteToggle');
    // entitled → live depth card; non-entitled → honest locked preview
    expect(src).toContain("ProductEliteDepthCard");
    expect(src).toContain("LockedElitePreview");
  });
});
