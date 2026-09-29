import { CompanyType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { poolForViewerBoundary, resolveCompanyBoundary } from "@/lib/dataBoundary";
import type { SessionUser } from "@/lib/auth/session";
import { FIRM_PRODUCT_MODULE_KEY } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

/**
 * 3e (R51, 2026-09-25) — Enterprise portal v0, DARK behind PAT_ENABLE_ENTERPRISE.
 * A parent company (Enterprise) owns one or more VENDOR companies; its members get a
 * read-only portal at /enterprise. Off (the default) every reader here returns null
 * or an empty list and nothing else in the app changes. Same `=== "1"` law as
 * lib/followUpMc.ts.
 *
 * The two views that cross vendor boundaries — the portfolio roll-up and the market
 * view — are PURE functions over typed inputs (buildPortfolioRollup, rankMarketView)
 * so the neutrality rule (a market row never carries a firm id or a firm name) is
 * enforced by the input type and unit-tested, not trusted.
 */
export const PAT_ENTERPRISE_FLAG_ENV = "PAT_ENABLE_ENTERPRISE";

export function isEnterpriseEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[PAT_ENTERPRISE_FLAG_ENV] === "1";
}

export type EnterpriseSummary = { id: string; name: string; slug: string; role: string };

export type EnterpriseVendorCompany = { id: string; name: string; verticalId: string };

export type EnterpriseEcosystemScope = {
  ecosystemId: string;
  ecosystemName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
  firmCompanies: Array<{ id: string; name: string }>;
};

export type EnterpriseAccessState = {
  sessionUser: SessionUser;
  enterprise: EnterpriseSummary;
  vendorCompanies: EnterpriseVendorCompany[];
  ecosystems: EnterpriseEcosystemScope[];
};

/** Membership lookup. Null when the flag is off or the user is not a member. */
export async function getEnterpriseForUser(userId: string): Promise<EnterpriseSummary | null> {
  if (!isEnterpriseEnabled()) return null;
  const membership = await prisma.enterpriseMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { role: true, Enterprise: { select: { id: true, name: true, slug: true } } },
  });
  if (!membership) return null;
  return { id: membership.Enterprise.id, name: membership.Enterprise.name, slug: membership.Enterprise.slug, role: membership.role };
}

/** The VENDOR companies the enterprise owns (Company.enterpriseId). Empty when the flag is off. */
export async function listOwnedVendorCompanies(enterpriseId: string): Promise<EnterpriseVendorCompany[]> {
  if (!isEnterpriseEnabled()) return [];
  return prisma.company.findMany({
    where: { enterpriseId, type: CompanyType.VENDOR, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, verticalId: true },
  });
}

/** Every ecosystem attached to an owned vendor company, with its firms. */
export async function listOwnedEcosystems(enterpriseId: string): Promise<EnterpriseEcosystemScope[]> {
  if (!isEnterpriseEnabled()) return [];
  const vendors = await listOwnedVendorCompanies(enterpriseId);
  if (vendors.length === 0) return [];
  const ecosystems = await prisma.ecosystem.findMany({
    where: { vendorCompanyId: { in: vendors.map((vendor) => vendor.id) } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      vendorCompanyId: true,
      VendorCompany: { select: { id: true, name: true } },
      EcosystemFirm: {
        select: { FirmCompany: { select: { id: true, name: true } } },
        orderBy: { FirmCompany: { name: "asc" } },
      },
    },
  });
  return ecosystems.flatMap((ecosystem) =>
    ecosystem.vendorCompanyId && ecosystem.VendorCompany
      ? [
          {
            ecosystemId: ecosystem.id,
            ecosystemName: ecosystem.name,
            vendorCompanyId: ecosystem.vendorCompanyId,
            vendorCompanyName: ecosystem.VendorCompany.name,
            firmCompanies: ecosystem.EcosystemFirm.map((row) => ({ id: row.FirmCompany.id, name: row.FirmCompany.name })),
          },
        ]
      : []
  );
}

/** The whole access state for a signed-in user; null when the flag is off or no membership. */
export async function getEnterpriseAccessStateForUser(sessionUser: SessionUser | null): Promise<EnterpriseAccessState | null> {
  if (!sessionUser || !isEnterpriseEnabled()) return null;
  const enterprise = await getEnterpriseForUser(sessionUser.id);
  if (!enterprise) return null;
  const [vendorCompanies, ecosystems] = await Promise.all([listOwnedVendorCompanies(enterprise.id), listOwnedEcosystems(enterprise.id)]);
  return { sessionUser, enterprise, vendorCompanies, ecosystems };
}

/** True when the ecosystem belongs to one of the enterprise's vendor companies. */
export function ownsEcosystem(state: EnterpriseAccessState, ecosystemId: string): boolean {
  return state.ecosystems.some((scope) => scope.ecosystemId === ecosystemId);
}

/** True when the company is an owned vendor or a firm inside an owned ecosystem. */
export function ownsCompany(state: EnterpriseAccessState, companyId: string): boolean {
  return (
    state.vendorCompanies.some((vendor) => vendor.id === companyId) ||
    state.ecosystems.some((scope) => scope.firmCompanies.some((firm) => firm.id === companyId))
  );
}

// ---------------------------------------------------------------------------
// Pure views. The input types carry product and vendor fields only.

export type ProductSignalInput = {
  productId: string;
  productName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
  verticalId: string;
  /** Firm-reviewed average score (0–100) or null when no firm review exists. */
  score: number | null;
  /** Number of firm reviews behind the score. */
  n: number;
  lastSubmissionAt: Date | null;
};

export type PortfolioRow = {
  productId: string;
  productName: string;
  vendorCompanyName: string;
  verticalId: string;
  score: number | null;
  n: number;
  lastSubmissionAt: Date | null;
  /** Days since the last firm review, or null. */
  freshnessDays: number | null;
};

export type MarketRow = {
  rank: number;
  productId: string;
  productName: string;
  vendorName: string;
  score: number | null;
  n: number;
  owned: boolean;
};

/** One row per owned product, best score first, unscored last, names as tie-break. */
export function buildPortfolioRollup(products: ProductSignalInput[], now: Date = new Date()): PortfolioRow[] {
  return [...products]
    .sort(compareBySignal)
    .map((product) => ({
      productId: product.productId,
      productName: product.productName,
      vendorCompanyName: product.vendorCompanyName,
      verticalId: product.verticalId,
      score: product.score,
      n: product.n,
      lastSubmissionAt: product.lastSubmissionAt,
      freshnessDays: product.lastSubmissionAt ? Math.max(0, Math.floor((now.getTime() - product.lastSubmissionAt.getTime()) / 86_400_000)) : null,
    }));
}

/**
 * Every product in one channel ranked by score (n breaks ties, then name), each
 * flagged owned or not. Vendor names are shown for every row; nothing else about a
 * competitor is carried — the input type has no firm field, so none can leak.
 */
export function rankMarketView(products: ProductSignalInput[], ownedVendorCompanyIds: ReadonlySet<string>, verticalId: string): MarketRow[] {
  return products
    .filter((product) => product.verticalId === verticalId)
    .sort(compareBySignal)
    .map((product, index) => ({
      rank: index + 1,
      productId: product.productId,
      productName: product.productName,
      vendorName: product.vendorCompanyName,
      score: product.score,
      n: product.n,
      owned: ownedVendorCompanyIds.has(product.vendorCompanyId),
    }));
}

function compareBySignal(a: ProductSignalInput, b: ProductSignalInput): number {
  if (a.score === null && b.score !== null) return 1;
  if (b.score === null && a.score !== null) return -1;
  if (a.score !== null && b.score !== null && a.score !== b.score) return b.score - a.score;
  if (a.n !== b.n) return b.n - a.n;
  return a.productName.localeCompare(b.productName) || a.productId.localeCompare(b.productId);
}

// ---------------------------------------------------------------------------
// Reader that projects the raw firm reviews onto the pure inputs.
//
// score = mean of the latest FINAL firm review per (reviewing firm, product); n = the
// number of such reviews; lastSubmissionAt = the newest of them — the same definition
// tools/score-parity.ts uses. The reviewing firm ids are used only to keep one review
// per firm and are never emitted: ProductSignalInput has no firm field.

async function productSignalsForVendors(vendors: EnterpriseVendorCompany[]): Promise<ProductSignalInput[]> {
  if (vendors.length === 0) return [];
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const [products, firmModule] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: { in: vendors.map((vendor) => vendor.id) }, active: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, companyId: true, verticalId: true },
    }),
    prisma.surveyModule.findUnique({ where: { key: FIRM_PRODUCT_MODULE_KEY }, select: { id: true } }),
  ]);
  const reviews =
    firmModule && products.length > 0
      ? await prisma.surveySubmission.findMany({
          where: getSurveyFinalWhere({
            moduleId: firmModule.id,
            Subject: { kind: "PRODUCT", productId: { in: products.map((product) => product.id) } },
          }),
          orderBy: { createdAt: "desc" },
          select: { companyId: true, score: true, createdAt: true, Subject: { select: { productId: true } } },
        })
      : [];
  const latestByProductAndFirm = new Map<string, { score: number; createdAt: Date }>();
  for (const review of reviews) {
    const productId = review.Subject?.productId;
    if (!productId || !review.companyId) continue;
    const key = `${productId}\u0000${review.companyId}`;
    if (!latestByProductAndFirm.has(key)) latestByProductAndFirm.set(key, { score: review.score, createdAt: review.createdAt });
  }
  const byProduct = new Map<string, Array<{ score: number; createdAt: Date }>>();
  for (const [key, value] of latestByProductAndFirm) {
    const productId = key.split("\u0000")[0];
    byProduct.set(productId, [...(byProduct.get(productId) ?? []), value]);
  }
  return products.flatMap((product) => {
    const vendor = product.companyId ? vendorById.get(product.companyId) : undefined;
    if (!vendor) return [];
    const signals = byProduct.get(product.id) ?? [];
    const score = signals.length ? Math.round((signals.reduce((sum, s) => sum + s.score, 0) / signals.length) * 10) / 10 : null;
    const last = signals.reduce<Date | null>((latest, s) => (latest === null || s.createdAt > latest ? s.createdAt : latest), null);
    return [{ productId: product.id, productName: product.name, vendorCompanyId: vendor.id, vendorCompanyName: vendor.name, verticalId: product.verticalId, score, n: signals.length, lastSubmissionAt: last }];
  });
}

/** (b) the portfolio roll-up. Null when the flag is off. */
export async function portfolioRollup(enterpriseId: string): Promise<PortfolioRow[] | null> {
  if (!isEnterpriseEnabled()) return null;
  const vendors = await listOwnedVendorCompanies(enterpriseId);
  return buildPortfolioRollup(await productSignalsForVendors(vendors));
}

/**
 * (c) the market view for one channel: every VENDOR company in the channel inside the
 * enterprise's data-boundary pool (a demo enterprise never sees real vendors and vice
 * versa), ranked. Null when the flag is off.
 */
export async function marketView(enterpriseId: string, verticalId: string): Promise<MarketRow[] | null> {
  if (!isEnterpriseEnabled()) return null;
  const owned = await listOwnedVendorCompanies(enterpriseId);
  const boundary = await resolveCompanyBoundary(owned[0]?.id ?? null);
  const vendors = await prisma.company.findMany({
    where: { type: CompanyType.VENDOR, deletedAt: null, verticalId, dataBoundary: { in: poolForViewerBoundary(boundary) } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, verticalId: true },
  });
  const ownedIds = new Set(owned.map((vendor) => vendor.id));
  return rankMarketView(await productSignalsForVendors(vendors), ownedIds, verticalId);
}

/** The channels (verticalIds) the enterprise's products live in. */
export async function listEnterpriseChannels(enterpriseId: string): Promise<string[]> {
  if (!isEnterpriseEnabled()) return [];
  const vendors = await listOwnedVendorCompanies(enterpriseId);
  if (vendors.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { companyId: { in: vendors.map((vendor) => vendor.id) }, active: true },
    select: { verticalId: true },
    distinct: ["verticalId"],
    orderBy: { verticalId: "asc" },
  });
  const channels = new Set(products.map((product) => product.verticalId));
  for (const vendor of vendors) channels.add(vendor.verticalId);
  return [...channels].sort();
}
