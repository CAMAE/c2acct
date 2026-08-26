import { cache } from "react";
import { DEFAULT_VERTICAL_ID, isSyntheticVerticalId, resolveCurrentVertical } from "./context";
import { isVerticalPacksEnabled, type VerticalEnv } from "./flag";

/**
 * The production caller for the resolver's tenant step — the piece PF-1
 * deliberately deferred (VERTICAL-READINESS-AUDIT-2026-08 §3.2 step 2).
 *
 * PF-1 shipped `resolveCurrentVertical({ session })` with no production caller,
 * because wiring `Company.verticalId` at a request boundary means a DB read and
 * §3.3 forbids changing what a default tenant's request does. This module is
 * how the read gets added without breaking that:
 *
 *   flag off ⇒ return the constant. No session read. No company read. Nothing
 *              is awaited that was not awaited before.
 *
 * That is not a comment, it is the assertion in
 * `tests/vertical-session-boundary.contract.test.ts`: the deps are injectable
 * precisely so a test can prove the two readers were called ZERO times with the
 * flag off. "No new DB reads" is only credible as a counted fact.
 *
 * Flag on, the tenant's vertical is read once per request (React `cache`
 * dedupes it across every server component in the tree) and then handed to
 * `verticalFilter()` / `verticalStamp()` / `primeVerticalLexicon()` by the
 * surfaces that need it. Resolution still runs the full documented order, so an
 * operator's explicit argument and `PAT_DEFAULT_VERTICAL` keep their places.
 *
 * A surface that ALREADY loads its Company row should not call this — it should
 * add `verticalId` to that existing `select` under the flag and pass the value
 * down. `lib/modules/portal.ts` is the reference for that shape: one more
 * column on a read that was happening anyway beats a second round trip.
 */

/** Injectable seams — the defaults are the real session and the real database. */
export type VerticalSessionDeps = {
  /** The signed-in user, or null. Never called with the flag off. */
  readSessionCompanyId?: () => Promise<string | null>;
  /** `Company.verticalId` for a company id. Never called with the flag off. */
  readCompanyVerticalId?: (companyId: string) => Promise<string | null>;
  env?: VerticalEnv;
  /** Step 1 of the resolution order — an operator or job naming a vertical. */
  verticalId?: string | null;
};

/**
 * The real session and the real database, imported LAZILY.
 *
 * A static import of `@/lib/auth/session` would drag next-auth (and therefore
 * `next/server`) into every module that imports this file, which is how a
 * framework seam becomes untestable outside a Next runtime. These are only
 * reached on the flag-on path, so with the flag off neither module is even
 * loaded — the short-circuit is cheaper than a no-op, it is absent.
 */
const defaultReadSessionCompanyId = async (): Promise<string | null> => {
  const { getSessionUser } = await import("@/lib/auth/session");
  const user = await getSessionUser();
  return user?.companyId ?? null;
};

const defaultReadCompanyVerticalId = async (companyId: string): Promise<string | null> => {
  const { default: prisma } = await import("@/lib/prisma");
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { verticalId: true },
  });
  return company?.verticalId ?? null;
};

/**
 * Resolve the current request's vertical from the session's tenant.
 *
 * Uncached and dependency-injected: this is the testable core. Production code
 * should call {@link resolveVerticalForRequest}, which memoizes it per request.
 */
export async function resolveVerticalForSession(deps: VerticalSessionDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;

  // The short-circuit, in front of the order and in front of every read. A
  // flag-off request touches neither the session nor the database on this path.
  if (!isVerticalPacksEnabled(env)) {
    return DEFAULT_VERTICAL_ID;
  }

  // Step 1 still wins outright, and costs no read when it is supplied.
  const explicit = deps.verticalId?.trim();
  if (explicit) {
    return assertServableVertical(resolveCurrentVertical({ verticalId: explicit, env }));
  }

  const readSessionCompanyId = deps.readSessionCompanyId ?? defaultReadSessionCompanyId;
  const readCompanyVerticalId = deps.readCompanyVerticalId ?? defaultReadCompanyVerticalId;

  const companyId = await readSessionCompanyId();
  if (!companyId) {
    // Signed out, or a user with no tenant: fall through to env → constant
    // WITHOUT a company read. There is no tenant to read.
    return assertServableVertical(resolveCurrentVertical({ env }));
  }

  const verticalId = await readCompanyVerticalId(companyId);
  return assertServableVertical(resolveCurrentVertical({ session: { company: { verticalId } }, env }));
}

/**
 * A real request may never resolve to a synthetic fixture vertical (W6).
 *
 * The fixture pack exists so cohort isolation can be proved against a genuine
 * second vertical. That makes it a loaded gun: a `Company.verticalId` mis-seeded
 * to a synthetic id would otherwise render fixture nouns to a tenant and file
 * that tenant's rows under a vertical no real cohort should ever contain.
 * Failing here is the whole point — silent acceptance is the bug.
 *
 * The ids themselves live ONLY in `SYNTHETIC_VERTICAL_IDS` (./context.ts), which
 * is the single shipping file allowed to name one — pinned by
 * `tests/vertical-cohort-isolation.contract.test.ts`. Do not quote a fixture id
 * here or anywhere else; ask `isSyntheticVerticalId()` instead.
 */
function assertServableVertical(verticalId: string): string {
  if (isSyntheticVerticalId(verticalId)) {
    throw new Error(
      `Vertical "${verticalId}" is a synthetic test fixture and must never serve a real ` +
        "request. A stored Company.verticalId is pointing at a fixture pack; fix the row " +
        "rather than the guard."
    );
  }
  return verticalId;
}

/**
 * The production entry point: {@link resolveVerticalForSession} memoized for the
 * life of one request, so a page rendering twenty server components resolves the
 * tenant's vertical once. Flag off it returns the constant without awaiting a
 * single read, so the memo is over a function that does no work.
 */
export const resolveVerticalForRequest = cache(async (): Promise<string> => {
  return resolveVerticalForSession();
});

/**
 * The job/operator form: resolve a named company's vertical outside a request.
 * Same short-circuit — flag off, the company is never read.
 */
export async function resolveVerticalForCompany(
  companyId: string,
  deps: VerticalSessionDeps = {}
): Promise<string> {
  return resolveVerticalForSession({
    ...deps,
    readSessionCompanyId: async () => companyId,
  });
}
