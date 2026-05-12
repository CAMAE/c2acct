import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import VendorAdminPanels from "@/app/components/vendor/VendorAdminPanels";
import { vendorAdminHelpCards } from "@/app/components/vendor/VendorPortalContent";
import { canAccessPortalAdmin } from "@/lib/authz";
import { getCompanyProfileSettings, saveCompanyProfileSettings } from "@/lib/profileSettingsStore";
import prisma from "@/lib/prisma";
import { buildVendorExternalProfileContract } from "@/lib/vendorProfileAdapter";
import { ensureVendorProfileForCompany, getVendorCompanyContext } from "@/lib/vendorPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Admin | C2Acct",
  description: "Simple vendor admin and profile-management surface.",
};

export default async function VendorAdminPage() {
  const sessionUser = await getSessionUser();
  const vendorContext = await getVendorCompanyContext(sessionUser?.companyId);
  if (!sessionUser || vendorContext.company?.type !== "VENDOR") {
    redirect("/sign-in/vendor");
  }

  async function saveProfile(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    const liveContext = await getVendorCompanyContext(actor?.companyId);
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

    redirect("/vendor/admin");
  }

  async function createProduct(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    const liveContext = await getVendorCompanyContext(actor?.companyId);
    if (!actor || liveContext.company?.type !== "VENDOR") {
      redirect("/sign-in/vendor");
    }

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      redirect("/vendor/admin");
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

    redirect("/vendor/admin");
  }

  const profileSettings = await getCompanyProfileSettings(`vendor:${vendorContext.company?.id ?? "unbound"}`, {
    companyName: vendorContext.vendorProfile?.displayName ?? vendorContext.company?.name ?? "Vendor",
    contactName: "",
    workEmail: sessionUser?.email ?? "",
    phone: "",
    businessAddress: "",
    paymentDetails: "",
    companyDescription: vendorContext.vendorProfile?.notes ?? "",
    website: vendorContext.vendorProfile?.website ?? "",
  });

  const contract = buildVendorExternalProfileContract({
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
  });

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Vendor admin</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Simple admin and profile management
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This page stays deliberately light. It supports current profile management, product list management, and future external sync readiness without becoming an overwhelming backend.
        </p>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Membership</div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
          Membership now lives as a first-class portal panel. Use{" "}
          <a className="font-semibold text-[var(--shell-accent)]" href="/vendor?panel=membership">
            vendor membership
          </a>{" "}
          when you need current tier, help, or payment-processing actions.
        </p>
        {canAccessPortalAdmin(sessionUser) ? (
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            Platform-wide operator controls now live in <a className="font-semibold text-[var(--shell-accent)]" href="/admin">/admin</a>. Keep this vendor admin page focused on vendor-owned profile and product tasks.
          </p>
        ) : null}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Admin help</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {vendorAdminHelpCards.map((card) => (
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

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <VendorAdminPanels
          contract={contract}
          createProduct={createProduct}
          profileSettings={profileSettings}
          products={vendorContext.products}
          saveProfile={saveProfile}
        />
      </section>
    </div>
  );
}
