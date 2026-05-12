import { randomUUID } from "crypto";
import PortalSurfaceCard from "@/app/components/PortalSurfaceCard";
import MembershipPageShell from "@/app/components/membership/MembershipPageShell";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import VendorAdminPanels from "@/app/components/vendor/VendorAdminPanels";
import {
  VendorAdminInlineContent,
  VendorHelpInlineContent,
  VendorMeetPatContent,
  vendorWorkspaceCards,
} from "@/app/components/vendor/VendorPortalContent";
import { getSessionUser } from "@/lib/auth/session";
import { resolveCurrentMembership } from "@/lib/membership";
import { formatMembershipValue, getDefaultMembershipTab } from "@/lib/membershipContent";
import { buildPortalPanelOptions, normalizePortalPanel } from "@/lib/portalPanels";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { getCompanyProfileSettings, saveCompanyProfileSettings } from "@/lib/profileSettingsStore";
import prisma from "@/lib/prisma";
import { buildVendorExternalProfileContract } from "@/lib/vendorProfileAdapter";
import { ensureVendorProfileForCompany, getVendorCompanyContext } from "@/lib/vendorPat";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor | C2Acct",
  description: "Vendor PAT homepage and product flow entry.",
};

type SearchParams = {
  panel?: string;
};

export default async function VendorPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const messages = await getRequestLocaleMessages();
  const activePanel = normalizePortalPanel(params?.panel);
  const sessionUser = await getSessionUser();
  const vendorContext = await getVendorCompanyContext(sessionUser?.companyId ?? null);
  const panelOptions = buildPortalPanelOptions({
    basePath: "/vendor",
    workspaceLabel: messages.common.workspace,
    meetPatLabel: messages.nav.meet_pat,
    adminLabel: messages.common.admin,
    helpLabel: messages.common.help,
    membershipLabel: "Membership",
  });
  const needsAdminContent = activePanel === "admin";
  const membershipState = sessionUser ? await resolveCurrentMembership(sessionUser, "vendor") : null;

  if (activePanel === "membership" && !sessionUser) {
    redirect("/sign-in/vendor");
  }

  async function saveProfile(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    const liveContext = await getVendorCompanyContext(actor?.companyId ?? null);
    if (!actor || liveContext.company?.type !== "VENDOR") {
      redirect("/sign-in/vendor");
    }

    const profile = await ensureVendorProfileForCompany(liveContext.company);
    await prisma.vendorProfile.update({
      where: { id: profile.id },
      data: {
        displayName: String(formData.get("companyName") ?? "").trim() || liveContext.company.name,
        website: String(formData.get("website") ?? "").trim() || null,
        notes: String(formData.get("companyDescription") ?? "").trim() || null,
        updatedAt: new Date(),
      },
    });

    const companyName = String(formData.get("companyName") ?? "").trim() || liveContext.company.name;
    await prisma.company.update({
      where: { id: liveContext.company.id },
      data: {
        name: companyName,
        updatedAt: new Date(),
      },
    });

    await saveCompanyProfileSettings(`vendor:${liveContext.company.id}`, {
      companyName,
      contactName: String(formData.get("contactName") ?? "").trim(),
      workEmail: String(formData.get("workEmail") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      businessAddress: String(formData.get("businessAddress") ?? "").trim(),
      paymentDetails: String(formData.get("paymentDetails") ?? "").trim(),
      companyDescription: String(formData.get("companyDescription") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim(),
    });

    redirect("/vendor?panel=admin");
  }

  async function createProduct(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    const liveContext = await getVendorCompanyContext(actor?.companyId ?? null);
    if (!actor || liveContext.company?.type !== "VENDOR") {
      redirect("/sign-in/vendor");
    }

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      redirect("/vendor?panel=admin");
    }

    const profile = await ensureVendorProfileForCompany(liveContext.company);
    await prisma.product.create({
      data: {
        id: randomUUID(),
        companyId: liveContext.company.id,
        vendorId: profile.id,
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "product"}-${Date.now().toString().slice(-5)}`,
        website: String(formData.get("website") ?? "").trim() || null,
        summary: String(formData.get("summary") ?? "").trim() || null,
        updatedAt: new Date(),
      },
    });

    redirect("/vendor?panel=admin");
  }

  const profileSettings = needsAdminContent
    ? await getCompanyProfileSettings(`vendor:${vendorContext.company?.id ?? "unbound"}`, {
        companyName: vendorContext.vendorProfile?.displayName ?? vendorContext.company?.name ?? "Vendor",
        contactName: "",
        workEmail: sessionUser?.email ?? "",
        phone: "",
        businessAddress: "",
        paymentDetails: "",
        companyDescription: vendorContext.vendorProfile?.notes ?? "",
        website: vendorContext.vendorProfile?.website ?? "",
      })
    : null;
  const contract = profileSettings
    ? buildVendorExternalProfileContract({
        companyName: profileSettings.companyName,
        contactName: profileSettings.contactName || null,
        workEmail: profileSettings.workEmail || null,
        phone: profileSettings.phone || null,
        businessAddress: profileSettings.businessAddress || null,
        paymentDetails: profileSettings.paymentDetails || null,
        companyDescription: profileSettings.companyDescription || null,
        website: profileSettings.website || null,
        products: vendorContext.products.map((product) => ({
          name: product.name,
          slug: product.slug,
          website: product.website,
          summary: product.summary,
        })),
      })
    : null;

  const localizedCards = vendorWorkspaceCards.map((card) => ({
    ...card,
    title: messages.portal.cards.vendor[card.id]?.title ?? card.title,
    description: messages.portal.cards.vendor[card.id]?.description ?? card.description,
  }));

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{messages.portal.vendor.eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {messages.portal.vendor.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {messages.portal.vendor.body}
        </p>
        <div className="mt-6">
          <PortalPanelSelector activeKey={activePanel} options={panelOptions} />
        </div>
        {vendorContext.compatibilityMode ? (
          <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {messages.portal.vendor.compatibilityMode}
          </div>
        ) : null}
      </section>

      {activePanel === "pat" ? (
        <VendorMeetPatContent />
      ) : activePanel === "admin" ? (
        <div className="space-y-6">
          <VendorAdminInlineContent />
          {profileSettings && contract ? (
            <VendorAdminPanels
              contract={contract}
              createProduct={createProduct}
              profileSettings={profileSettings}
              products={vendorContext.products}
              saveProfile={saveProfile}
            />
          ) : null}
        </div>
      ) : activePanel === "membership" && membershipState ? (
        <MembershipPageShell
          audience="vendor"
          billingSummary={membershipState.membership.billingSummary}
          currentPlan={membershipState.membership.plan}
          currentStatus={membershipState.membership.status}
          displayName={membershipState.membership.displayName}
          initialTab={getDefaultMembershipTab(membershipState.membership.plan)}
        />
      ) : activePanel === "help" ? (
        <VendorHelpInlineContent />
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {localizedCards.map((card) => (
              <PortalSurfaceCard key={card.id} surface={card} />
            ))}
          </section>

          <section className="pat-card p-6">
            <div className="pat-label">{messages.portal.vendor.currentVendorContext}</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                {messages.portal.vendor.account}: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser?.email ?? messages.common.notSignedIn}</span>
              </div>
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                {messages.portal.vendor.vendorCompany}: <span className="font-semibold text-[var(--shell-ink)]">{vendorContext.company?.name ?? messages.common.unbound}</span>
              </div>
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                {messages.portal.vendor.products}: <span className="font-semibold text-[var(--shell-ink)]">{vendorContext.products.length}</span>
              </div>
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                Membership: <span className="font-semibold text-[var(--shell-ink)]">{membershipState ? `${formatMembershipValue(membershipState.membership.plan)} / ${formatMembershipValue(membershipState.membership.status)}` : "Sign in to view"}</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
