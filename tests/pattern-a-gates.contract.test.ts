import { readFileSync } from "node:fs";
import path from "node:path";
import type { CompanyType, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { AUDIENCE_HOME_PATH, audienceHomeFor, type AudienceResolutionInput, type PortalAudienceSegment } from "@/lib/audiencePolicy";
import { inferCanonicalSignInView, isPilotVisibleSignInView, resolvePostAuthRedirectForView } from "@/lib/auth/routes";
import { isProtectedPatPagePath, isSignedOutSalesPage, SIGNED_OUT_SALES_PAGE_PATHS } from "@/lib/authz";

/**
 * pattern box A (R60, R-T): every role lands, the sign-in page shows a tab only
 * while its surface is on, and the two membership sales pages are reachable signed
 * out. The role-landing matrix walks every UserRole x company type x membership
 * kind through the same policy the sign-in hub and the portal layouts use.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const ROLES: UserRole[] = ["OWNER", "ADMIN", "MEMBER"];
const COMPANY_KINDS: Array<{ label: string; companyId: string | null; companyType: CompanyType | null }> = [
  { label: "no company", companyId: null, companyType: null },
  { label: "firm", companyId: "c-firm", companyType: "FIRM" },
  { label: "vendor", companyId: "c-vendor", companyType: "VENDOR" },
];
const MEMBERSHIP_KINDS: Array<{ label: string; isConsultant: boolean; isEnterpriseMember: boolean }> = [
  { label: "plain", isConsultant: false, isEnterpriseMember: false },
  { label: "guide", isConsultant: true, isEnterpriseMember: false },
  { label: "enterprise", isConsultant: false, isEnterpriseMember: true },
];
type Flags = { individualSurfacesEnabled: boolean; consultantAccessEnabled: boolean; enterpriseEnabled: boolean };
const PREVIEW_FLAGS: Flags = { individualSurfacesEnabled: false, consultantAccessEnabled: true, enterpriseEnabled: true };
const ALL_ON: Flags = { individualSurfacesEnabled: true, consultantAccessEnabled: true, enterpriseEnabled: true };

/** The route a signed-in account lands on: its portal home, or the sign-in hub's no-surface message. */
function landingFor(input: AudienceResolutionInput, flags: Flags): { home: PortalAudienceSegment | null; route: string } {
  const home = audienceHomeFor(input);
  if (home === null) throw new Error("unresolved home");
  if (home === "user" && !flags.individualSurfacesEnabled) return { home, route: "/sign-in (no-surface message)" };
  return { home, route: AUDIENCE_HOME_PATH[home] };
}

describe("R-T — every role lands", () => {
  for (const role of ROLES) {
    for (const company of COMPANY_KINDS) {
      for (const membership of MEMBERSHIP_KINDS) {
        const input: AudienceResolutionInput = { role, companyId: company.companyId, companyType: company.companyType, isConsultant: membership.isConsultant, isEnterpriseMember: membership.isEnterpriseMember };
        it(`${role} / ${company.label} / ${membership.label} lands`, () => {
          const landing = landingFor(input, PREVIEW_FLAGS);
          expect(landing.route.length).toBeGreaterThan(0);
          if (landing.home !== "user") {
            // the portal home maps back to a sign-in view and the view resolves to that home
            const view = inferCanonicalSignInView(landing.route);
            expect(view, `sign-in view for ${landing.route}`).not.toBeNull();
            expect(resolvePostAuthRedirectForView(view!, null)).toBe(landing.route);
            expect(isPilotVisibleSignInView(view!, PREVIEW_FLAGS)).toBe(true);
          }
          // with every surface on, the individual lands on /user
          const allOn = landingFor(input, ALL_ON);
          expect(allOn.route.startsWith("/")).toBe(true);
        });
      }
    }
  }

  it("a role with no landing fails: an unresolved company kind is the only null and it is a stay, never a loop", () => {
    expect(audienceHomeFor({ role: "OWNER", companyId: "c", companyType: null, isConsultant: false })).toBeNull();
    expect(() => landingFor({ role: "OWNER", companyId: "c", companyType: null, isConsultant: false }, PREVIEW_FLAGS)).toThrow("unresolved home");
  });
});

describe("R-T — the sign-in page shows a tab only while its surface is on", () => {
  const page = read("app/(public)/sign-in/page.tsx");
  it("each gated view is pinned to its flag in the pill list and in the requested-view fallback", () => {
    expect(page).toContain('...(individualSurfacesEnabled ? [{ id: "individual" as const');
    expect(page).toContain('...(consultantAccessEnabled ? [{ id: "consultant" as const');
    expect(page).toContain('...(enterpriseEnabled ? [{ id: "enterprise" as const');
    expect(page).toContain('...(inviteeSurfacesEnabled ? [{ id: "invitee" as const');
    expect(page).toContain('(rawRequestedAccessView === "individual" && !individualSurfacesEnabled)');
    expect(page).toContain('(rawRequestedAccessView === "invitee" && !inviteeSurfacesEnabled)');
    expect(page).toContain('(rawRequestedAccessView === "enterprise" && !enterpriseEnabled)');
    expect(page).toContain('rawRequestedAccessView === "consultant" && !consultantAccessEnabled');
    expect(page).toContain('{individualSurfacesEnabled && activeView === "individual" ? (');
    expect(page).toContain('{inviteeSurfacesEnabled && activeView === "invitee" ? (');
    expect(page).toContain('{enterpriseEnabled && activeView === "enterprise" ? (');
  });
  it("the view visibility helper agrees with the flags", () => {
    expect(isPilotVisibleSignInView("individual", PREVIEW_FLAGS)).toBe(false);
    expect(isPilotVisibleSignInView("individual", ALL_ON)).toBe(true);
    expect(isPilotVisibleSignInView("enterprise", { ...PREVIEW_FLAGS, enterpriseEnabled: false })).toBe(false);
    expect(isPilotVisibleSignInView("consultant", { ...PREVIEW_FLAGS, consultantAccessEnabled: false })).toBe(false);
    expect(isPilotVisibleSignInView("vendor", PREVIEW_FLAGS)).toBe(true);
    expect(isPilotVisibleSignInView("firm", PREVIEW_FLAGS)).toBe(true);
  });
  it("the ruling row cites the box and R-T", () => {
    const rulings = JSON.parse(read("ops/qa/link-removals.json")) as Array<{ route: string; control: string; ledgerLine: string }>;
    const row = rulings.find((r) => r.route === "/sign-in" && r.control === "Individual / Invitee");
    expect(row?.ledgerLine).toContain("pattern box A");
    expect(row?.ledgerLine).toContain("R-T");
  });
});

describe("change 7 — signed-out membership pages pass the proxy", () => {
  it("a signed-out GET of the two sales pages is not a protected page; everything else under the portals is", () => {
    expect([...SIGNED_OUT_SALES_PAGE_PATHS]).toEqual(["/vendor/membership", "/firm/membership"]);
    expect(isSignedOutSalesPage("/vendor/membership", "GET")).toBe(true);
    expect(isSignedOutSalesPage("/firm/membership", "get")).toBe(true);
    expect(isSignedOutSalesPage("/vendor/membership", "POST")).toBe(false);
    expect(isSignedOutSalesPage("/vendor/membership/checkout", "GET")).toBe(false);
    expect(isProtectedPatPagePath("/vendor/membership", "GET")).toBe(false);
    expect(isProtectedPatPagePath("/firm/membership", "GET")).toBe(false);
    expect(isProtectedPatPagePath("/vendor/membership", "POST")).toBe(true);
    expect(isProtectedPatPagePath("/vendor/membership/checkout", "GET")).toBe(true);
    expect(isProtectedPatPagePath("/vendor", "GET")).toBe(true);
    expect(isProtectedPatPagePath("/firm/insights", "GET")).toBe(true);
    expect(isProtectedPatPagePath("/vendor/membership")).toBe(false); // the default method is GET
  });
  it("the proxy passes the request method and the pages render the signed-out grid", () => {
    expect(read("proxy.ts")).toContain("isProtectedPatPagePath(pathname, req.method)");
    for (const audience of ["vendor", "firm"]) {
      const page = read(`app/(app)/${audience}/membership/page.tsx`);
      expect(page).toContain("if (!sessionUser) {");
      expect(page).toContain('displayName="Not signed in"');
    }
  });
});
