import { applyRepoEnv } from "@/lib/env/repoEnv";
import { getFirmAssessmentProgressForFirms, summarizeFirmAlignmentProgress } from "@/lib/firmPat";

/**
 * enforce-core (R62, item 12): dismiss the PENDING nudge drafts that predate Box A —
 * a draft whose firm is already at 5 of 5 modules, or whose body still says
 * "consultant". Prints every matched draft and the counts; writes ONLY with
 * --apply, and touches nothing but NudgeDraft.status / decidedAt on the matched
 * rows (R-S: no other rows).
 *
 *   node --import tsx scripts/ops/dismiss-stale-nudge-drafts.ts            # DRY RUN
 *   node --import tsx scripts/ops/dismiss-stale-nudge-drafts.ts --apply    # writes
 */
const APPLY = process.argv.includes("--apply");

async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  console.log(`database: ${process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : "(unset)"}`);
  const drafts = await prisma.nudgeDraft.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true, companyId: true, audience: true, title: true, body: true, createdAt: true, Company: { select: { name: true } } },
  });
  const firmIds = [...new Set(drafts.map((d) => d.companyId))];
  const progress = firmIds.length > 0 ? await getFirmAssessmentProgressForFirms(firmIds) : new Map();
  const matched: Array<{ id: string; firm: string; reason: string }> = [];
  for (const draft of drafts) {
    const summary = summarizeFirmAlignmentProgress(progress.get(draft.companyId) ?? []);
    const reasons: string[] = [];
    if (summary.completedModules === summary.totalModules && summary.totalModules > 0) reasons.push(`firm at ${summary.completedModules} of ${summary.totalModules} modules`);
    if (/consultant/i.test(draft.body)) reasons.push('body contains "consultant"');
    if (reasons.length > 0) matched.push({ id: draft.id, firm: draft.Company?.name ?? draft.companyId, reason: reasons.join("; ") });
  }
  console.log(`\n================ DISMISS STALE NUDGE DRAFTS — ${APPLY ? "APPLY" : "DRY RUN"} ================`);
  console.log(`pending drafts: ${drafts.length}`);
  for (const draft of drafts) {
    const hit = matched.find((m) => m.id === draft.id);
    console.log(`  ${hit ? "DISMISS" : "keep   "} ${draft.id} ${draft.audience} ${draft.Company?.name ?? draft.companyId} · "${draft.title}" · ${draft.createdAt.toISOString().slice(0, 10)}${hit ? ` · ${hit.reason}` : ""}`);
  }
  console.log(`to dismiss: ${matched.length}; to keep: ${drafts.length - matched.length}`);
  if (!APPLY) {
    console.log("DRY RUN — nothing written. Re-run with --apply.");
  } else if (matched.length > 0) {
    const result = await prisma.nudgeDraft.updateMany({
      where: { id: { in: matched.map((m) => m.id) }, status: "PENDING" },
      data: { status: "DISMISSED", decidedAt: new Date() },
    });
    const remaining = await prisma.nudgeDraft.count({ where: { status: "PENDING" } });
    console.log(`dismissed: ${result.count}; pending now: ${remaining}`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("dismiss failed:", error);
  process.exitCode = 1;
});
