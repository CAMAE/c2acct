import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PortalSurfaceCard from "@/app/components/PortalSurfaceCard";
import PortalAudienceEyebrow from "@/app/components/pat/PortalAudienceEyebrow";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import VendorAdminPanels from "@/app/components/vendor/VendorAdminPanels";
import {
  VendorAdminInlineContent,
  VendorHelpInlineContent,
  VendorMeetPatContent,
  vendorWorkspaceCards,
} from "@/app/components/vendor/VendorPortalContent";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getInviteeAccessContext } from "@/lib/invitee/access";
import { isSalesCardEnabled } from "@/lib/salesCard";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import type { PortalSurface } from "@/lib/portalVisibility";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { getCompanyProfileSettings, saveCompanyProfileSettings } from "@/lib/profileSettingsStore";
import prisma from "@/lib/prisma";
import { buildVendorExternalProfileContract } from "@/lib/vendorProfileAdapter";
import { ensureVendorProfileForCompany, getVendorCompanyContext } from "@/lib/vendorPat";
import {
  buildVendorProductGapCallout,
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor | Patalign",
  description: "Vendor PAT homepage and product flow entry.",
};

type SearchParams = {
  panel?: string;
};

function getPanelHref(panel: "workspace" | "pat" | "admin" | "help") {
  return panel === "workspace" ? "/vendor" : `/vendor?panel=${panel}`;
}

export default async function VendorPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const messages = await getRequestLocaleMessages();
  const activePanel =
    params?.panel === "pat" || params?.panel === "admin" || params?.panel === "help" ? params.panel : "workspace";
  const sessionUser = await getSessionUser();
  const inviteeAccess = !sessionUser ? await getInviteeAccessContext() : null;
  const vendorContext = await getVendorCompanyContext(
    sessionUser?.companyId ?? (inviteeAccess?.audience === "vendor" ? inviteeAccess.companyId : null)
  );
  const panelOptions = [
    { key: "workspace", label: messages.common.workspace, href: getPanelHref("workspace") },
    { key: "pat", label: messages.nav.meet_pat, href: getPanelHref("pat") },
    { key: "admin", label: messages.common.admin, href: getPanelHref("admin") },
    { key: "help", label: messages.common.help, href: getPanelHref("help") },
  ] as const;
  const needsAdminContent = activePanel === "admin";

  async function saveProfile(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    const liveInviteeAccess = !actor ? await getInviteeAccessContext() : null;
    const liveContext = await getVendorCompanyContext(
      actor?.companyId ?? (liveInviteeAccess?.audience === "vendor" ? liveInviteeAccess.companyId : null)
    );
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

  const baseCards = vendorWorkspaceCards
    // R5: the Sales Card entry only appears while the sales-card flag is on.
    .filter((card) => card.id !== "vendor-sales-card" || isSalesCardEnabled())
    .map((card) => ({
      ...card,
      title: messages.portal.cards.vendor[card.id]?.title ?? card.title,
      description: messages.portal.cards.vendor[card.id]?.description ?? card.description,
    }));

  // Elite Insights entry on the portal home (Block 4): a live card for Elite
  // viewers (opens the Elite tab in ≤2 clicks) and an upgrade-tease card for Pro.
  const vendorEliteEntitlement = sessionUser
    ? await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.ELITE)
    : null;
  const eliteInsightsCard: PortalSurface = {
    id: "vendor-elite-insights",
    audience: ["vendor"],
    section: "intelligence",
    title: "Elite Insights",
    description: vendorEliteEntitlement?.allowed
      ? "Live — benchmark comparison, future demand, and an expansion simulation, grounded in current firm-reviewed evidence."
      : "Unlock benchmark comparison, future demand, and an expansion simulation, grounded in current firm-reviewed evidence.",
    href: vendorEliteEntitlement?.allowed
      ? "/vendor/alignment-insights?mode=elite"
      : (vendorEliteEntitlement?.upgradeHref ?? "/vendor/membership"),
    availability: "enabled",
    reason: vendorEliteEntitlement?.allowed ? "Live with Elite membership" : "Requires Elite membership",
  };
  const localizedCards = [...baseCards, eliteInsightsCard];

  // Products-at-a-glance numbers are Pro-packaged signal, so the strip only
  // renders for an entitled vendor session — baseline vendors keep the
  // count-only context card and the explicit upgrade path.
  let glanceSnapshots: VendorProductInsightSnapshot[] = [];
  if (activePanel === "workspace" && sessionUser?.companyId) {
    const entitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.PRO);
    if (entitlement.allowed) {
      glanceSnapshots = await getVendorProductInsightCatalog(sessionUser.companyId);
    }
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <PortalAudienceEyebrow
          className="pat-label mt-6"
          label={messages.portal.vendor.eyebrow}
          audienceLabel={messages.nav.vendor}
        />
        <PatAudienceTitle
          as="h1"
          title={messages.portal.vendor.title}
          audienceTerms={[messages.nav.vendor]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
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
              profileSettings={profileSettings}
              saveProfile={saveProfile}
            />
          ) : null}
        </div>
      ) : activePanel === "help" ? (
        <VendorHelpInlineContent />
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {localizedCards.map((card) => (
              <PortalSurfaceCard key={card.id} surface={card} />
            ))}
          </section>

          {glanceSnapshots.length > 0 ? (
            <section className="pat-card p-6">
              <div className="pat-label">Products at a glance</div>
              {vendorContext.products.length > glanceSnapshots.length ? (
                // Reconcile with the "Products: N" context count — the glance
                // only shows products with a completed self-assessment, so the
                // remainder isn't dropped, it just hasn't been assessed yet.
                <p className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
                  {glanceSnapshots.length} of {vendorContext.products.length} products have a completed self-assessment. The rest appear here once assessed.
                </p>
              ) : null}
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {glanceSnapshots.map((snapshot) => {
                  const vendorScore = snapshot.vendorSelfReported.latestScore;
                  const firmScore = snapshot.firmReviewed.averageScore;
                  const gapCallout = buildVendorProductGapCallout(snapshot);
                  return (
                    <Link
                      key={snapshot.product.id}
                      href={`/vendor/product-insight/${snapshot.product.id}`}
                      className="pat-soft-panel pat-soft-panel-interactive block p-4"
                    >
                      <div className="font-semibold text-[var(--shell-ink)]">{snapshot.product.name}</div>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm tabular-nums text-[var(--shell-muted)]">
                        <span>
                          <span className="pat-stat-number">
                            {vendorScore === null ? "—" : `${Math.round(vendorScore)}%`}
                          </span>{" "}
                          self-reported
                        </span>
                        <span>
                          <span className="pat-stat-number">
                            {firmScore === null ? "—" : `${Math.round(firmScore)}%`}
                          </span>{" "}
                          firm-reviewed
                        </span>
                      </div>
                      {gapCallout.points !== null ? (
                        <p className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">{gapCallout.label}</p>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="pat-card p-6">
            <div className="pat-label">{messages.portal.vendor.currentVendorContext}</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                {messages.portal.vendor.account}: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser?.email ?? inviteeAccess?.label ?? messages.common.notSignedIn}</span>
              </div>
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                {messages.portal.vendor.vendorCompany}: <span className="font-semibold text-[var(--shell-ink)]">{vendorContext.company?.name ?? messages.common.unbound}</span>
              </div>
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                {messages.portal.vendor.products}: <span className="font-semibold text-[var(--shell-ink)]">{vendorContext.products.length}</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
