import { randomUUID } from "node:crypto";
import { DataBoundary, type PrismaClient } from "@prisma/client";
import { alignmentIndex } from "@/lib/assessmentCore";
import { maturityBandFor } from "@/lib/bandLexicon";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

/**
 * Firm maturity + trajectory writer (B5-5, closes the F3 §1.3 amendment). Turns a
 * firm's latest final module scores into an alignment index, and appends a
 * FirmMaturitySnapshot so the Trajectory surface (F3) charts REAL history over
 * time for production/pilot firms. Demo firms are untouched (their seeded history
 * stands). Nothing here fabricates history — one snapshot per write event.
 */

export const MATURITY_SNAPSHOT_VERSION = 1;

// enforce-core (R62, ruling 6): the band table that lived here is retired; the
// stored tier is the one score-band lexicon's band (lib/bandLexicon.maturityBandFor).

type MaturityClient = Pick<
  PrismaClient,
  "surveySubmission" | "firmMaturityIndex" | "firmMaturitySnapshot" | "company"
>;

/**
 * The firm's alignment index from its latest final module scores, through the
 * one computation (lib/assessmentCore.alignmentIndex: equal weight, null under
 * three final modules). Null means no snapshot is written.
 */
export async function computeFirmAlignmentIndex(
  client: Pick<PrismaClient, "surveySubmission">,
  companyId: string
): Promise<number | null> {
  const submissions = await client.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      SurveyModule: { key: { in: FIRM_MODULE_DEFINITIONS.map((m) => m.key) } },
      companyId,
    }),
    orderBy: { createdAt: "desc" },
    select: { score: true, moduleId: true },
  });
  const latestByModule = new Map<string, number>();
  for (const s of submissions) {
    if (typeof s.score !== "number") continue;
    if (!latestByModule.has(s.moduleId)) latestByModule.set(s.moduleId, s.score);
  }
  return alignmentIndex(latestByModule.values());
}

/**
 * Compute + persist the firm's maturity index and APPEND a snapshot. Skips DEMO
 * firms. Accepts a tx client so it composes into the submit transaction. Returns
 * the written score, or null when skipped (no evidence / demo).
 */
export async function writeFirmMaturitySnapshot(
  client: MaturityClient,
  companyId: string,
  options?: { at?: Date; skipIfDemo?: boolean }
): Promise<{ score: number } | null> {
  const skipIfDemo = options?.skipIfDemo ?? true;
  if (skipIfDemo) {
    const company = await client.company.findUnique({ where: { id: companyId }, select: { dataBoundary: true } });
    if (company?.dataBoundary === DataBoundary.DEMO) return null; // demo history is seeded, untouched
  }

  const score = await computeFirmAlignmentIndex(client, companyId);
  if (score === null) return null;
  const tier = maturityBandFor(score);
  const computedAt = options?.at ?? new Date();

  await client.firmMaturityIndex.upsert({
    where: { companyId_version: { companyId, version: MATURITY_SNAPSHOT_VERSION } },
    create: {
      id: randomUUID(),
      companyId,
      score,
      tier: tier.tier,
      bandMin: tier.bandMin,
      bandMax: tier.bandMax,
      version: MATURITY_SNAPSHOT_VERSION,
    },
    update: { score, tier: tier.tier, bandMin: tier.bandMin, bandMax: tier.bandMax, computedAt },
  });
  await client.firmMaturitySnapshot.create({
    data: {
      id: randomUUID(),
      companyId,
      score,
      tier: tier.tier,
      bandMin: tier.bandMin,
      bandMax: tier.bandMax,
      version: MATURITY_SNAPSHOT_VERSION,
      computedAt,
    },
  });
  return { score };
}
