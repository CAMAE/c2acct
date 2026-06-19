import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import MembershipCard from "@/app/components/membership/MembershipCard";
import FirmAdminPanels from "@/app/components/firm/FirmAdminPanels";
import { firmAdminHelpCards } from "@/app/components/firm/FirmPortalContent";
import { canAccessPortalAdmin } from "@/lib/authz";
import { getCompanyProfileSettings, saveCompanyProfileSettings } from "@/lib/profileSettingsStore";
import { resolveCurrentMembership } from "@/lib/membership";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import prisma from "@/lib/prisma";
import { buildFirmExternalProfileContract } from "@/lib/firmPat";
import { ensureUserPatScaffold, getFirmManagedUserRecords } from "@/lib/userPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Admin | Patalign",
  description: "Simple firm admin, profile, and user insight surface.",
};

export default async function FirmAdminPage() {
  const individualSurfacesEnabled = isIndividualSurfacesEnabled();
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }

  await ensureUserPatScaffold();

  const company = await prisma.company.findUnique({
    where: { id: sessionUser.companyId },
    select: {
      id: true,
      name: true,
      type: true,
      User: {
        orderBy: { email: "asc" },
        select: { id: true, email: true, role: true, name: true },
      },
      Product: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  }).catch(() => null);

  if (!company || company.type !== "FIRM") {
    redirect("/sign-in/firm");
  }
  const membershipState = await resolveCurrentMembership(sessionUser, "firm");

  async function saveFirmProfile(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor?.companyId) {
      redirect("/sign-in/firm");
    }

    const liveCompany = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { id: true, type: true },
    }).catch(() => null);
    if (!liveCompany || liveCompany.type !== "FIRM") {
      redirect("/sign-in/firm");
    }

    const name = String(formData.get("companyName") ?? "").trim();
    if (!name) {
      redirect("/firm/admin");
    }

    await prisma.company.update({
      where: { id: liveCompany.id },
      data: {
        name,
        updatedAt: new Date(),
      },
    });

    await saveCompanyProfileSettings(`firm:${liveCompany.id}`, {
      companyName: name,
      contactName: String(formData.get("contactName") ?? "").trim(),
      workEmail: String(formData.get("workEmail") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      businessAddress: String(formData.get("businessAddress") ?? "").trim(),
      paymentDetails: String(formData.get("paymentDetails") ?? "").trim(),
      companyDescription: String(formData.get("companyDescription") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim(),
    });

    redirect("/firm/admin");
  }

  async function inviteUser(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor?.companyId) {
      redirect("/sign-in/firm");
    }

    const liveCompany = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { id: true, type: true },
    }).catch(() => null);
    if (!liveCompany || liveCompany.type !== "FIRM") {
      redirect("/sign-in/firm");
    }

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = String(formData.get("role") ?? "").trim();
    if (!email || !["OWNER", "ADMIN", "MEMBER"].includes(role)) {
      redirect("/firm/admin");
    }

    await prisma.user.upsert({
      where: { email },
      update: {
        companyId: liveCompany.id,
        role: role as "OWNER" | "ADMIN" | "MEMBER",
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        email,
        role: role as "OWNER" | "ADMIN" | "MEMBER",
        companyId: liveCompany.id,
        updatedAt: new Date(),
      },
    });

    redirect("/firm/admin");
  }

  const userInsight = await getFirmManagedUserRecords(company.id, null);
  const profileSettings = await getCompanyProfileSettings(`firm:${company.id}`, {
    companyName: company.name,
    contactName: "",
    workEmail: sessionUser.email,
    phone: "",
    businessAddress: "",
    paymentDetails: "",
    companyDescription: "",
    website: "",
  });
  const contract = buildFirmExternalProfileContract({
    companyName: profileSettings.companyName,
    contactName: profileSettings.contactName || null,
    workEmail: profileSettings.workEmail || null,
    phone: profileSettings.phone || null,
    businessAddress: profileSettings.businessAddress || null,
    paymentDetails: profileSettings.paymentDetails || null,
    companyDescription: profileSettings.companyDescription || null,
    users: company.User.map((user) => ({
      email: user.email,
      role: user.role,
      status: user.name ? "active" : "invited",
    })),
    productsUnderReview: company.Product.map((product) => product.name),
  });

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Firm admin</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Profile and management without operator clutter
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This page blends simple profile management, team entry, and future integration readiness into one restrained firm admin surface.
        </p>
      </section>

      <section className="pat-card p-6">
        <MembershipCard
          audienceLabel="firm"
          href="/firm/membership"
          plan={membershipState.membership.plan}
          status={membershipState.membership.status}
        />
        {canAccessPortalAdmin(sessionUser) ? (
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            Platform-wide operator controls now sit in <a className="font-semibold text-[var(--shell-accent)]" href="/admin">/admin</a>. Keep this firm admin page focused on firm-owned profile and team tasks.
          </p>
        ) : null}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Admin help</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {firmAdminHelpCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5"
            >
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-muted)]">
                <div>
                  <span className="font-semibold text-[var(--shell-ink)]">What:</span> {card.what}
                </div>
                <div>
                  <span className="font-semibold text-[var(--shell-ink)]">When:</span> {card.when}
                </div>
                <div>
                  <span className="font-semibold text-[var(--shell-ink)]">Why:</span> {card.why}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <FirmAdminPanels
        contract={contract}
        individualSurfacesEnabled={individualSurfacesEnabled}
        inviteUser={inviteUser}
        profileSettings={profileSettings}
        saveFirmProfile={saveFirmProfile}
        userInsight={userInsight}
      />
    </div>
  );
}
