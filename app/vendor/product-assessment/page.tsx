import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import VendorProductAssessmentDashboard from "@/app/components/vendor/VendorProductAssessmentDashboard";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
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

type SearchParams = {
  panel?: string;
};

export default async function VendorProductAssessmentPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const sessionUser = await getSessionUser();
  const vendorContext = await getVendorCompanyContext(sessionUser?.companyId);
  const signedIntoVendor = vendorContext.company?.type === "VENDOR";
  const activePanel =
    params?.panel === "new" || params?.panel === "help" ? params.panel : "completed";

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
    const product = await prisma.product.create({
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
      select: { id: true },
    });

    redirect(`/vendor/product-assessment/${product.id}`);
  }

  const moduleRecord = await prisma.surveyModule.findUnique({
    where: { key: VENDOR_PRODUCT_MODULE_KEY },
    select: { id: true },
  }).catch(() => null);

  const productStatuses = moduleRecord
    ? await Promise.all(
        vendorContext.products.map(async (product) => {
          const latestSubmission = await prisma.surveySubmission.findFirst({
            where: getSurveyFinalWhere({
              companyId: vendorContext.company?.id,
              moduleId: moduleRecord.id,
              Subject: {
                productId: product.id,
              },
            }),
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
  const dashboardProducts = vendorContext.products.map((product) => ({
    utilityCount: extractUtilityKeysFromSignals(product.signals).length,
    id: product.id,
    name: product.name,
    summary: product.summary,
    website: product.website,
    status:
      statusByProductId.get(product.id) ??
      deriveProductStatus({
        latestSubmission: null,
        utilityKeys: extractUtilityKeysFromSignals(product.signals),
      }),
  }));

  return (
    <VendorProductAssessmentDashboard
      activePanel={activePanel}
      products={dashboardProducts}
      signedIntoVendor={signedIntoVendor}
      createProduct={createProduct}
    />
  );
}
