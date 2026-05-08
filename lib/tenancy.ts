import prisma from "@/lib/prisma";

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
  if (getTenancyMode(env) === "open") {
    const firms = await prisma.company.findMany({
      where: { type: "FIRM" },
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

  return ecosystem.EcosystemFirm.map((membership) => membership.firmCompanyId);
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
  if (getTenancyMode(env) === "open") {
    const vendors = await prisma.company.findMany({
      where: { type: "VENDOR" },
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
  return vendorId ? [vendorId] : [];
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
