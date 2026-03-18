import Link from "next/link";
import { redirect } from "next/navigation";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { getReviewsPageData } from "@/lib/loaders/getReviewsPageData";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const data = await getReviewsPageData();
  if (data.context.kind === "unauthorized") {
    redirect("/login?callbackUrl=%2Freviews");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.06),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-16 text-slate-900">
      <EnsureCompanySelected />
      <div className="mx-auto max-w-4xl rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Sponsored Firm Reviews
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Review Sponsor-Visible Products</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          This pilot entry path is separate from self-assessment. It only exposes vendor products that are currently visible through an active sponsor relationship.
        </p>
        <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">Runtime pacing: 5 questions per page</div>

        {!data.canReview ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            No sponsor-visible products are available in the current company context.
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {data.products.map((product) => (
              <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{product.name}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      Access: {product.accessReason === "SPONSORED" ? "Sponsor visible" : "Owned"}
                    </div>
                  </div>
                  <Link
                    href={`/reviews/${data.reviewModuleKey}?productId=${encodeURIComponent(product.id)}`}
                    className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Start review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
