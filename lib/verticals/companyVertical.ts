import { DEFAULT_VERTICAL_ID, resolveCurrentVertical } from "./context";
import { isVerticalPacksEnabled, type VerticalEnv } from "./flag";

/**
 * `Company.verticalId` for a company, through the CALLER's database client
 * (legal-load, R64).
 *
 * lib/firmPat.ts and lib/vendorPat.ts are reachable from client bundles (the
 * product assessment clients import them), so they may not import
 * lib/verticals/session.ts: its lazy `import("@/lib/auth/session")` is still
 * resolved by webpack and drags next-auth and node:fs into the client graph.
 * This helper imports nothing but the resolver and the flag, and the caller
 * hands it the Prisma client it already holds.
 *
 * Flag off: the constant, with no read (the §3.3 short-circuit). Flag on: one
 * read of the company's column, then the documented resolution order.
 */
export type CompanyVerticalReader = {
  company: {
    findUnique(args: { where: { id: string }; select: { verticalId: true } }): Promise<{ verticalId: string | null } | null>;
  };
};

export async function resolveVerticalForCompanyWith(
  client: CompanyVerticalReader,
  companyId: string | null | undefined,
  env: VerticalEnv = process.env
): Promise<string> {
  if (!isVerticalPacksEnabled(env)) {
    return DEFAULT_VERTICAL_ID;
  }
  if (!companyId) {
    return resolveCurrentVertical({ env });
  }
  const company = await client.company.findUnique({ where: { id: companyId }, select: { verticalId: true } });
  return resolveCurrentVertical({ session: { company: { verticalId: company?.verticalId ?? null } }, env });
}
