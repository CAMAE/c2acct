import { applyRepoEnv } from "@/lib/env/repoEnv";
import { CompanyType } from "@prisma/client";
import type { DemoFirmInput, DemoProductInput, DemoVendorInput } from "@/data/demoPatEcosystem";
import { SURVEY_FINAL_SCORE_VERSION } from "@/lib/surveyDrafts";
import { getVendorScopedFirms } from "@/lib/tenancy";
import { FIRM_PRODUCT_MODULE_KEY, ensureFirmProductModule } from "@/lib/firmPat";
import { VENDOR_PRODUCT_MODULE_KEY, ensureVendorProductModule } from "@/lib/vendorPat";
import {
  ensureProduct,
  ensureResearchSource,
  seedFirmProductAssessment,
  seedVendorProductAssessment,
  stableId,
  type SeededProduct,
} from "@/lib/demoPatEcosystemSeed";

/**
 * Demo-week (2026-06): give the prod "Demo Vendor Inc" account a THIRD product
 * with a completed vendor product assessment plus several completed firm
 * reviews, so the consultant vendor-brief positioning radar renders (it needs
 * >= 3 products that carry a vendor self-score OR a firm-reviewed average —
 * see VendorProductPositioningRadar MIN_AXES).
 *
 * Same guarded pattern as scripts/cleanup-stray-ecosystem-firm.ts:
 * dry-run by default — inspects prod, prints the exact write plan, changes
 * nothing. To execute:
 *
 *   PAT_SEED_CONFIRM=demo-vendor-third-product DATABASE_URL=<prod> \
 *     node --import tsx scripts/demo/seed-demo-vendor-third-product.ts
 *
 * Optional overrides: PAT_SEED_VENDOR_NAME (default "Demo Vendor Inc"),
 * PAT_SEED_REVIEW_FIRMS (default 5 — how many demo firms file reviews).
 *
 * All writes reuse the demo-ecosystem seed primitives (upserts on stable ids),
 * so re-running is idempotent and rollback is a delete of the printed ids.
 */

const CONFIRM_VALUE = "demo-vendor-third-product";
const VENDOR_NAME = process.env.PAT_SEED_VENDOR_NAME?.trim() || "Demo Vendor Inc";
const REVIEW_FIRM_COUNT = Math.max(2, Number(process.env.PAT_SEED_REVIEW_FIRMS ?? "5") || 5);

// productIndex drives the deterministic variance pattern; 4 = "vendor-over-firm"
// (vendor self-score visibly above the firm average), which reads well on the
// positioning radar without inventing implausible spreads.
const PRODUCT_INDEX = 4;

// Prod inspection 2026-06-11: Demo Vendor Inc (company demo-vendor-company)
// already carries FOUR products under vendor key "demo-acct-vendor", but only
// two are radar-usable (Demo Advisory Suite, Demo Tax Tool). Rather than
// inventing a fifth product, this seed COMPLETES the existing fully-bare
// "Demo Bookkeeping Pro" — same product row (slug match → upsert-update),
// now with a final vendor assessment and firm reviews. Cam's call 2026-06-11:
// Bookkeeping Pro, NOT Audit Workpapers — the latter holds a 36-answer draft
// vendor submission from 2026-05-31 that must be preserved.
const SYNTHETIC_VENDOR: Omit<DemoVendorInput, "products"> = {
  key: "demo-acct-vendor",
  displayName: VENDOR_NAME,
  website: "https://demo-vendor-inc.pat.local",
  industryFocus: "Mid-market accounting automation",
  sizeBand: "51-200 employees",
  maturityLevel: "Scaled specialist",
  integrationNeeds: ["QuickBooks Online", "Xero", "NetSuite"],
  riskFlags: ["implementation capacity concentrated in senior CS"],
  membership: { plan: "PRO", status: "ACTIVE" } as DemoVendorInput["membership"],
};

const THIRD_PRODUCT: DemoProductInput = {
  key: "demo-bookkeeping-pro",
  name: "Demo Bookkeeping Pro",
  category: "Bookkeeping automation",
  websitePath: "/demo-bookkeeping-pro",
  summary:
    "Transaction categorization, ledger upkeep, and month-end tidy-up automation for recurring bookkeeping engagements.",
  deploymentModel: "CLOUD" as DemoProductInput["deploymentModel"],
  utilityKeys: [
    "erp_gl_core_ledger",
    "close_reconciliation_consolidation",
    "workflow_practice_operations_task_routing",
  ],
  scoreTarget: 4.0,
  profile: {
    positioning: "Bookkeeping engine for firms that want categorized, reconciled ledgers without manual upkeep.",
    targetCustomer: "CAS and outsourced bookkeeping teams with recurring monthly engagements.",
    targetUseContext: "Transaction categorization, ledger maintenance, and month-end tidy-up across clients.",
    implementationStyle: "Template-led rollout starting from existing chart-of-accounts mappings.",
    operatingModelFit: "Strong for teams that standardize bookkeeping workflows across many small clients.",
    primaryBuyer: "CAS partner or outsourced accounting director",
    integrationPosture: "Bank-feed and ledger connectors with rule-based categorization review.",
  },
  riskFlags: ["Categorization rules need quarterly review as client mix shifts"],
};

function fail(message: string): never {
  console.error(`ABORT: ${message}`);
  process.exit(1);
}

async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");

  console.log(`Target vendor: "${VENDOR_NAME}"`);

  // ---- Inspect current prod state (read-only) -----------------------------
  const companies = await prisma.company.findMany({
    where: { name: VENDOR_NAME, type: CompanyType.VENDOR },
    select: { id: true, name: true, _count: { select: { User: true } } },
  });
  if (companies.length !== 1) {
    fail(`expected exactly 1 VENDOR company named "${VENDOR_NAME}", found ${companies.length}.`);
  }
  const company = companies[0];

  const vendorProfile = await prisma.vendorProfile.findUnique({
    where: { companyId: company.id },
    select: { id: true, key: true, displayName: true },
  });

  const [vendorModule, firmModule] = await Promise.all([
    prisma.surveyModule.findFirst({
      where: { key: VENDOR_PRODUCT_MODULE_KEY },
      select: { id: true, version: true },
    }),
    prisma.surveyModule.findFirst({
      where: { key: FIRM_PRODUCT_MODULE_KEY },
      select: { id: true, version: true },
    }),
  ]);
  if (!vendorModule || !firmModule) {
    fail("vendor/firm product survey modules are missing in this database.");
  }

  const products = await prisma.product.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  console.log(`\nCompany: ${company.id} (users: ${company._count.User})`);
  console.log(`VendorProfile: ${vendorProfile ? vendorProfile.id : "MISSING"}`);
  console.log(`Existing products: ${products.length}`);
  let usableProducts = 0;
  for (const product of products) {
    const subject = await prisma.subject.findUnique({ where: { productId: product.id }, select: { id: true } });
    const vendorFinal = subject
      ? await prisma.surveySubmission.count({
          where: { subjectId: subject.id, moduleId: vendorModule.id, scoreVersion: SURVEY_FINAL_SCORE_VERSION },
        })
      : 0;
    const firmReviews = subject
      ? await prisma.surveySubmission.findMany({
          where: { subjectId: subject.id, moduleId: firmModule.id, scoreVersion: SURVEY_FINAL_SCORE_VERSION },
          select: { companyId: true },
        })
      : [];
    const distinctFirms = new Set(firmReviews.map((row) => row.companyId)).size;
    const usable = vendorFinal > 0 || distinctFirms > 0;
    if (usable) usableProducts += 1;
    console.log(
      `  - ${product.name} (${product.slug}) vendor-final=${vendorFinal} firm-reviews=${firmReviews.length} (distinct firms: ${distinctFirms}) usable=${usable}`
    );
  }
  console.log(
    `Radar readiness: ${usableProducts}/3 usable products (radar MIN_AXES=3; this seed adds 1 more).`
  );

  // Reviewing firms MUST come from the vendor's own ecosystem: the insight
  // engine counts firm reviews only when companyId ∈ getVendorScopedFirms
  // (walled tenancy) — reviews from any other firm are invisible on the brief.
  const scopedFirmIds = await getVendorScopedFirms(company.id);
  const scopedFirms = await prisma.company.findMany({
    where: { id: { in: scopedFirmIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (scopedFirms.length < 2) {
    fail(`need at least 2 firms in this vendor's ecosystem to file reviews, found ${scopedFirms.length}.`);
  }

  // Score spread keeps the reviews realistic instead of five identical rows.
  const REVIEW_SCORE_TARGETS = [3.4, 3.9, 3.6, 4.2, 3.2, 3.8, 3.5] as const;
  const reviewFirms = scopedFirms.slice(0, REVIEW_FIRM_COUNT).map((firmCompany, index) => {
    const firm: DemoFirmInput = {
      key: firmCompany.id.replace(/^demo-firm-company-/, ""),
      displayName: firmCompany.name,
      industry: "Accounting",
      sizeBand: "11-50",
      maturityLevel: "Scaling",
      integrationNeeds: [],
      riskFlags: [],
      scoreTarget: REVIEW_SCORE_TARGETS[index % REVIEW_SCORE_TARGETS.length],
      membership: { plan: "PRO", status: "ACTIVE" } as DemoFirmInput["membership"],
    };
    return { firm, companyId: firmCompany.id };
  });

  // Corrective sweep: any earlier seed run that filed reviews for this product
  // from OUT-of-ecosystem firms left rows the brief can never count — and that
  // leak into those firms' own review surfaces. They get deleted on apply.
  const misfiledReviews = await prisma.surveySubmission.findMany({
    where: {
      id: { endsWith: `-${SYNTHETIC_VENDOR.key}-${THIRD_PRODUCT.key}`, startsWith: "demo-firm-product-submission-" },
      companyId: { notIn: scopedFirmIds },
    },
    select: { id: true, companyId: true },
  });

  // ---- Print the exact write plan ----------------------------------------
  const slug = `${SYNTHETIC_VENDOR.key}-${THIRD_PRODUCT.key}`;
  const productId = stableId("demo-product", slug);
  const vendorSubmissionId = stableId("demo-vendor-product-submission", THIRD_PRODUCT.key);
  const existingProduct = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  const existingVendorSubmission = await prisma.surveySubmission.findUnique({
    where: { id: vendorSubmissionId },
    select: { id: true, scoreVersion: true, answeredCount: true, createdAt: true },
  });

  console.log("\n================ WRITE PLAN ================");
  console.log(`1. Product upsert        ${productId} ("${THIRD_PRODUCT.name}", slug=${slug})${existingProduct ? " [EXISTS — update]" : ""}`);
  console.log(`   + ProductProfile, product Subject, ProductSignals, assessment plans (vendor+firm)`);
  if (!vendorProfile) {
    console.log(`   ! VendorProfile missing for ${company.id} — will be created (required by Product.vendorId)`);
  }
  console.log(`2. Vendor assessment     SurveySubmission ${vendorSubmissionId} (module ${VENDOR_PRODUCT_MODULE_KEY}, scoreVersion FINAL, variance=vendor-over-firm)${existingVendorSubmission ? " [EXISTS — update]" : ""}`);
  if (existingVendorSubmission && existingVendorSubmission.scoreVersion !== SURVEY_FINAL_SCORE_VERSION) {
    console.log(
      `   ! OVERWRITES an existing DRAFT (scoreVersion=${existingVendorSubmission.scoreVersion}, ` +
        `answeredCount=${existingVendorSubmission.answeredCount}, createdAt=${existingVendorSubmission.createdAt.toISOString()}) ` +
        `with the completed deterministic assessment.`
    );
  }
  console.log(`3. Firm reviews (${reviewFirms.length} in-ecosystem firms, module ${FIRM_PRODUCT_MODULE_KEY}, scoreVersion FINAL):`);
  for (const [index, entry] of reviewFirms.entries()) {
    const id = stableId(
      "demo-firm-product-submission",
      `${entry.firm.key}-${SYNTHETIC_VENDOR.key}-${THIRD_PRODUCT.key}`
    );
    console.log(`   ${index + 1}. ${id} ("${entry.firm.displayName}", target ${entry.firm.scoreTarget})`);
  }
  if (misfiledReviews.length > 0) {
    console.log(`4. DELETE ${misfiledReviews.length} misfiled review(s) from out-of-ecosystem firms:`);
    for (const row of misfiledReviews) {
      console.log(`   - ${row.id} (firm company ${row.companyId})`);
    }
  }
  console.log("Rollback: delete the SurveySubmission ids above, then the Product row (cascades profile/signals/plans).");
  console.log("============================================");

  if (process.env.PAT_SEED_CONFIRM !== CONFIRM_VALUE) {
    console.log(`\nDRY RUN — no changes. Set PAT_SEED_CONFIRM=${CONFIRM_VALUE} to execute.`);
    await prisma.$disconnect();
    return;
  }

  // ---- Apply ---------------------------------------------------------------
  console.log("\nAPPLYING…");
  const source = await ensureResearchSource(prisma);
  let vendorProfileId = vendorProfile?.id;
  if (!vendorProfileId) {
    const created = await prisma.vendorProfile.create({
      data: {
        id: stableId("demo-vendor-profile", SYNTHETIC_VENDOR.key),
        key: stableId("demo-vendor", SYNTHETIC_VENDOR.key),
        displayName: company.name,
        companyId: company.id,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    vendorProfileId = created.id;
    console.log(`created VendorProfile ${vendorProfileId}`);
  }

  const [liveVendorModule, liveFirmModule] = await Promise.all([
    ensureVendorProductModule(),
    ensureFirmProductModule(),
  ]);

  const vendorInput: DemoVendorInput = { ...SYNTHETIC_VENDOR, products: [THIRD_PRODUCT] };
  const seeded: SeededProduct = await ensureProduct(prisma, {
    vendor: vendorInput,
    vendorCompanyId: company.id,
    vendorProfileId,
    product: THIRD_PRODUCT,
    productIndex: PRODUCT_INDEX,
    sourceId: source.id,
  });
  console.log(`product upserted: ${seeded.id}`);

  const vendorResult = await seedVendorProductAssessment(prisma, {
    product: seeded,
    moduleId: liveVendorModule.id,
    moduleVersion: liveVendorModule.version ?? 1,
    productIndex: PRODUCT_INDEX,
  });
  console.log(`vendor assessment: ${vendorResult.submissionId} score=${vendorResult.score}`);

  for (const [index, entry] of reviewFirms.entries()) {
    await seedFirmProductAssessment(prisma, {
      firm: entry.firm,
      firmCompanyId: entry.companyId,
      product: seeded,
      moduleId: liveFirmModule.id,
      moduleVersion: liveFirmModule.version ?? 1,
      relationshipIndex: index,
    });
    console.log(`firm review filed: ${entry.firm.key}`);
  }

  if (misfiledReviews.length > 0) {
    const deleted = await prisma.surveySubmission.deleteMany({
      where: { id: { in: misfiledReviews.map((row) => row.id) } },
    });
    console.log(`deleted ${deleted.count} misfiled out-of-ecosystem review(s)`);
  }

  console.log("\nDONE. Re-run without PAT_SEED_CONFIRM to verify the new counts.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
