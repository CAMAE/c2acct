import type { PrismaClient } from "@prisma/client";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { readFreshness, type FreshnessReading } from "@/lib/freshness";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

/**
 * pattern box A (R60, R-O, audit G2): ONE reader for a firm's evidence freshness.
 * Definition (the ecosystem page's): the newest FINAL firm module submission
 * across the five modules, classified by the published windows in lib/freshness
 * (Fresh, Aging, Stale). The Guide freshness panel (lib/consultantFreshness) and
 * the Elite surfaces (lib/eliteInsightsV2 getFirmEvidenceFreshness) both import
 * this; neither reads firmMaturitySnapshot.computedAt any more, which is what
 * made the panel say "Fresh" while the ecosystem page said "Aging" for one firm.
 */
export type FirmFreshnessClient = {
  surveySubmission: {
    findMany: (args: {
      where: unknown;
      orderBy: { createdAt: "desc" };
      select: { companyId: true; createdAt: true };
    }) => Promise<Array<{ companyId: string; createdAt: Date }>>;
  };
};

/** The live client or a test fake; Prisma's generic findMany is narrowed at the call. */
export type FirmFreshnessSource = FirmFreshnessClient | Pick<PrismaClient, "surveySubmission">;

const FIRM_MODULE_KEYS = FIRM_MODULE_DEFINITIONS.map((definition) => definition.key);

/** Newest FINAL module submission per firm, batched for a firm set. */
export async function getNewestFinalModuleSubmissionByFirm(
  source: FirmFreshnessSource,
  firmIds: readonly string[]
): Promise<Map<string, Date | null>> {
  const newest = new Map<string, Date | null>(firmIds.map((firmId) => [firmId, null]));
  if (firmIds.length === 0) return newest;
  const client = source as FirmFreshnessClient;
  const rows = await client.surveySubmission.findMany({
    where: getSurveyFinalWhere({ companyId: { in: [...firmIds] }, SurveyModule: { key: { in: FIRM_MODULE_KEYS } } }),
    orderBy: { createdAt: "desc" },
    select: { companyId: true, createdAt: true },
  });
  for (const row of rows) {
    if (newest.get(row.companyId) == null) newest.set(row.companyId, row.createdAt);
  }
  return newest;
}

/** The freshness reading for one firm (null when the firm has no final module submission). */
export async function getFirmFreshness(
  client: FirmFreshnessSource,
  companyId: string,
  now: Date = new Date()
): Promise<FreshnessReading | null> {
  const newest = await getNewestFinalModuleSubmissionByFirm(client, [companyId]);
  return readFreshness(newest.get(companyId) ?? null, now);
}

/** The freshness readings for a firm set, one query. */
export async function getFirmFreshnessForFirms(
  client: FirmFreshnessSource,
  firmIds: readonly string[],
  now: Date = new Date()
): Promise<Map<string, { newest: Date | null; freshness: FreshnessReading | null }>> {
  const newestByFirm = await getNewestFinalModuleSubmissionByFirm(client, firmIds);
  return new Map(
    [...newestByFirm.entries()].map(([firmId, newest]) => [firmId, { newest, freshness: readFreshness(newest, now) }])
  );
}
