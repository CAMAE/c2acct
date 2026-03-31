import Link from "next/link";
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
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/firm/product-assessments">
            Back to product assessments
          </Link>
          <Link className="pat-button-secondary" href={`/vendor/product-insight/${product.id}`}>
            Open vendor product insight
          </Link>
        </div>
      </section>

      <FirmProductAssessmentClient product={product} />
    </div>
  );
}
