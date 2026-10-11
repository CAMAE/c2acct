import prisma from "@/lib/prisma";
import { alignmentIndex } from "@/lib/assessmentCore";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

/**
 * THE single shared reader for a firm's per-module alignment scores and its
 * overall alignment index (Block 12f — number integrity, Elite layer).
 *
 * Every quantity that PAT presents as "your module score" or "your alignment
 * index" — on Pro panes, Elite panes, face cards, and what-this-means prose —
 * must come from HERE, not from parallel accessors (stale CompanyBenchmark
 * scores, FirmMaturitySnapshot rollups, or per-theme subset averages). Reads the
 * latest FINAL SurveySubmission score per module — the same source the Pro
 * insight reports and the assessment-progress radar already use.
 */

export type FirmAlignmentSignal = {
  /** moduleKey -> latest final submission score (null when the module has no final). */
  moduleScores: Map<string, number | null>;
  /**
   * lib/assessmentCore.alignmentIndex over the module scores: the equal-weight
   * mean, or null under three final modules (ruling 15; the surface says Partial).
   */
  alignmentIndex: number | null;
};

export async function getFirmAlignmentSignal(companyId: string): Promise<FirmAlignmentSignal> {
  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((module) => module.key);
  const [modules, submissions] = await Promise.all([
    prisma.surveyModule.findMany({ where: { key: { in: moduleKeys } }, select: { id: true, key: true } }),
    prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({ companyId, SurveyModule: { key: { in: moduleKeys } } }),
      orderBy: { createdAt: "desc" },
      select: { moduleId: true, score: true },
    }),
  ]);
  const keyByModuleId = new Map(modules.map((module) => [module.id, module.key]));
  const latestByModule = new Map<string, number | null>();
  for (const submission of submissions) {
    const key = keyByModuleId.get(submission.moduleId);
    if (key && !latestByModule.has(key)) latestByModule.set(key, submission.score);
  }
  const moduleScores = new Map<string, number | null>();
  for (const key of moduleKeys) moduleScores.set(key, latestByModule.get(key) ?? null);
  return { moduleScores, alignmentIndex: alignmentIndex(moduleScores.values()) };
}
