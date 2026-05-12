import { describe, expect, it } from "vitest";
import { buildPortalPanelHref, buildPortalPanelOptions, normalizePortalPanel } from "@/lib/portalPanels";

describe("portal panel contracts", () => {
  it("normalizes unknown panels to workspace", () => {
    expect(normalizePortalPanel(undefined)).toBe("workspace");
    expect(normalizePortalPanel("unknown")).toBe("workspace");
    expect(normalizePortalPanel("membership")).toBe("membership");
  });

  it("keeps membership as the last portal option", () => {
    const options = buildPortalPanelOptions({
      basePath: "/vendor",
      workspaceLabel: "Workspace",
      meetPatLabel: "Meet PAT",
      adminLabel: "Admin",
      helpLabel: "Help",
      membershipLabel: "Membership",
    });

    expect(options.map((option) => option.key)).toEqual(["workspace", "pat", "admin", "help", "membership"]);
    expect(options.at(-1)).toEqual({
      key: "membership",
      label: "Membership",
      href: "/vendor?panel=membership",
    });
  });

  it("builds workspace and membership hrefs correctly", () => {
    expect(buildPortalPanelHref("/firm", "workspace")).toBe("/firm");
    expect(buildPortalPanelHref("/firm", "membership")).toBe("/firm?panel=membership");
  });
});
