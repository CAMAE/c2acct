import type { PrismaClient } from "@prisma/client";
import { MembershipPlan, MembershipStatus } from "@prisma/client";
import { findLocalReviewUserByEmail } from "@/lib/auth/localReview";
import { loadFirmAlignmentModules, seedFirmAlignmentSubmission } from "@/lib/demoPatEcosystemSeed";
import type { DemoFirmInput } from "@/data/demoPatEcosystem";

/**
 * A4 (route atlas box): the local-review firm identity (review.firm@pat.local)
 * at 5/5 firm alignment modules complete with DETERMINISTIC answers, so every
 * post-completion unlock in this repo fires and Cam can view the result on the
 * flag-on preview as review.firm.
 *
 * Plan is left as-is (Pro): preview-pat-setup keeps review.firm as the Pro-teaser
 * reference and provisions demo-firm-elite@pat.local as the Elite fixture; the
 * Elite-only surfaces are viewed as that account. Idempotent: the seed helper
 * overwrites the same submission ids in place.
 */
export const REVIEW_FIRM_EMAIL = "review.firm@pat.local";

const REVIEW_FIRM_INPUT: DemoFirmInput = {
  key: "local-review-firm",
  displayName: "Local Review Firm",
  industry: "Public accounting",
  sizeBand: "25-100 employees",
  maturityLevel: "Established",
  integrationNeeds: ["client portal", "QuickBooks Online"],
  riskFlags: ["growth straining coordination"],
  scoreTarget: 4.2, // high enough that every module clears the tier-1 capability thresholds (60/65) after the per-module spread
  membership: { plan: MembershipPlan.PRO, status: MembershipStatus.ACTIVE },
};

export async function seedReviewFirmFullAssessment(prisma: PrismaClient): Promise<{
  companyId: string;
  modulesSeeded: number;
} | null> {
  const entry = findLocalReviewUserByEmail(REVIEW_FIRM_EMAIL);
  if (!entry) return null;
  const user = await prisma.user.findUnique({ where: { email: REVIEW_FIRM_EMAIL }, select: { companyId: true } });
  if (!user?.companyId) return null;
  const subject = await prisma.subject.findUnique({ where: { companyId: user.companyId }, select: { id: true } });
  if (!subject) return null;

  const modules = await loadFirmAlignmentModules(prisma);
  for (const [moduleIndex, module] of modules.entries()) {
    await seedFirmAlignmentSubmission(prisma, {
      firm: REVIEW_FIRM_INPUT,
      companyId: user.companyId,
      subjectId: subject.id,
      module,
      moduleIndex,
      firmIndex: 1, // fixed shape → same answers every run
    });
  }
  return { companyId: user.companyId, modulesSeeded: modules.length };
}
