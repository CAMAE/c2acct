import Link from "next/link";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  VENDOR_PRODUCT_MODULE_KEY,
  deriveProductStatus,
  ensureVendorProfileForCompany,
  extractUtilityKeysFromSignals,
  getVendorCompanyContext,
} from "@/lib/vendorPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Product Assessment | C2Acct",
  description: "Per-product vendor assessment entry for PAT.",
};

export default async function VendorProductAssessmentPage() {
  const sessionUser = await getSessionUser();
  const vendorContext = await getVendorCompanyContext(sessionUser?.companyId);
  const signedIntoVendor = vendorContext.company?.type === "VENDOR";

  async function createProduct(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    const liveContext = await getVendorCompanyContext(actor?.companyId);
    if (!actor || liveContext.company?.type !== "VENDOR") {
      redirect("/sign-in/vendor");
    }

    const name = String(formData.get("name") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();

    if (!name) {
      redirect("/vendor/product-assessment");
    }

    const vendorProfile = await ensureVendorProfileForCompany(liveContext.company);
    await prisma.product.create({
      data: {
        id: randomUUID(),
        companyId: liveContext.company.id,
        vendorId: vendorProfile.id,
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "product"}-${Date.now().toString().slice(-5)}`,
        website: website || null,
        summary: summary || null,
        updatedAt: new Date(),
      },
    });

    redirect("/vendor/product-assessment");
  }

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: VENDOR_PRODUCT_MODULE_KEY },
    select: { id: true },
  }).catch(() => null);

  const productStatuses = moduleRecord
    ? await Promise.all(
        vendorContext.products.map(async (product) => {
          const latestSubmission = await prisma.surveySubmission.findFirst({
            where: {
              companyId: vendorContext.company?.id,
              moduleId: moduleRecord.id,
              Subject: {
                productId: product.id,
              },
            },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              score: true,
              createdAt: true,
              answeredCount: true,
            },
          }).catch(() => null);

          return {
            productId: product.id,
            status: deriveProductStatus({
              latestSubmission,
              utilityKeys: extractUtilityKeysFromSignals(product.signals),
            }),
          };
        })
      )
    : [];

  const statusByProductId = new Map(productStatuses.map((entry) => [entry.productId, entry.status]));

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Vendor product assessment</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Per-product assessment, not one generic vendor form
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Every software product gets its own PAT assessment. The first step is utility declaration. PAT then scales the question bank to 20 questions per selected utility, up to a v1 cap of 4 utilities.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/vendor">
            Back to vendor home
          </Link>
          {!signedIntoVendor ? (
            <Link className="pat-button-primary" href="/sign-in/vendor">
              Sign in as vendor
            </Link>
          ) : null}
        </div>
      </section>

      {!signedIntoVendor ? (
        <section className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
          Sign in with a vendor-linked account to create products and persist product assessments. The route structure is live now, but product-scoped writes remain protected.
        </section>
      ) : (
        <>
          <section className="pat-card p-6">
            <div className="pat-label">Create product</div>
            <form action={createProduct} className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <input name="name" className="pat-input" placeholder="Product name" required />
              <input name="website" className="pat-input" placeholder="Product website" />
              <textarea name="summary" className="pat-textarea lg:col-span-2" rows={3} placeholder="Product summary" />
              <div className="lg:col-span-2">
                <button type="submit" className="pat-button-primary">
                  Add product
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Product list</h2>
              <p className="mt-1 text-sm text-[var(--shell-muted)]">
                Choose a product to declare utilities, run the assessment, and track per-product status.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {vendorContext.products.length === 0 ? (
                <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
                  No vendor products are registered yet. Add the first product above to start the product assessment flow.
                </div>
              ) : (
                vendorContext.products.map((product) => {
                  const status = statusByProductId.get(product.id);
                  return (
                    <Link
                      key={product.id}
                      href={`/vendor/product-assessment/${product.id}`}
                      className="pat-card pat-card-interactive block rounded-[24px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xl font-semibold text-[var(--shell-ink)]">{product.name}</div>
                          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                            {product.summary ?? "No summary added yet."}
                          </p>
                        </div>
                        <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                          {status?.statusLabel ?? "Ready"}
                        </span>
                      </div>
                      <div className="mt-5 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
                        <div>Utilities declared: <span className="font-semibold text-[var(--shell-ink)]">{status?.utilityKeys.length ?? 0}</span></div>
                        <div>Question count: <span className="font-semibold text-[var(--shell-ink)]">{status?.questionCount ?? 0}</span></div>
                        <div>Latest score: <span className="font-semibold text-[var(--shell-ink)]">{status?.latestScore ?? "--"}</span></div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
