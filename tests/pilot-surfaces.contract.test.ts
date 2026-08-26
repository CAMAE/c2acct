import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isInviteeAccessEnabled } from "@/lib/invitee/access";
import {
  getPilotDisabledMessage,
  isIndividualSurfacesEnabled,
  isInviteeSurfacesEnabled,
} from "@/lib/pilotSurfaces";
import { getPublicOnboardingHomeCards, isPublicOnboardingAudienceEnabled } from "@/lib/publicOnboarding";

// Repo root, resolved at run time — vitest runs from the project root.
// A hardcoded absolute path breaks the suite for every other machine (RK20).
const ROOT = process.cwd();

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  };
}

describe("pilot surface flags", () => {
  it("defaults individual and invitee surfaces off until explicitly enabled", () => {
    expect(isIndividualSurfacesEnabled(testEnv())).toBe(false);
    expect(isInviteeSurfacesEnabled(testEnv())).toBe(false);
    expect(isIndividualSurfacesEnabled(testEnv({ PAT_ENABLE_INDIVIDUAL_SURFACES: "1" }))).toBe(true);
    expect(isInviteeSurfacesEnabled(testEnv({ PAT_ENABLE_INVITEE_SURFACES: "1" }))).toBe(true);
  });

  it("keeps invitee access behind both the old access flag and the pilot surface flag", () => {
    const previousSurfaces = process.env.PAT_ENABLE_INVITEE_SURFACES;
    const previousAccess = process.env.PAT_ENABLE_INVITEE_ACCESS;

    try {
      delete process.env.PAT_ENABLE_INVITEE_SURFACES;
      process.env.PAT_ENABLE_INVITEE_ACCESS = "1";
      expect(isInviteeAccessEnabled()).toBe(false);

      process.env.PAT_ENABLE_INVITEE_SURFACES = "1";
      expect(isInviteeAccessEnabled()).toBe(true);
    } finally {
      if (typeof previousSurfaces === "string") {
        process.env.PAT_ENABLE_INVITEE_SURFACES = previousSurfaces;
      } else {
        delete process.env.PAT_ENABLE_INVITEE_SURFACES;
      }

      if (typeof previousAccess === "string") {
        process.env.PAT_ENABLE_INVITEE_ACCESS = previousAccess;
      } else {
        delete process.env.PAT_ENABLE_INVITEE_ACCESS;
      }
    }
  });

  it("hides public user onboarding by default while preserving the enabled path", () => {
    expect(isPublicOnboardingAudienceEnabled("user", testEnv())).toBe(false);
    expect(getPublicOnboardingHomeCards(testEnv()).map((card) => card.audience)).toEqual(["vendor", "firm"]);
    expect(getPublicOnboardingHomeCards(testEnv({ PAT_ENABLE_INDIVIDUAL_SURFACES: "1" })).map((card) => card.audience)).toEqual([
      "vendor",
      "firm",
      "user",
    ]);
  });

  it("keeps direct user routes behind a pilot-disabled guard", () => {
    const userLayout = readFileSync(path.join(ROOT, "app/(app)/user/layout.tsx"), "utf8");
    const userSignIn = readFileSync(path.join(ROOT, "app/(public)/sign-in/user/page.tsx"), "utf8");
    const inviteeSignIn = readFileSync(path.join(ROOT, "app/(public)/sign-in/invitee/page.tsx"), "utf8");

    expect(userLayout).toContain("isIndividualSurfacesEnabled");
    expect(userLayout).toContain('getPilotDisabledSignInPath("individual")');
    expect(userSignIn).toContain('getPilotDisabledSignInPath("individual")');
    expect(inviteeSignIn).toContain('getPilotDisabledSignInPath("invitee")');
    expect(getPilotDisabledMessage("individual")).toMatch(/shelved/i);
    expect(getPilotDisabledMessage("invitee")).toMatch(/shelved/i);
  });
});
