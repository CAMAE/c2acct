import { randomUUID } from "node:crypto";
import { applyRepoEnv } from "@/lib/env/repoEnv";
import {
  buildTenantPlan,
  softDeleteTenant,
  hardPurgeTenant,
  EXTERNAL_TOUCHPOINTS,
  RETAINED_ON_DELETE,
} from "@/scripts/ops/_tenantOps";
import { isTenantPurgeEligible, TENANT_SOFT_DELETE_WINDOW_DAYS } from "@/lib/retention";

/**
 * Tenant right-to-delete (Governance Phase 2, A8/B1). DRY-RUN BY DEFAULT.
 *
 *   Dry run (default):   node --import tsx scripts/ops/delete-tenant.ts <companyId>
 *   Soft delete:         ... <companyId> --execute --reason "customer request"
 *   Hard purge:          ... <companyId> --hard            (only after the window)
 *   Force hard purge:    ... <companyId> --hard --force    (skip window — operator override)
 *
 * Flow: soft-delete sets Company.deletedAt (retained TENANT_SOFT_DELETE_WINDOW_DAYS
 * for recovery/dispute) → hard purge deletes the Company (DB FK cascade removes
 * scoped children). Every action writes a TenantDeletionReceipt tombstone with the
 * per-model cascade counts and the external-touchpoint checklist. Billing/legal
 * records (see RETAINED_ON_DELETE) must be archived/anonymized manually before a
 * hard purge — the script prints the warning and never silently destroys them.
 */

type Args = {
  companyId: string | null;
  execute: boolean;
  hard: boolean;
  force: boolean;
  reason: string | null;
  requestedBy: string | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { companyId: null, execute: false, hard: false, force: false, reason: null, requestedBy: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--execute") args.execute = true;
    else if (a === "--hard") args.hard = true;
    else if (a === "--force") args.force = true;
    else if (a === "--reason") args.reason = argv[++i] ?? null;
    else if (a === "--requested-by") args.requestedBy = argv[++i] ?? null;
    else if (a === "--company") args.companyId = argv[++i] ?? null;
    else if (!a.startsWith("--") && !args.companyId) args.companyId = a;
  }
  return args;
}

async function main() {
  applyRepoEnv();
  const args = parseArgs(process.argv.slice(2));
  if (!args.companyId) {
    console.error("Usage: delete-tenant.ts <companyId> [--execute] [--hard] [--force] [--reason <text>] [--requested-by <id>]");
    process.exit(1);
  }

  const { default: prisma } = await import("@/lib/prisma");
  const company = await prisma.company.findUnique({
    where: { id: args.companyId },
    select: { id: true, name: true, type: true, dataBoundary: true, deletedAt: true },
  });
  if (!company) {
    console.error(`No company with id ${args.companyId}.`);
    process.exit(1);
  }

  const plan = await buildTenantPlan(prisma as never, company.id);

  console.log(`\n=== Tenant delete plan · ${company.name} (${company.id}) ===`);
  console.log(`type=${company.type} boundary=${company.dataBoundary} deletedAt=${company.deletedAt ?? "—"}`);
  console.log(`\nCascade (rows scoped to this tenant, ${plan.totalRows} total):`);
  for (const entry of plan.cascade.filter((c) => c.count > 0)) {
    console.log(`  ${entry.model.padEnd(28)} ${entry.count}`);
  }
  console.log(`\nRetained as legal/financial records (NOT auto-purged): ${RETAINED_ON_DELETE.join(", ")}`);
  console.log(`\nExternal touchpoints (manual):`);
  for (const t of EXTERNAL_TOUCHPOINTS) console.log(`  [${t.system}] ${t.action}`);

  const mode = args.hard ? "hard" : "soft";

  if (!args.execute && !args.hard) {
    console.log(`\nDRY RUN — nothing changed. Re-run with --execute (soft) or --hard (purge).`);
    return;
  }

  if (args.hard && !args.force) {
    if (!company.deletedAt) {
      console.error(`\nRefusing hard purge: tenant is not soft-deleted. Run --execute first, then --hard after the ${TENANT_SOFT_DELETE_WINDOW_DAYS}-day window (or --force to override).`);
      process.exit(1);
    }
    if (!isTenantPurgeEligible(company.deletedAt)) {
      console.error(`\nRefusing hard purge: soft-delete window (${TENANT_SOFT_DELETE_WINDOW_DAYS} days) has not elapsed. Use --force to override.`);
      process.exit(1);
    }
  }

  const summary = {
    id: company.id,
    name: company.name,
    type: String(company.type),
    dataBoundary: String(company.dataBoundary),
    deletedAt: company.deletedAt,
  };
  const opts = { id: randomUUID(), reason: args.reason, requestedBy: args.requestedBy };

  if (mode === "soft") {
    const receipt = await softDeleteTenant(prisma as never, summary, plan, opts);
    console.log(`\nSOFT-DELETED. Tenant retained ${TENANT_SOFT_DELETE_WINDOW_DAYS} days, then --hard to purge. Receipt ${receipt.id}.`);
    return;
  }

  const receipt = await hardPurgeTenant(prisma as never, summary, plan, opts);
  console.log(`\nHARD-PURGED via DB cascade. Receipt ${receipt.id}. Complete the external touchpoints above.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
