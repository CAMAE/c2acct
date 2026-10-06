import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AUDIENCE_HOME_PATH, audienceHomeFor, resolveAudienceRedirectTarget } from "@/lib/audiencePolicy";
import { buildCanonicalSignInPath, inferCanonicalSignInView, isPilotVisibleSignInView, resolvePostAuthRedirectForView } from "@/lib/auth/routes";
import { getLocaleMessages, SUPPORTED_LOCALES } from "@/lib/locale";

/**
 * hotfix-demo-1 (R59, 2026-10-05) changes 1 to 3: the enterprise owner lands on
 * /enterprise, the Enterprise sign-in tab, and the sign-in copy in the reader's voice.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const signInPage = read("app/(public)/sign-in/page.tsx");

describe("E1 — the enterprise owner lands on /enterprise", () => {
  it("a company-less enterprise member homes on /enterprise; vendor, firm and operator homes are unchanged", () => {
    expect(audienceHomeFor({ role: "MEMBER", companyId: null, companyType: null, isConsultant: false, isEnterpriseMember: true })).toBe("enterprise");
    expect(audienceHomeFor({ role: "MEMBER", companyId: "v1", companyType: "VENDOR", isConsultant: false, isEnterpriseMember: false })).toBe("vendor");
    expect(audienceHomeFor({ role: "OWNER", companyId: "f1", companyType: "FIRM", isConsultant: false })).toBe("firm");
    expect(audienceHomeFor({ role: "ADMIN", companyId: null, companyType: null, isConsultant: false, isEnterpriseMember: true })).toBe("admin");
    expect(AUDIENCE_HOME_PATH.enterprise).toBe("/enterprise");
  });

  it("the enterprise member is redirected off /vendor and /user to /enterprise and stays on /enterprise", () => {
    const owner = { role: "MEMBER" as const, companyId: null, companyType: null, isConsultant: false, isEnterpriseMember: true };
    expect(resolveAudienceRedirectTarget(owner, "vendor")).toBe("/enterprise");
    expect(resolveAudienceRedirectTarget(owner, "user")).toBe("/enterprise");
    expect(resolveAudienceRedirectTarget(owner, "enterprise")).toBeNull();
  });

  it("the enterprise sign-in view resolves to /enterprise and is inferred from /enterprise deep links", () => {
    expect(resolvePostAuthRedirectForView("enterprise", null)).toBe("/enterprise");
    expect(resolvePostAuthRedirectForView("enterprise", "/vendor")).toBe("/enterprise");
    expect(resolvePostAuthRedirectForView("enterprise", "/enterprise/briefings/c1")).toBe("/enterprise/briefings/c1");
    expect(resolvePostAuthRedirectForView("vendor", "/enterprise")).toBe("/vendor");
    expect(resolvePostAuthRedirectForView("firm", null)).toBe("/firm");
    expect(inferCanonicalSignInView("/enterprise/ecosystems/e1")).toBe("enterprise");
    expect(buildCanonicalSignInPath({ callbackUrl: "/enterprise" })).toBe("/sign-in?callbackUrl=%2Fenterprise&view=enterprise");
    expect(isPilotVisibleSignInView("enterprise", { individualSurfacesEnabled: false, consultantAccessEnabled: true })).toBe(false);
    expect(isPilotVisibleSignInView("enterprise", { individualSurfacesEnabled: false, consultantAccessEnabled: true, enterpriseEnabled: true })).toBe(true);
  });

  it("the audience guard reads the enterprise membership for company-less accounts", () => {
    const guard = read("lib/audienceGuard.ts");
    expect(guard).toContain('import { getEnterpriseForUser } from "@/lib/enterprise";');
    expect(guard).toContain("user.companyId ? Promise.resolve(null) : getEnterpriseForUser(user.id)");
    expect(guard).toContain("isEnterpriseMember: Boolean(enterprise)");
  });

  it("a signed-in account with no surface gets the sign-in page with a message, not a redirect loop", () => {
    expect(signInPage).toContain('if (home === "user" && !individualSurfacesEnabled) {');
    expect(signInPage).toContain("signedInWithoutSurface = true;");
    expect(signInPage).toContain("? messages.signIn.noSurface");
    expect(signInPage).not.toMatch(/if \(home\) redirect\(AUDIENCE_HOME_PATH\[home\]\);/);
    for (const action of ["lib/auth/pilotPasswordActions.ts", "lib/auth/localReviewActions.ts"]) {
      expect(read(action)).toContain('target === "consultant" || target === "enterprise"');
    }
  });
});

describe("P3 — the Enterprise tab on sign-in", () => {
  it("renders between Guide and Admin, flag-on only, with the provisioned form bound to view=enterprise and callback /enterprise", () => {
    const pills = signInPage.slice(signInPage.indexOf("const toggleOptions"), signInPage.indexOf("{ id: \"pat\", label"));
    const guideAt = pills.indexOf('id: "consultant" as const');
    const enterpriseAt = pills.indexOf('enterpriseEnabled ? [{ id: "enterprise" as const, label: messages.signIn.enterprise }]');
    const adminAt = pills.indexOf('{ id: "admin", label: "Admin" }');
    expect(guideAt).toBeGreaterThan(-1);
    expect(enterpriseAt).toBeGreaterThan(guideAt);
    expect(adminAt).toBeGreaterThan(enterpriseAt);
    expect(signInPage).toContain('{enterpriseEnabled && activeView === "enterprise" ? (');
    expect(signInPage).toContain('roleRedirect={requestedRoleRedirects.enterprise}');
    expect(signInPage).toContain('view="enterprise"');
    expect(signInPage).toContain('enterprise: resolvePostAuthRedirectForView("enterprise", requestedTarget)');
    expect(signInPage).toContain('(rawRequestedAccessView === "enterprise" && !enterpriseEnabled)');
  });

  it("carries the Enterprise strings in all three locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const m = getLocaleMessages(locale).signIn;
      expect(m.enterprise.length).toBeGreaterThan(0);
      expect(m.enterpriseTitle.length).toBeGreaterThan(0);
      expect(m.enterpriseSubtitle.length).toBeGreaterThan(0);
    }
    expect(getLocaleMessages("en").signIn.enterprise).toBe("Enterprise");
  });
});

describe("P1 and P2 — sign-in copy in the reader's voice", () => {
  it("the local-auth setup link renders only while the local-review flag is on; the key stays for that case", () => {
    expect(signInPage).toContain(") : localReviewRequested ? (");
    expect(signInPage).toMatch(/localReviewRequested \? \([\s\S]{0,400}\{localAuthLabel\}[\s\S]{0,60}<\/Link>\s*\) : null\}/);
    expect(getLocaleMessages("en").common.reviewLocalAuthSetup).toBe("Review local auth setup");
  });

  it("every role panel carries the provisioned sentence", () => {
    expect(signInPage.match(/provisionedBody=\{messages\.signIn\.provisionedBody\}/g)?.length).toBe(6);
    expect(signInPage).not.toContain("pilot users sign in here after an operator provisions their account");
    expect(getLocaleMessages("en").signIn.provisionedBody).toBe(
      "Sign in with the account PAT provisioned for you. If this is your first sign-in, PAT will ask you to set a new password."
    );
  });

  it("the Meet PAT tab is one card in the home page voice and the portals' MeetPatContent is untouched", () => {
    expect(signInPage).not.toContain("import MeetPatContent");
    expect(signInPage).toContain('data-testid="sign-in-meet-pat"');
    expect(signInPage).toContain("{messages.meetPatTitle}");
    expect(signInPage).toContain("{messages.meetPatBody}");
    const en = getLocaleMessages("en").signIn;
    expect(en.meetPatTitle).toBe("Meet PAT");
    expect(en.meetPatBody).toBe(
      "Firms and software vendors answer the same questions. Firms score their own operations and review the products they use. Vendors score their own products. PAT puts the two side by side and shows where they disagree. Every score is arithmetic on the answers; no model interprets a score."
    );
  });

  it("the Help tab is three lines: which tab for which role, the support address, passwords set on first sign-in", () => {
    expect(signInPage).toContain('data-testid="sign-in-help"');
    expect(signInPage).toContain('messages.helpTabsLine.replace("{tabs}", roleTabs.join(", "))');
    expect(signInPage).toContain('href={`mailto:${SUPPORT_EMAIL}`}');
    expect(signInPage).toContain("{messages.helpPasswordLine}");
    expect(signInPage).not.toMatch(/<button[^>]*>\s*Reset local auth state/);
    expect(signInPage).not.toContain("helpCards");
    for (const locale of SUPPORTED_LOCALES) {
      const m = getLocaleMessages(locale).signIn;
      expect(m.helpTabsLine).toContain("{tabs}");
      expect(m.helpSupportLine.length).toBeGreaterThan(0);
      expect(m.helpPasswordLine.length).toBeGreaterThan(0);
      expect(m.noSurface).toContain("cam@patalignhq.com"); // pattern box B2 (P7): the monitored address
    }
  });

  it("the two baseline controls leave by ruling", () => {
    const rulings = JSON.parse(read("ops/qa/link-removals.json")) as Array<{ route: string; control: string; ledgerLine: string }>;
    const local = rulings.find((r) => r.control === "Review local auth setup");
    const reset = rulings.find((r) => r.control === "Reset local auth state");
    expect(local?.route).toBe("*");
    expect(local?.ledgerLine).toContain("hotfix-demo-1");
    expect(reset?.route).toBe("/sign-in?view=help");
    expect(reset?.ledgerLine).toContain("audit P1");
  });
});
