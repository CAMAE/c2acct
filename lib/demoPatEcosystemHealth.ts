import prisma from "@/lib/prisma";
import {
  DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM,
  DEMO_PAT_FIRMS,
  DEMO_PAT_VENDORS,
  DEMO_PRODUCT_COUNT_MINIMUM,
  DEMO_VENDOR_COUNT_MINIMUM,
} from "@/data/demoPatEcosystem";
import { FIRM_MODULE_DEFINITIONS, FIRM_PRODUCT_MODULE_KEY } from "@/lib/firmPat";
import { VENDOR_PRODUCT_MODULE_KEY } from "@/lib/vendorPat";

export type DemoPatEcosystemHealth = {
  ok: boolean;
  error: string | null;
  vendorCount: number;
  productCount: number;
  firmCount: number;
  productProfileCount: number;
  vendorProductPlanCount: number;
  firmProductPlanCount: number;
  productSignalCount: number;
  vendorProductAssessmentCount: number;
  firmAlignmentSubmissionCount: number;
  firmProductAssessmentCount: number;
  firmVendorRelationshipCount: number;
  routeReady: boolean;
};

const demoVendorKeys = DEMO_PAT_VENDORS.map((vendor) => `demo-vendor-${vendor.key}`);
const demoProductSlugs = DEMO_PAT_VENDORS.flatMap((vendor) =>
  vendor.products.map((product) => `${vendor.key}-${product.key}`)
);
const demoFirmNames = DEMO_PAT_FIRMS.map((firm) => firm.displayName);

function emptyHealth(error: string): DemoPatEcosystemHealth {
  return {
    ok: false,
    error,
    vendorCount: 0,
    productCount: 0,
    firmCount: 0,
    productProfileCount: 0,
    vendorProductPlanCount: 0,
    firmProductPlanCount: 0,
    productSignalCount: 0,
    vendorProductAssessmentCount: 0,
    firmAlignmentSubmissionCount: 0,
    firmProductAssessmentCount: 0,
    firmVendorRelationshipCount: 0,
    routeReady: false,
  };
}

export async function getDemoPatEcosystemHealth(): Promise<DemoPatEcosystemHealth> {
  try {
    const [vendors, firms, products, vendorModule, firmProductModule, firmModules] = await Promise.all([
      prisma.vendorProfile.findMany({
        where: { key: { in: demoVendorKeys } },
        select: { id: true },
      }),
      prisma.company.findMany({
        where: {
          name: { in: demoFirmNames },
          type: "FIRM",
        },
        select: { id: true },
      }),
      prisma.product.findMany({
        where: { slug: { in: demoProductSlugs } },
        select: { id: true },
      }),
      prisma.surveyModule.findUnique({
        where: { key: VENDOR_PRODUCT_MODULE_KEY },
        select: { id: true },
      }),
      prisma.surveyModule.findUnique({
        where: { key: FIRM_PRODUCT_MODULE_KEY },
        select: { id: true },
      }),
      prisma.surveyModule.findMany({
        where: {
          key: { in: FIRM_MODULE_DEFINITIONS.map((module) => module.key) },
        },
        select: { id: true },
      }),
    ]);

    const productIds = products.map((product) => product.id);
    const firmIds = firms.map((firm) => firm.id);
    const firmModuleIds = firmModules.map((module) => module.id);

    const [
      productProfileCount,
      vendorProductPlanCount,
      firmProductPlanCount,
      productSignalCount,
      vendorProductAssessmentCount,
      firmAlignmentSubmissionCount,
      firmProductAssessmentCount,
      firmProductRelationshipSubmissions,
    ] = await Promise.all([
      prisma.productProfile.count({
        where: { productId: { in: productIds } },
      }),
      prisma.productAssessmentPlan.count({
        where: {
          productId: { in: productIds },
          perspective: "VENDOR",
        },
      }),
      prisma.productAssessmentPlan.count({
        where: {
          productId: { in: productIds },
          perspective: "FIRM",
        },
      }),
      prisma.productSignal.count({
        where: {
          productId: { in: productIds },
          OR: [
            { signalKey: { startsWith: "pat.utility." } },
            { signalKey: "pat.vendor.latest_score" },
            { signalKey: { startsWith: "demo.product." } },
          ],
        },
      }),
      vendorModule
        ? prisma.surveySubmission.count({
            where: {
              moduleId: vendorModule.id,
              Subject: { productId: { in: productIds } },
              scoreVersion: { gt: 0 },
            },
          })
        : Promise.resolve(0),
      prisma.surveySubmission.count({
        where: {
          companyId: { in: firmIds },
          moduleId: { in: firmModuleIds },
          scoreVersion: { gt: 0 },
        },
      }),
      firmProductModule
        ? prisma.surveySubmission.count({
            where: {
              companyId: { in: firmIds },
              moduleId: firmProductModule.id,
              Subject: { productId: { in: productIds } },
              scoreVersion: { gt: 0 },
            },
          })
        : Promise.resolve(0),
      firmProductModule
        ? prisma.surveySubmission.findMany({
            where: {
              companyId: { in: firmIds },
              moduleId: firmProductModule.id,
              Subject: { productId: { in: productIds } },
              scoreVersion: { gt: 0 },
            },
            select: {
              companyId: true,
              Subject: {
                select: {
                  Product: {
                    select: {
                      vendorId: true,
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const firmVendorRelationships = new Set(
      firmProductRelationshipSubmissions
        .map((submission) => {
          const vendorId = submission.Subject?.Product?.vendorId;
          return vendorId ? `${submission.companyId}:${vendorId}` : null;
        })
        .filter((value): value is string => Boolean(value))
    );

    const routeReady =
      vendors.length >= DEMO_VENDOR_COUNT_MINIMUM &&
      products.length >= DEMO_PRODUCT_COUNT_MINIMUM &&
      firmVendorRelationships.size >= DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM &&
      productProfileCount >= products.length &&
      vendorProductPlanCount >= products.length &&
      firmProductPlanCount >= products.length &&
      vendorProductAssessmentCount >= products.length &&
      firmAlignmentSubmissionCount >= firms.length * FIRM_MODULE_DEFINITIONS.length &&
      firmProductAssessmentCount >= DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM;

    return {
      ok: routeReady,
      error: null,
      vendorCount: vendors.length,
      productCount: products.length,
      firmCount: firms.length,
      productProfileCount,
      vendorProductPlanCount,
      firmProductPlanCount,
      productSignalCount,
      vendorProductAssessmentCount,
      firmAlignmentSubmissionCount,
      firmProductAssessmentCount,
      firmVendorRelationshipCount: firmVendorRelationships.size,
      routeReady,
    };
  } catch (error) {
    return emptyHealth(error instanceof Error ? error.message : String(error));
  }
}
