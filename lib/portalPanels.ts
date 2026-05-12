export const PORTAL_PANEL_KEYS = ["workspace", "pat", "admin", "help", "membership"] as const;

export type PortalPanelKey = (typeof PORTAL_PANEL_KEYS)[number];

export function normalizePortalPanel(rawPanel: string | undefined): PortalPanelKey {
  if (rawPanel && PORTAL_PANEL_KEYS.includes(rawPanel as PortalPanelKey)) {
    return rawPanel as PortalPanelKey;
  }

  return "workspace";
}

export function buildPortalPanelHref(basePath: string, panel: PortalPanelKey) {
  return panel === "workspace" ? basePath : `${basePath}?panel=${panel}`;
}

export function buildPortalPanelOptions(input: {
  basePath: string;
  adminLabel: string;
  helpLabel: string;
  meetPatLabel: string;
  membershipLabel?: string;
  workspaceLabel: string;
}) {
  return [
    { key: "workspace" as const, label: input.workspaceLabel, href: buildPortalPanelHref(input.basePath, "workspace") },
    { key: "pat" as const, label: input.meetPatLabel, href: buildPortalPanelHref(input.basePath, "pat") },
    { key: "admin" as const, label: input.adminLabel, href: buildPortalPanelHref(input.basePath, "admin") },
    { key: "help" as const, label: input.helpLabel, href: buildPortalPanelHref(input.basePath, "help") },
    {
      key: "membership" as const,
      label: input.membershipLabel ?? "Membership",
      href: buildPortalPanelHref(input.basePath, "membership"),
    },
  ];
}
