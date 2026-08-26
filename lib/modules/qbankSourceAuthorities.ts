import { ModuleSourceLicense } from "@prisma/client";
import { resolveCurrentVertical, type ResolveVerticalOptions } from "@/lib/verticals/context";
import { loadVerticalPack } from "@/lib/verticals/loader";
import type { QbankSourceAuthority } from "@/lib/modules/qbankParser";

/**
 * Resolve the question-bank citation authorities for the current vertical
 * (VERTICAL-READINESS-AUDIT-2026-08 W4).
 *
 * The five hardcoded branches this replaces — GAO/Green Book, IRS/Circular 230,
 * NIST, FTC/GLBA, COSO — now live in `verticals/accounting/pack.yaml` under
 * `questionBank.sourceAuthorities`. With PAT_ENABLE_VERTICAL_PACKS off the
 * resolver short-circuits to the `"accounting"` constant and this loads that
 * pack's list, which classifies both approved banks identically to the old
 * branches (proved by the preflight diff and by
 * tests/qbank-source-authorities.contract.test.ts).
 *
 * Loading a pack here is safe even flag-off: the only callers are the offline
 * importer, the preflight, and tests. No request path, no query plan.
 */
export async function loadQbankSourceAuthorities(
  options: ResolveVerticalOptions = {}
): Promise<QbankSourceAuthority[]> {
  const verticalId = resolveCurrentVertical(options);
  const pack = await loadVerticalPack(verticalId);
  const declared = pack.questionBank.sourceAuthorities;

  if (declared.length === 0) {
    // Silently classifying every citation UNCLASSIFIED would look like a
    // content defect in the bank rather than a missing manifest block.
    throw new Error(
      `Vertical Pack "${verticalId}" declares no questionBank.sourceAuthorities. ` +
        "Every question-bank citation would import as UNCLASSIFIED."
    );
  }

  return declared.map((authority) => ({
    sourceOrg: authority.org,
    match: authority.match,
    licenseType: ModuleSourceLicense[authority.license],
  }));
}
