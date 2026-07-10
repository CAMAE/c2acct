import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { buildTenantPlan, tenantScopedModels } from "@/scripts/ops/_tenantOps";

/**
 * Tenant data export / right-to-portability (Governance Phase 2, A8/B1).
 * DRY-RUN BY DEFAULT.
 *
 *   Dry run (default):  node --import tsx scripts/ops/export-tenant.ts <companyId>
 *   Write bundle:       ... <companyId> --execute [--out <dir>]
 *
 * Gathers every row scoped to the tenant (the same schema-derived cascade map as
 * delete-tenant.ts) plus the Company record into a single JSON bundle. Contract
 * partners get this on request; it is also the pre-purge archive. The bundle is
 * written under artifacts/tenant-exports/ (gitignored) — never committed.
 */

type Args = { companyId: string | null; execute: boolean; out: string | null };

function parseArgs(argv: string[]): Args {
  const args: Args = { companyId: null, execute: false, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--execute") args.execute = true;
    else if (a === "--out") args.out = argv[++i] ?? null;
    else if (a === "--company") args.companyId = argv[++i] ?? null;
    else if (!a.startsWith("--") && !args.companyId) args.companyId = a;
  }
  return args;
}

async function main() {
  applyRepoEnv();
  const args = parseArgs(process.argv.slice(2));
  if (!args.companyId) {
    console.error("Usage: export-tenant.ts <companyId> [--execute] [--out <dir>]");
    process.exit(1);
  }

  const { default: prisma } = await import("@/lib/prisma");
  const company = await prisma.company.findUnique({ where: { id: args.companyId } });
  if (!company) {
    console.error(`No company with id ${args.companyId}.`);
    process.exit(1);
  }

  const plan = await buildTenantPlan(prisma as never, company.id);
  console.log(`\n=== Tenant export plan · ${company.name} (${company.id}) ===`);
  for (const entry of plan.cascade.filter((c) => c.count > 0)) {
    console.log(`  ${entry.model.padEnd(28)} ${entry.count}`);
  }
  console.log(`Total scoped rows: ${plan.totalRows}`);

  if (!args.execute) {
    console.log(`\nDRY RUN — nothing written. Re-run with --execute to produce the JSON bundle.`);
    return;
  }

  const bundle: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    company,
    records: {},
  };
  const models = tenantScopedModels();
  for (const entry of models) {
    const delegate = (prisma as unknown as Record<string, { findMany?: (a: unknown) => Promise<unknown[]> }>)[entry.delegate];
    if (delegate?.findMany) {
      (bundle.records as Record<string, unknown>)[entry.model] = await delegate.findMany({ where: { companyId: company.id } });
    }
  }

  const outDir = args.out ?? path.join(process.cwd(), "artifacts", "tenant-exports");
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `tenant-${company.id}-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify(bundle, null, 2));
  console.log(`\nEXPORTED ${plan.totalRows} rows to ${outFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
