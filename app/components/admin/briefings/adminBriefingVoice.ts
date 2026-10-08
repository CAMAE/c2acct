/**
 * enforce-core (11a): the ADMIN voice of the executive summary card. It lives
 * beside BriefingBoard rather than inside it because BriefingBoard is now in
 * the customer-copy scan (the Guide and Enterprise briefings compose it) while
 * the admin voice is admin copy, outside the scan and untouched by that box.
 */
export const ADMIN_EXECUTIVE_LABELS = {
  firmScore: "Canonical firm score",
  firmModulesDetail: "Completed canonical firm alignment modules in the current briefing.",
} as const;
