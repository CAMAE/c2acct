import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import FirmAdminPanels from "@/app/components/firm/FirmAdminPanels";
import { firmAdminHelpCards } from "@/app/components/firm/FirmPortalContent";
import { canAccessPortalAdmin } from "@/lib/authz";
import { requireFirmAdminActor } from "@/lib/firmAdminAccess";
import { getCompanyProfileSettings, saveCompanyProfileSettings } from "@/lib/profileSettingsStore";
import prisma from "@/lib/prisma";
import { buildFirmExternalProfileContract } from "@/lib/firmPat";
import { ensureUserPatScaffold } from "@/lib/userPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Admin | C2Acct",
  description: "Firm PAT profile and access-management surface.",
};

export default async function FirmAdminPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }
  if (!canAccessPortalAdmin(sessionUser)) {
    redirect("/firm");
  }

  await ensureUserPatScaffold();
  const adminCompany = await requireFirmAdminActor(sessionUser);
  if (!adminCompany) {
    redirect("/sign-in/firm");
  }

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

  const company = await prisma.company.findUnique({
    where: { id: adminCompany.id },
    select: {
      id: true,
      name: true,
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
  if (!company) {
    redirect("/firm");
  }

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
  const userCount = company.User.length;
  const activeUserCount = company.User.filter((user) => Boolean(user.name)).length;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Firm admin</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Profile and management without operator clutter
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This page keeps firm profile management, PAT access management, and future integration readiness together without turning admin into a generic back office.
        </p>
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
        profileSettings={profileSettings}
        saveFirmProfile={saveFirmProfile}
        userCount={userCount}
        activeUserCount={activeUserCount}
      />
    </div>
  );
}
