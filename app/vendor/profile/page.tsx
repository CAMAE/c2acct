import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { CompanyProfileSettingsFields } from "@/app/components/profile/ProfileSettingsFields";
import { getCompanyProfileSettings, saveCompanyProfileSettings } from "@/lib/profileSettingsStore";
import prisma from "@/lib/prisma";
import { buildVendorExternalProfileContract } from "@/lib/vendorProfileAdapter";
import { ensureVendorProfileForCompany, getVendorCompanyContext } from "@/lib/vendorPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Profile | C2Acct",
  description: "Editable vendor profile and future integration contract.",
};

export default async function VendorProfilePage() {
  const sessionUser = await getSessionUser();
  const vendorContext = await getVendorCompanyContext(sessionUser?.companyId);

  async function updateVendorProfile(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    const liveContext = await getVendorCompanyContext(actor?.companyId);
    if (!actor || liveContext.company?.type !== "VENDOR") {
      redirect("/sign-in/vendor");
    }

    const companyName = String(formData.get("companyName") ?? "").trim() || liveContext.company.name;
    const website = String(formData.get("website") ?? "").trim();
    const settings = {
      companyName,
      contactName: String(formData.get("contactName") ?? "").trim(),
      workEmail: String(formData.get("workEmail") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      businessAddress: String(formData.get("businessAddress") ?? "").trim(),
      paymentDetails: String(formData.get("paymentDetails") ?? "").trim(),
      companyDescription: String(formData.get("companyDescription") ?? "").trim(),
      website,
    };
    const profile = await ensureVendorProfileForCompany(liveContext.company);

    await prisma.company.update({
      where: { id: liveContext.company.id },
      data: {
        name: companyName,
        updatedAt: new Date(),
      },
    });

    await prisma.vendorProfile.update({
      where: { id: profile.id },
      data: {
        displayName: companyName,
        website: website || null,
        notes: settings.companyDescription || null,
        updatedAt: new Date(),
      },
    });

    await saveCompanyProfileSettings(`vendor:${liveContext.company.id}`, settings);

    redirect("/vendor/profile");
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
        <div className="pat-label">Vendor profile</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          General, editable, and integration-ready
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This profile is the clean vendor-facing contract inside PAT. It is editable in the app now and designed to receive future data from the c2acct.com / six-site connection when the real adapter is available.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="pat-card p-6">
          <div className="pat-label">Profile editor</div>
          {vendorContext.company?.type !== "VENDOR" ? (
            <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
              Sign in with a vendor-linked account to edit the live vendor profile.
            </div>
          ) : (
            <form action={updateVendorProfile} className="mt-4 grid gap-4">
              <CompanyProfileSettingsFields defaults={profileSettings} />
              <div>
                <button type="submit" className="pat-button-primary">
                  Save vendor profile
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="pat-card p-6">
        <div className="pat-label">External data contract</div>
          <div className="mt-4 max-h-[24rem] overflow-auto rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
            <pre className="text-xs leading-6 text-[var(--shell-muted)] whitespace-pre-wrap break-words">
              {JSON.stringify(contract, null, 2)}
            </pre>
          </div>
          <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            Source is currently manual app entry. Future sync should update this contract instead of pretending a live connection already exists.
          </div>
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Products in profile</div>
        <div className="mt-4 grid gap-3">
          {vendorContext.products.map((product) => (
            <div key={product.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-4">
              <div className="font-semibold text-[var(--shell-ink)]">{product.name}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                {product.summary ?? "No summary yet."}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link className="pat-button-secondary" href="/vendor/admin">
            Open vendor admin
          </Link>
        </div>
      </section>
    </div>
  );
}
