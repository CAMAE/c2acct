import Link from "next/link";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import PatModeToggle from "@/app/components/pat/PatModeToggle";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import {
  formatFeatureCountLabel,
  PAT_PRODUCT_NAME,
  replaceUtilityTermsForDisplay,
} from "@/lib/displayCopy";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import prisma from "@/lib/prisma";
import {
  VENDOR_PRODUCT_MODULE_KEY,
  bucketVendorProductsByAssessmentStatus,
  deriveVendorProductOverviewStatus,
  ensureVendorProfileForCompany,
  extractUtilityKeysFromSignals,
  getRequestedVendorProductAssessmentOverviewMode,
  getVendorCompanyContext,
  sortVendorProductAssessmentEntries,
} from "@/lib/vendorPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Product Assessment | C2Acct",
  description: "Per-product vendor assessment entry for PAT.",
};

type SearchParams = {
  mode?: string;
};

function getModeHref(mode: "completed" | "existing" | "add-new" | "help") {
  return `/vendor/product-assessment?mode=${mode}`;
}

function formatSubmittedDate(value: Date | null) {
  return value ? value.toLocaleDateString() : "No final submission yet";
}

type ProductAssessmentEntry = {
  product: {
    id: string;
    name: string;
    summary: string | null;
  };
  status: ReturnType<typeof deriveVendorProductOverviewStatus>;
};

function ProductAssessmentCard({
  entry,
}: {
  entry: ProductAssessmentEntry;
}) {
  return (
    <Link
      href={`/vendor/product-assessment/${entry.product.id}`}
      className="pat-card pat-card-interactive block rounded-[24px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold text-[var(--shell-ink)]">{entry.product.name}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            {entry.product.summary ?? "No summary added yet."}
          </p>
        </div>
        <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
          {replaceUtilityTermsForDisplay(entry.status.statusLabel)}
        </span>
      </div>
      <div className="mt-5 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
        <div>
          Features declared:{" "}
          <span className="font-semibold text-[var(--shell-ink)]">{entry.status.utilityKeys.length}</span>
        </div>
        <div>
          Feature scope:{" "}
          <span className="font-semibold text-[var(--shell-ink)]">
            {formatFeatureCountLabel(entry.status.utilityKeys.length)}
          </span>
        </div>
        <div>
          Question count:{" "}
          <span className="font-semibold text-[var(--shell-ink)]">{entry.status.questionCount}</span>
        </div>
        <div>
          Latest score: <span className="font-semibold text-[var(--shell-ink)]">{entry.status.latestScore ?? "--"}</span>
        </div>
        <div>
          Latest final submission:{" "}
          <span className="font-semibold text-[var(--shell-ink)]">
            {formatSubmittedDate(entry.status.latestSubmittedAt)}
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{entry.status.reason}</p>
    </Link>
  );
}

export default async function VendorProductAssessmentPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="vendor"
        surfaceLabel="Vendor product assessment"
        title="Vendor product assessment requires Pro membership"
        body="PAT keeps this route visible so the upgrade path stays explicit. Per-product assessment is part of the current Pro vendor tier because it feeds the current product-intelligence surface and the feature-scoped product runtime."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/vendor"
        workspaceLabel="Open vendor workspace"
        availableNow="The baseline vendor state still keeps portal entry, help, profile continuity, and membership routing available."
        stagedNote="The assessment runtime belongs to the current product-intelligence layer, so PAT does not open it from the baseline state because the intended product model treats core vendor assessments and insights as Pro surfaces."
      />
    );
  }
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
      redirect("/vendor/product-assessment?mode=add-new");
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

    redirect("/vendor/product-assessment?mode=existing");
  }

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: VENDOR_PRODUCT_MODULE_KEY },
    select: { id: true },
  }).catch(() => null);

  const productEntries: ProductAssessmentEntry[] = await Promise.all(
    vendorContext.products.map(async (product) => {
      const latestSubmission = moduleRecord
        ? await prisma.surveySubmission.findFirst({
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
              answers: true,
            },
          }).catch(() => null)
        : null;

      return {
        product: {
          id: product.id,
          name: product.name,
          summary: product.summary,
        },
        status: deriveVendorProductOverviewStatus({
          latestSubmission,
          signalUtilityKeys: extractUtilityKeysFromSignals(product.signals),
        }),
      };
    })
  );

  const sortedProductEntries = sortVendorProductAssessmentEntries(productEntries);
  const buckets = bucketVendorProductsByAssessmentStatus(sortedProductEntries);
  const activeMode =
    params?.mode
      ? getRequestedVendorProductAssessmentOverviewMode(params.mode)
      : buckets.completed.length > 0
        ? "completed"
        : productEntries.length > 0
          ? "existing"
          : "add-new";
  const toggleOptions = [
    { key: "completed", label: "Completed", href: getModeHref("completed") },
    { key: "existing", label: "Existing", href: getModeHref("existing") },
    { key: "add-new", label: "Add New", href: getModeHref("add-new") },
    { key: "help", label: "Help", href: getModeHref("help") },
  ] as const;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{PAT_PRODUCT_NAME}</div>
        <PatAudienceTitle
          as="h1"
          title="Vendor product assessment"
          audienceTerms={["Vendor"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Open each product on its own PAT assessment, declare the features it supports, and complete the paced questions that turn vendor input into grounded product signal.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Completed: <span className="font-semibold text-[var(--shell-ink)]">{buckets.completed.length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Existing: <span className="font-semibold text-[var(--shell-ink)]">{buckets.existing.length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Total products: <span className="font-semibold text-[var(--shell-ink)]">{productEntries.length}</span>
          </div>
        </div>
        <div className="mt-6">
          <PatModeToggle
            activeKey={activeMode}
            ariaLabel="Vendor product assessment modes"
            options={toggleOptions}
            navigationMode="replace"
          />
        </div>
      </section>

      {!signedIntoVendor ? (
        <section className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
          Sign in with a vendor-linked account to create products and persist product assessments. The route structure is already in place, but product-scoped writes remain protected.
        </section>
      ) : activeMode === "completed" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Completed vendor product assessments</h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              These products have a truthful final vendor submission. Firm review can open only from this completed state.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {buckets.completed.length === 0 ? (
              <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
                No products have a completed final vendor product assessment yet. Use Existing to finish current products or Add New to register another product.
              </div>
            ) : (
              buckets.completed.map((entry) => <ProductAssessmentCard key={entry.product.id} entry={entry} />)
            )}
          </div>
        </section>
      ) : activeMode === "existing" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Existing products still in progress</h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              These products exist in PAT but do not yet have a completed final vendor product assessment submission.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {buckets.existing.length === 0 ? (
              <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
                {productEntries.length === 0
                  ? "No products exist yet. Use Add New to create an inventory record, then open that product from Existing to complete the assessment."
                  : "Every current product already has a completed final vendor product assessment. Use Completed to review them or Add New to register another product."}
              </div>
            ) : (
              buckets.existing.map((entry) => <ProductAssessmentCard key={entry.product.id} entry={entry} />)
            )}
          </div>
        </section>
      ) : activeMode === "add-new" ? (
        <section className="pat-card p-6">
          <div className="pat-label">Add new product</div>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--shell-ink)]">Create a product record before assessment begins</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
            Adding a product creates the PAT inventory record only. It does not declare features, create a final submission, or count as a completed product assessment.
          </p>
          <form action={createProduct} className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
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
      ) : (
        <>
          <section className="pat-card p-6">
            <div className="pat-label">Help</div>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--shell-ink)]">How to use vendor product assessment</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
              Use this page to move between completed products, in-progress products, adding a new product, and this quick tutorial. Each product keeps its own assessment history.
            </p>
          </section>
          <section className="grid gap-5 xl:grid-cols-3">
            <article className="pat-card p-6">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">How to take the assessment</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Start by opening one product, fill in the product profile, select the features it supports, and work through the paced question pages until PAT unlocks submission.
              </p>
            </article>
            <article className="pat-card p-6">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">Why to take it</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                A completed vendor product assessment gives PAT the current product signal it needs for product intelligence and for truthful firm-side review.
              </p>
            </article>
            <article className="pat-card p-6">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">What happens after submission</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                PAT saves a final vendor product assessment submission to that product, moves it from Existing to Completed, opens firm review eligibility, and uses the submitted signal in the current product-intelligence flow.
              </p>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
