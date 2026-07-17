import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import HeroChips from "@/app/components/pat/HeroChips";
import PortalSurfaceCard from "@/app/components/PortalSurfaceCard";
import PortalAudienceEyebrow from "@/app/components/pat/PortalAudienceEyebrow";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import FirmAdminPanels from "@/app/components/firm/FirmAdminPanels";
import {
  FirmAdminInlineContent,
  FirmHelpInlineContent,
  FirmMeetPatContent,
  firmWorkspaceCards,
} from "@/app/components/firm/FirmPortalContent";
import { isAlignmentBoardEnabled } from "@/lib/alignmentBoard";
import { getSessionUser } from "@/lib/auth/session";
import { getFirmAssessmentProgress } from "@/lib/firmPat";
import { getInviteeAccessContext } from "@/lib/invitee/access";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { getCompanyProfileSettings, saveCompanyProfileSettings } from "@/lib/profileSettingsStore";
import prisma from "@/lib/prisma";
import { ensureUserPatScaffold, getFirmManagedUserRecords } from "@/lib/userPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm | Patalign",
  description: "Firm PAT homepage and flow entry.",
};

type SearchParams = {
  panel?: string;
};

function getPanelHref(panel: "workspace" | "pat" | "admin" | "help") {
  return panel === "workspace" ? "/firm" : `/firm?panel=${panel}`;
}

export default async function FirmPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const messages = await getRequestLocaleMessages();
  const individualSurfacesEnabled = isIndividualSurfacesEnabled();
  const activePanel =
    params?.panel === "pat" || params?.panel === "admin" || params?.panel === "help" ? params.panel : "workspace";
  const sessionUser = await getSessionUser();
  const inviteeAccess = !sessionUser ? await getInviteeAccessContext() : null;
  const companyId =
    sessionUser?.companyId ?? (inviteeAccess?.audience === "firm" ? inviteeAccess.companyId : null);
  const company = companyId
    ? await prisma.company
        .findUnique({
          where: { id: companyId },
          select: {
            id: true,
            name: true,
            type: true,
            User: activePanel === "admin"
              ? {
                  orderBy: { email: "asc" },
                  select: { id: true, email: true, role: true, name: true },
                }
              : false,
            Product: activePanel === "admin"
              ? {
                  orderBy: { name: "asc" },
                  select: { id: true, name: true },
                }
              : false,
          },
        })
        .catch(() => null)
    : null;

  const moduleProgress = company?.type === "FIRM" ? await getFirmAssessmentProgress(company.id) : [];
  const completedModules = moduleProgress.filter((module) => module.latestSubmittedAt).length;
  const panelOptions = [
    { key: "workspace", label: messages.common.workspace, href: getPanelHref("workspace") },
    { key: "pat", label: messages.nav.meet_pat, href: getPanelHref("pat") },
    { key: "admin", label: messages.common.admin, href: getPanelHref("admin") },
    { key: "help", label: messages.common.help, href: getPanelHref("help") },
  ] as const;
  const needsAdminContent = activePanel === "admin" && company?.type === "FIRM";
  const adminCompany = company?.type === "FIRM" ? company : null;

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
      redirect("/firm?panel=admin");
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

    redirect("/firm?panel=admin");
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
      redirect("/firm?panel=admin");
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

    redirect("/firm?panel=admin");
  }

  if (needsAdminContent) {
    await ensureUserPatScaffold();
  }

  const userInsight = needsAdminContent && adminCompany ? await getFirmManagedUserRecords(adminCompany.id, null) : [];
  const profileSettings = needsAdminContent
    && adminCompany
    ? await getCompanyProfileSettings(`firm:${adminCompany.id}`, {
        companyName: adminCompany.name,
        contactName: "",
        workEmail: sessionUser?.email ?? "",
        phone: "",
        businessAddress: "",
        paymentDetails: "",
        companyDescription: "",
        website: "",
      })
    : null;
  const localizedCards = firmWorkspaceCards
    // R4: the Alignment Sandbox card only appears while the board flag is on.
    .filter((card) => card.id !== "firm-alignment-sandbox" || isAlignmentBoardEnabled())
    .map((card) => ({
      ...card,
      title: messages.portal.cards.firm[card.id]?.title ?? card.title,
      description: messages.portal.cards.firm[card.id]?.description ?? card.description,
    }));
  // Elite Insights v2: reached ONLY via the Insights tab toggle (no portal-home
  // card — the v1 duplicate was navigation noise, removed per the v2 verdict §4).

  return (
    <div className="space-y-8">
      <section className="pat-card relative p-8">
        <HeroChips audience="firm" />
        <PatLogoLockup mode="hero" tone="light" />
        <PortalAudienceEyebrow
          className="pat-label mt-6"
          label={messages.portal.firm.eyebrow}
          audienceLabel={messages.nav.firm}
        />
        <PatAudienceTitle
          as="h1"
          title={messages.portal.firm.title}
          audienceTerms={[messages.nav.firm]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {messages.portal.firm.body}
        </p>
        <div className="mt-6">
          <PortalPanelSelector activeKey={activePanel} options={panelOptions} />
        </div>
      </section>

      {activePanel === "pat" ? (
        <FirmMeetPatContent />
      ) : activePanel === "admin" ? (
        <div className="space-y-6">
          <FirmAdminInlineContent />
          {profileSettings ? (
            <FirmAdminPanels
              individualSurfacesEnabled={individualSurfacesEnabled}
              inviteUser={inviteUser}
              profileSettings={profileSettings}
              saveFirmProfile={saveFirmProfile}
              userInsight={userInsight}
            />
          ) : null}
        </div>
      ) : activePanel === "help" ? (
        <FirmHelpInlineContent />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.firm.account}: <span className="font-semibold text-[var(--shell-ink)]">{company?.name ?? inviteeAccess?.companyName ?? messages.common.unbound}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.firm.modulesCompleted}: <span className="font-semibold text-[var(--shell-ink)]">{completedModules} / 5</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.firm.productReviewLoop}:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">
                Opens when vendor product assessment is complete
              </span>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {localizedCards.map((card) => (
              <PortalSurfaceCard key={card.id} surface={card} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
