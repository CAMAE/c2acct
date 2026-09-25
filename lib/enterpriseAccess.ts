import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getEnterpriseAccessStateForUser, isEnterpriseEnabled, ownsCompany, type EnterpriseAccessState } from "@/lib/enterprise";

/**
 * 3e (R51): the route gates for app/(app)/enterprise/*. Kept apart from
 * lib/enterprise.ts so the readers stay importable outside Next (scripts, tests).
 */
/**
 * Route gate for app/(app)/enterprise/*: the flag off, no session or no membership all
 * read as notFound() — the portal does not exist for anyone else (R51).
 */
export async function requireEnterpriseAccess(): Promise<EnterpriseAccessState> {
  if (!isEnterpriseEnabled()) notFound();
  const state = await getEnterpriseAccessStateForUser(await getSessionUser());
  if (!state) notFound();
  return state;
}

/** Owned-company gate for briefing routes: null when the company is outside the enterprise. */
export async function requireEnterpriseCompanyAccess(companyId: string): Promise<EnterpriseAccessState | null> {
  const state = await requireEnterpriseAccess();
  return ownsCompany(state, companyId) ? state : null;
}
