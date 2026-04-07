import { notFound, redirect } from "next/navigation";
import FirmProductAssessmentClient from "@/app/components/firm/FirmProductAssessmentClient";
import { getSessionUser } from "@/lib/auth/session";
import { getFirmProductCatalog } from "@/lib/firmPat";

export const dynamic = "force-dynamic";

type Params = {
  productId: string;
};

export default async function FirmProductAssessmentDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }

  const products = await getFirmProductCatalog();
  const { productId } = await params;
  const product = products.find((entry) => entry.id === productId);
  if (!product) {
    notFound();
  }

  if (!product.reviewAvailable) {
    const redirectParams = new URLSearchParams({
      blockedProductId: product.id,
    });
    redirect(`/firm/product-assessments?${redirectParams.toString()}`);
  }

  const helpSearchParams = new URLSearchParams({
    topic: "product-assessment",
    productId: product.id,
    productName: product.name,
  });
  const productAssessmentHelpHref = `/firm/help?${helpSearchParams.toString()}`;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Firm product assessment</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {product.name}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This firm-side product review stays inside the product’s declared utility scope. It feeds vendor product insight instead of becoming a disconnected side form.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Vendor: <span className="font-semibold text-[var(--shell-ink)]">{product.vendorName}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Utilities: <span className="font-semibold text-[var(--shell-ink)]">{product.utilityKeys.length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Questions: <span className="font-semibold text-[var(--shell-ink)]">{product.questionCount}</span>
          </div>
        </div>
      </section>

      <FirmProductAssessmentClient
        product={product}
        assessmentsHref="/firm/product-assessments"
        productInsightHref={`/vendor/product-insight/${product.id}`}
        helpHref={productAssessmentHelpHref}
      />
    </div>
  );
}
