import { DataBoundary } from "@prisma/client";

/**
 * Idempotent boundary classifier (2026-07-09 audit, CLASS 1). Runs the SAME
 * rules as migration 20260709160000, but at the END of every demo/pilot seed so
 * a `db:recreate` + reseed (which inserts companies with the PRODUCTION default)
 * stays classified. Closes the "unowned seam" permanently: seeds don't have to
 * remember to set dataBoundary at each of their scattered create sites.
 *
 * Rules (id namespace is comprehensive; email domain is a safety net):
 *  - id startsWith "demo-"           → DEMO  (demo-firm-company-, demo-vendor-
 *    company-, demo-bench-firm-, demo-expand-firm-, demo-expand-vendor-, demo-elite-*)
 *  - id startsWith "pilot-company-"  → PILOT
 *  - linked user email in a demo domain → DEMO (catch anything the id misses)
 */
type ClassifierClient = {
  company: {
    updateMany: (args: {
      where: Record<string, unknown>;
      data: { dataBoundary: DataBoundary };
    }) => Promise<{ count: number }>;
  };
  user: {
    findMany: (args: {
      where: Record<string, unknown>;
      select: { companyId: true };
    }) => Promise<Array<{ companyId: string | null }>>;
  };
};

export async function classifyCompanyBoundaries(
  client: ClassifierClient
): Promise<{ demo: number; pilot: number }> {
  const demoById = await client.company.updateMany({
    where: { id: { startsWith: "demo-" } },
    data: { dataBoundary: DataBoundary.DEMO },
  });

  const pilotById = await client.company.updateMany({
    where: { id: { startsWith: "pilot-company-" } },
    data: { dataBoundary: DataBoundary.PILOT },
  });

  // Safety net: companies whose linked users sit in a demo email domain but
  // whose id somehow missed the namespace. Never downgrades an already-DEMO row.
  const demoUsers = await client.user.findMany({
    where: {
      companyId: { not: null },
      OR: [
        { email: { endsWith: "@demo-bench.pat.local" } },
        { email: { endsWith: "@demo-expand.pat.local" } },
        { email: { endsWith: "@patalign.test" } },
        { AND: [{ email: { startsWith: "review." } }, { email: { endsWith: "@pat.local" } }] },
        { AND: [{ email: { startsWith: "demo-" } }, { email: { endsWith: "@pat.local" } }] },
      ],
    },
    select: { companyId: true },
  });
  const ids = Array.from(
    new Set(demoUsers.map((user) => user.companyId).filter((id): id is string => Boolean(id)))
  );
  let demoByEmail = 0;
  if (ids.length > 0) {
    const result = await client.company.updateMany({
      where: { id: { in: ids }, dataBoundary: { not: DataBoundary.DEMO } },
      data: { dataBoundary: DataBoundary.DEMO },
    });
    demoByEmail = result.count;
  }

  return { demo: demoById.count + demoByEmail, pilot: pilotById.count };
}
