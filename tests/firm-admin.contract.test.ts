import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FirmAdminPanels from "@/app/components/firm/FirmAdminPanels";
import FirmManagedUserCard from "@/app/components/firm/FirmManagedUserCard";
import {
  FirmAdminUserSchema,
  getFirmAdminUserConflictMessage,
  type FirmAdminManagedUser,
} from "@/lib/firmAdminAccess";

describe("firm admin access management contracts", () => {
  it("validates the dedicated add-user payload and rejects incomplete submissions", () => {
    expect(
      FirmAdminUserSchema.safeParse({
        name: "Pat User",
        email: "pat@firm.com",
        phone: "555-111-2222",
        title: "Operations Lead",
        role: "ADMIN",
        department: "Operations",
        onboardingNote: "PAT rollout owner",
      }).success
    ).toBe(true);

    expect(
      FirmAdminUserSchema.safeParse({
        name: "",
        email: "pat@firm.com",
        phone: "",
        title: "",
        role: "ADMIN",
      }).success
    ).toBe(false);
  });

  it("returns explicit duplicate-handling guidance", () => {
    expect(getFirmAdminUserConflictMessage("firm-1", "firm-1")).toMatch(/already exists for the firm/i);
    expect(getFirmAdminUserConflictMessage("firm-2", "firm-1")).toMatch(/another company account/i);
  });

  it("renders the chooser and existing-user state clearly", () => {
    const chooserHtml = renderToStaticMarkup(
      FirmAdminPanels({
        contract: { ok: true },
        profileSettings: {
          companyName: "Firm One",
          contactName: "",
          workEmail: "",
          phone: "",
          businessAddress: "",
          paymentDetails: "",
          companyDescription: "",
          website: "",
        },
        saveFirmProfile: async () => {},
        userCount: 3,
        activeUserCount: 2,
      })
    );

    const user: FirmAdminManagedUser = {
      id: "user-1",
      email: "pat@firm.com",
      name: null,
      role: "ADMIN",
      status: "invited",
      phone: null,
      title: null,
      department: null,
      onboardingNote: null,
      assessmentProgress: "No person-level PAT submissions yet",
      latestScore: null,
      latestSubmittedAt: null,
      subjectMembershipReady: false,
    };

    const userHtml = renderToStaticMarkup(FirmManagedUserCard({ user }));

    expect(chooserHtml).toContain("Existing Users");
    expect(chooserHtml).toContain("Add User");
    expect(chooserHtml).toContain("Total users:");
    expect(userHtml).toContain("Profile name missing");
    expect(userHtml).toContain("Role:");
    expect(userHtml).toContain("invited");
    expect(userHtml).toContain("Phone:");
  });
});
