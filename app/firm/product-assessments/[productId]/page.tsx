import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import FirmProductAssessmentClient from "@/app/components/firm/FirmProductAssessmentClient";
import { getSessionUser } from "@/lib/auth/session";
import { FIRM_PRODUCT_MODULE_KEY, getFirmProductCatalog } from "@/lib/firmPat";
import { buildProductAssessmentResumeState } from "@/lib/productAssessmentRuntime";
import prisma from "@/lib/prisma";
import { getSurveyDraftWhere, getSurveyFinalWhere } from "@/lib/surveyDrafts";

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

  const products = await getFirmProductCatalog(sessionUser.companyId);
  const { productId } = await params;
  const product = products.find((entry) => entry.id === productId);
  if (!product) {
    notFound();
  }

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: FIRM_PRODUCT_MODULE_KEY },
    select: { id: true },
  }).catch(() => null);

  const [draftSubmission, latestSubmission] = moduleRecord
    ? await Promise.all([
        prisma.surveySubmission
          .findFirst({
            where: getSurveyDraftWhere({
              companyId: sessionUser.companyId,
              moduleId: moduleRecord.id,
              Subject: {
                productId: product.id,
              },
            }),
            orderBy: { createdAt: "desc" },
            select: {
              answers: true,
              integrityFlags: true,
            },
          })
          .catch(() => null),
        prisma.surveySubmission
          .findFirst({
            where: getSurveyFinalWhere({
              companyId: sessionUser.companyId,
              moduleId: moduleRecord.id,
              Subject: {
                productId: product.id,
              },
            }),
            orderBy: { createdAt: "desc" },
            select: {
              answers: true,
            },
          })
          .catch(() => null),
      ])
    : [null, null];

  const resumeState = buildProductAssessmentResumeState({
    perspective: "firm",
    selectedUtilityKeys: product.utilityKeys,
    draftAnswers: draftSubmission?.answers,
    draftCurrentPage:
      typeof (draftSubmission?.integrityFlags as { currentStep?: unknown } | null)?.currentStep === "number"
        ? ((draftSubmission?.integrityFlags as { currentStep?: number }).currentStep ?? 1)
        : 1,
    fallbackAnswers: latestSubmission?.answers,
  });

  if (!moduleRecord) {
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
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link href="#assessment-progress" className="pat-card pat-card-interactive block p-5">
            <div className="pat-label">Progress</div>
            <div className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">Review state and saved page</div>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
              Track completion, save state, and resume behavior inside the live PAT runtime.
            </p>
          </Link>
          <Link href="#assessment-help" className="pat-card pat-card-interactive block p-5">
            <div className="pat-label">Help</div>
            <div className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">Why this firm review matters</div>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
              Review how utility-scoped firm signal feeds product intelligence without expanding beyond declared scope.
            </p>
          </Link>
        </div>
      </section>

      <FirmProductAssessmentClient
        product={product}
        initialAnswers={resumeState.responses}
        initialCurrentPage={resumeState.currentPage}
        initialStaleDraft={resumeState.staleDraft}
        initialDroppedResponseIds={resumeState.droppedResponseIds}
      />
    </div>
  );
}
