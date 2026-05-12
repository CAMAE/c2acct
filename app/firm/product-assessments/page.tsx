import { redirect } from "next/navigation";
import FirmProductAssessmentCatalogCard from "@/app/components/firm/FirmProductAssessmentCatalogCard";
import { getSessionUser } from "@/lib/auth/session";
import { getFirmProductCatalog } from "@/lib/firmPat";

export const dynamic = "force-dynamic";

type SearchParams = {
  submitted?: string;
  productId?: string;
};

export default async function FirmProductAssessmentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }

  const params = searchParams ? await searchParams : undefined;
  const products = await getFirmProductCatalog(sessionUser.companyId);
  const submittedProduct = params?.submitted === "1" ? products.find((product) => product.id === params.productId) : null;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Firm product assessments</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Review vendor products through utility-aligned firm questions
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          The firm product review loop only asks questions inside the vendor-declared utility scope for each product. These submissions feed the vendor product insight page directly.
        </p>
        {submittedProduct ? (
          <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Submitted: <span className="font-semibold text-[var(--shell-ink)]">{submittedProduct.name}</span>. The product review is recorded and now sits inside the normal PAT product-assessment catalog.
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.length === 0 ? (
          <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
            No products are available for firm review yet. Vendor product registration and utility declaration must exist first.
          </div>
        ) : (
          products.map((product) => <FirmProductAssessmentCatalogCard key={product.id} product={product} />)
        )}
      </section>
    </div>
  );
}
