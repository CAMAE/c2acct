import prisma from "@/lib/prisma";
import { poolForViewerBoundary, resolveCompanyBoundary } from "@/lib/dataBoundary";
import { DataBoundary } from "@prisma/client";

/**
 * Pilot tenancy boundary (5.7 audit §6.4 / Q6 of the locked consultant scope).
 *
 * `ecosystem-bounded` — pilot default. Vendors only see firms in their ecosystem;
 * firms only see vendors in their ecosystem. Enforced at the read-path level by
 * filtering through {@link getVendorScopedFirms} / {@link getFirmScopedVendors}.
 *
 * `open` — post-pilot toggle (~6 months out). Returns the global FIRM/VENDOR set.
 *
 * Default value when the env var is unset or any non-`open` string: `ecosystem-bounded`.
 */
export const TENANCY_MODE_ENV = "PAT_TENANCY_MODE";

export type TenancyMode = "ecosystem-bounded" | "open";

export function getTenancyMode(env: NodeJS.ProcessEnv = process.env): TenancyMode {
  const raw = env[TENANCY_MODE_ENV];
  return raw === "open" ? "open" : "ecosystem-bounded";
}

/**
 * For a vendor company, return the firm IDs it can see.
 *
 * - `ecosystem-bounded` (default): firms in the same ecosystem as the vendor
 *   (i.e., `EcosystemFirm.firmCompanyId` for the vendor's `Ecosystem.id`).
 * - `open`: every Company with `type = FIRM`.
 */
export async function getVendorScopedFirms(
  vendorCompanyId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<string[]> {
  // Data-integrity wall (CLASS 1): the firm set is scoped to the viewer vendor's
  // boundary pool — a real vendor never pools demo firms; a demo vendor sees
  // only demo firms. Applied in BOTH tenancy modes.
  const pool = poolForViewerBoundary(await resolveCompanyBoundary(vendorCompanyId));

  if (getTenancyMode(env) === "open") {
    const firms = await prisma.company.findMany({
      where: { type: "FIRM", dataBoundary: { in: pool } },
      select: { id: true },
    });
    return firms.map((firm) => firm.id);
  }

  const ecosystem = await prisma.ecosystem.findUnique({
    where: { vendorCompanyId },
    select: {
      EcosystemFirm: {
        select: { firmCompanyId: true },
      },
    },
  });

  if (!ecosystem) {
    return [];
  }

  const firmIds = ecosystem.EcosystemFirm.map((membership) => membership.firmCompanyId);
  if (firmIds.length === 0) {
    return [];
  }
  // Defense-in-depth: drop any ecosystem firm outside the viewer's pool.
  const inPool = await prisma.company.findMany({
    where: { id: { in: firmIds }, dataBoundary: { in: pool } },
    select: { id: true },
  });
  return inPool.map((firm) => firm.id);
}

/**
 * For a firm company, return the vendor IDs it can see.
 *
 * - `ecosystem-bounded` (default): the single vendor of the firm's ecosystem
 *   (returns 0 or 1 vendor IDs in pilot — strict 1:1 + nullable vendorCompanyId).
 * - `open`: every Company with `type = VENDOR`.
 */
export async function getFirmScopedVendors(
  firmCompanyId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<string[]> {
  // Data-integrity wall (CLASS 1): vendors scoped to the viewer firm's pool.
  const pool = poolForViewerBoundary(await resolveCompanyBoundary(firmCompanyId));

  if (getTenancyMode(env) === "open") {
    const vendors = await prisma.company.findMany({
      where: { type: "VENDOR", dataBoundary: { in: pool } },
      select: { id: true },
    });
    return vendors.map((vendor) => vendor.id);
  }

  const membership = await prisma.ecosystemFirm.findUnique({
    where: { firmCompanyId },
    select: {
      Ecosystem: {
        select: { vendorCompanyId: true },
      },
    },
  });

  const vendorId = membership?.Ecosystem.vendorCompanyId ?? null;
  if (!vendorId) {
    return [];
  }
  // Defense-in-depth: only if the ecosystem vendor is in the viewer's pool.
  const vendor = await prisma.company.findFirst({
    where: { id: vendorId, dataBoundary: { in: pool } },
    select: { id: true },
  });
  return vendor ? [vendor.id] : [];
}

/**
 * R49 (2026-09-16): assertEcosystemPair for a firm set in one read per mode. Same
 * rule as the single-pair check: ecosystem-bounded → the firm's EcosystemFirm row
 * points at the vendor's ecosystem; open → company types. Returns the firms that
 * FAIL the check (empty = every pair holds).
 */
export async function assertEcosystemPairs(
  vendorCompanyId: string,
  firmCompanyIds: string[],
  env: NodeJS.ProcessEnv = process.env
): Promise<string[]> {
  if (firmCompanyIds.length === 0) return [];
  if (getTenancyMode(env) === "open") {
    const companies = await prisma.company.findMany({
      where: { id: { in: [vendorCompanyId, ...firmCompanyIds] } },
      select: { id: true, type: true },
    });
    const typeById = new Map(companies.map((company) => [company.id, company.type]));
    const vendorOk = typeById.get(vendorCompanyId) === "VENDOR";
    return firmCompanyIds.filter((firmId) => !(vendorOk && typeById.get(firmId) === "FIRM"));
  }
  const memberships = await prisma.ecosystemFirm.findMany({
    where: { firmCompanyId: { in: firmCompanyIds } },
    select: { firmCompanyId: true, Ecosystem: { select: { vendorCompanyId: true } } },
  });
  const vendorByFirm = new Map(memberships.map((row) => [row.firmCompanyId, row.Ecosystem.vendorCompanyId]));
  return firmCompanyIds.filter((firmId) => vendorByFirm.get(firmId) !== vendorCompanyId);
}

/**
 * R49 (2026-09-16): getFirmScopedVendors for a firm set — the same rule (viewer
 * pool from the firm's boundary; open mode → every VENDOR in the pool; bounded →
 * the firm's ecosystem vendor if it is in the pool), three reads for the whole
 * set instead of three per firm. Unknown firm → PRODUCTION boundary, as
 * resolveCompanyBoundary fails closed.
 */
export async function getFirmScopedVendorsForFirms(
  firmCompanyIds: string[],
  env: NodeJS.ProcessEnv = process.env
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (firmCompanyIds.length === 0) return result;
  const firms = await prisma.company.findMany({
    where: { id: { in: firmCompanyIds } },
    select: { id: true, dataBoundary: true },
  });
  const boundaryById = new Map(firms.map((firm) => [firm.id, firm.dataBoundary]));
  const poolFor = (firmId: string) => poolForViewerBoundary(boundaryById.get(firmId) ?? DataBoundary.PRODUCTION);
  if (getTenancyMode(env) === "open") {
    const vendors = await prisma.company.findMany({
      where: { type: "VENDOR" },
      select: { id: true, dataBoundary: true },
    });
    for (const firmId of firmCompanyIds) {
      const pool = new Set(poolFor(firmId));
      result.set(firmId, vendors.filter((vendor) => pool.has(vendor.dataBoundary)).map((vendor) => vendor.id));
    }
    return result;
  }
  const memberships = await prisma.ecosystemFirm.findMany({
    where: { firmCompanyId: { in: firmCompanyIds } },
    select: { firmCompanyId: true, Ecosystem: { select: { vendorCompanyId: true } } },
  });
  const vendorIdByFirm = new Map(memberships.map((row) => [row.firmCompanyId, row.Ecosystem.vendorCompanyId]));
  const vendorIds = [...new Set([...vendorIdByFirm.values()].filter((id): id is string => typeof id === "string"))];
  const vendors = vendorIds.length
    ? await prisma.company.findMany({ where: { id: { in: vendorIds } }, select: { id: true, dataBoundary: true } })
    : [];
  const vendorBoundaryById = new Map(vendors.map((vendor) => [vendor.id, vendor.dataBoundary]));
  for (const firmId of firmCompanyIds) {
    const vendorId = vendorIdByFirm.get(firmId) ?? null;
    const boundary = vendorId ? vendorBoundaryById.get(vendorId) : undefined;
    result.set(firmId, vendorId && boundary !== undefined && poolFor(firmId).includes(boundary) ? [vendorId] : []);
  }
  return result;
}

/**
 * Convenience: assert that a (vendor, firm) pair belongs to the same ecosystem.
 *
 * - `ecosystem-bounded`: true iff `EcosystemFirm.firmCompanyId = firmId` AND
 *   `Ecosystem.vendorCompanyId = vendorId` for the same Ecosystem row.
 * - `open`: true iff vendor company is type `VENDOR` and firm company is type
 *   `FIRM` (sanity, not relation-checked).
 */
export async function assertEcosystemPair(
  vendorCompanyId: string,
  firmCompanyId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  if (getTenancyMode(env) === "open") {
    const [vendor, firm] = await Promise.all([
      prisma.company.findUnique({
        where: { id: vendorCompanyId },
        select: { type: true },
      }),
      prisma.company.findUnique({
        where: { id: firmCompanyId },
        select: { type: true },
      }),
    ]);
    return vendor?.type === "VENDOR" && firm?.type === "FIRM";
  }

  const membership = await prisma.ecosystemFirm.findUnique({
    where: { firmCompanyId },
    select: {
      Ecosystem: {
        select: { vendorCompanyId: true },
      },
    },
  });

  return membership?.Ecosystem.vendorCompanyId === vendorCompanyId;
}
