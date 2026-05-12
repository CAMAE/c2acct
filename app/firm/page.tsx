import { redirect } from "next/navigation";
import PortalSurfaceCard from "@/app/components/PortalSurfaceCard";
import MembershipPageShell from "@/app/components/membership/MembershipPageShell";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import FirmAdminPanels from "@/app/components/firm/FirmAdminPanels";
import {
  FirmAdminInlineContent,
  FirmHelpInlineContent,
  FirmMeetPatContent,
  firmWorkspaceCards,
} from "@/app/components/firm/FirmPortalContent";
import { getSessionUser } from "@/lib/auth/session";
import { buildFirmExternalProfileContract, getFirmAssessmentProgress } from "@/lib/firmPat";
import { canAccessPortalAdmin } from "@/lib/authz";
import { resolveCurrentMembership } from "@/lib/membership";
import { getDefaultMembershipTab } from "@/lib/membershipContent";
import { buildPortalPanelOptions, normalizePortalPanel } from "@/lib/portalPanels";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { getCompanyProfileSettings, saveCompanyProfileSettings } from "@/lib/profileSettingsStore";
import prisma from "@/lib/prisma";
import { ensureUserPatScaffold } from "@/lib/userPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm | C2Acct",
  description: "Firm PAT homepage and flow entry.",
};

type SearchParams = {
  panel?: string;
};

export default async function FirmPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const messages = await getRequestLocaleMessages();
  const activePanel = normalizePortalPanel(params?.panel);
  const sessionUser = await getSessionUser();
  const companyId = sessionUser?.companyId ?? null;
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
  const panelOptions = buildPortalPanelOptions({
    basePath: "/firm",
    workspaceLabel: messages.common.workspace,
    meetPatLabel: messages.nav.meet_pat,
    adminLabel: messages.common.admin,
    helpLabel: messages.common.help,
    membershipLabel: "Membership",
  });
  const needsAdminContent = activePanel === "admin" && company?.type === "FIRM";
  const adminCompany = company?.type === "FIRM" ? company : null;
  const membershipState = sessionUser ? await resolveCurrentMembership(sessionUser, "firm") : null;

  if (activePanel === "membership" && !sessionUser) {
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

  if (needsAdminContent) {
    await ensureUserPatScaffold();
  }

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
  const contract = profileSettings
    ? buildFirmExternalProfileContract({
        companyName: profileSettings.companyName,
        contactName: profileSettings.contactName || null,
        workEmail: profileSettings.workEmail || null,
        phone: profileSettings.phone || null,
        businessAddress: profileSettings.businessAddress || null,
        paymentDetails: profileSettings.paymentDetails || null,
        companyDescription: profileSettings.companyDescription || null,
        users: adminCompany ? adminCompany.User.map((user) => ({
          email: user.email,
          role: user.role,
          status: user.name ? "active" : "invited",
        })) : [],
        productsUnderReview: adminCompany ? adminCompany.Product.map((product) => product.name) : [],
      })
    : null;

  const localizedCards = firmWorkspaceCards.map((card) => ({
    ...card,
    title: messages.portal.cards.firm[card.id]?.title ?? card.title,
    description: messages.portal.cards.firm[card.id]?.description ?? card.description,
  }));

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{messages.portal.firm.eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {messages.portal.firm.title}
        </h1>
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
        !canAccessPortalAdmin(sessionUser) ? (
          redirect("/firm")
        ) : (
        <div className="space-y-6">
          <FirmAdminInlineContent />
          {profileSettings && contract ? (
            <FirmAdminPanels
              contract={contract}
              profileSettings={profileSettings}
              saveFirmProfile={saveFirmProfile}
              userCount={adminCompany?.User.length ?? 0}
              activeUserCount={adminCompany?.User.filter((user) => Boolean(user.name)).length ?? 0}
            />
          ) : null}
        </div>
        )
      ) : activePanel === "membership" && membershipState ? (
        <MembershipPageShell
          audience="firm"
          billingSummary={membershipState.membership.billingSummary}
          currentPlan={membershipState.membership.plan}
          currentStatus={membershipState.membership.status}
          displayName={membershipState.membership.displayName}
          initialTab={getDefaultMembershipTab(membershipState.membership.plan)}
        />
      ) : activePanel === "help" ? (
        <FirmHelpInlineContent />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.firm.account}: <span className="font-semibold text-[var(--shell-ink)]">{company?.name ?? messages.common.unbound}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.firm.modulesCompleted}: <span className="font-semibold text-[var(--shell-ink)]">{completedModules} / 5</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.portal.firm.productReviewLoop}: <span className="font-semibold text-[var(--shell-ink)]">{messages.portal.firm.live}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.common.admin}: <span className="font-semibold text-[var(--shell-ink)]">PAT firm profile and access management</span>
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
