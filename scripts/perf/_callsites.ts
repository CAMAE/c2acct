import prisma from "@/lib/prisma";
import { applyRepoEnv } from "@/lib/env/repoEnv";

/** Which of OUR functions issue the hot query shapes? */
async function main() {
  applyRepoEnv();
  const sites = new Map<string, number>();
  let collecting = false;
  const WATCH = new Set(["Ecosystem.findUnique", "SurveyModule.findUnique", "Company.findUnique", "SurveySubmission.findMany"]);

  prisma.$use(async (params, next) => {
    const key = `${params.model ?? "raw"}.${params.action}`;
    if (collecting && WATCH.has(key)) {
      const stack = (new Error().stack ?? "").split("\n");
      // First frame inside lib/ that is not prisma plumbing.
      const frame = stack.find((l) => /\/lib\/[a-zA-Z]/.test(l) && !/lib\/prisma/.test(l));
      const label = frame ? frame.trim().replace(/^at\s+/, "").replace(/\s+\(.*$/, "") : "unknown";
      const at = `${key}  <-  ${label}`;
      sites.set(at, (sites.get(at) ?? 0) + 1);
    }
    return next(params);
  });

  const eco = await prisma.ecosystem.findFirst({ where: { id: { startsWith: "perf-scale" } }, select: { id: true } });
  const assignment = await prisma.consultantAssignment.findFirst({
    where: { ecosystemId: eco!.id, active: true },
    select: { consultantProfileId: true, ecosystemId: true },
  });
  const { getEcosystemDetailForConsultant } = await import("@/lib/ecosystem");

  collecting = true;
  await getEcosystemDetailForConsultant(assignment!.consultantProfileId, assignment!.ecosystemId);
  collecting = false;

  for (const [site, count] of [...sites.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
    console.log(`x${String(count).padStart(5)}  ${site}`);
  }
  await prisma.$disconnect();
}
main();
