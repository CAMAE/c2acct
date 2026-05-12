export const ADMIN_OVERVIEW_UTILITIES = [
  { key: "overview", label: "Overview" },
  { key: "operations", label: "Operations" },
  { key: "runtime", label: "Runtime" },
  { key: "financials", label: "Financials" },
  { key: "help", label: "Help" },
] as const;

export type AdminOverviewUtilityKey = (typeof ADMIN_OVERVIEW_UTILITIES)[number]["key"];

export function normalizeAdminOverviewUtility(rawUtility: string | undefined): AdminOverviewUtilityKey {
  return ADMIN_OVERVIEW_UTILITIES.some((item) => item.key === rawUtility)
    ? (rawUtility as AdminOverviewUtilityKey)
    : "overview";
}

export function getAdminOverviewUtilityHref(utility: AdminOverviewUtilityKey) {
  return utility === "overview" ? "/admin" : `/admin?utility=${utility}`;
}

export const ADMIN_ROUTE_GROUPS = [
  {
    key: "operations",
    title: "Operations",
    description: "Organization, user, taxonomy, module, insight, and product administration.",
    routes: [
      { href: "/admin/organizations", title: "Organizations", body: "Company oversight, company-backed membership controls, linked users, and product context." },
      { href: "/admin/users", title: "Users", body: "Role assignment, company linkage, and individual membership controls." },
      { href: "/admin/taxonomy", title: "Taxonomy", body: "Category and subcategory management, plus bucket-to-capability mappings." },
      { href: "/admin/modules", title: "Modules", body: "Module, section, question, and assessment mapping management." },
      { href: "/admin/insights", title: "Insights", body: "Insight text, unlock rules, capability thresholds, and visibility state." },
      { href: "/admin/products", title: "Products", body: "Product oversight, taxonomy assignments, and capability mappings." },
    ],
  },
  {
    key: "runtime",
    title: "Runtime",
    description: "Diagnostics, portal visibility, briefings, and audit flow.",
    routes: [
      { href: "/admin/briefings", title: "Briefings", body: "Operator-ready summaries of readiness gaps, audit activity, and recent pipeline state." },
      { href: "/admin/runtime", title: "Runtime", body: "Portal visibility, runtime consistency, diagnostics, and recent audit events." },
    ],
  },
] as const;
