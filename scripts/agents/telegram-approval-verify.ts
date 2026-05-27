// Phase 1d verification harness (no poller required for seed/badmac/status).
//   seed                 — create a parent run + 3 synthetic pending approvals and
//                          send their cards to Telegram (verification 8a, and the
//                          rows tapped/replied for 8b/8c/8d).
//   badmac <approvalId>  — fire a bad-HMAC callback through the real onCallbackQuery
//                          and confirm no decision is recorded + a blocked audit row
//                          is written (verification 8f).
//   status [approvalId]  — show recent demo approvals + their decisions + audit.
import prisma from "@/lib/prisma";
import { toJsonValue } from "@/lib/agents/json";
import { onCallbackQuery, sendApprovalToTelegram } from "@/ops/telegram-bot/approvals";
import { loadEnv } from "../_shared/prismaScript";

const DEMO_AGENT = "pilot-ops";

async function ensureDemoDefinition(): Promise<void> {
  await prisma.agentDefinition.upsert({
    where: { key: DEMO_AGENT },
    create: { key: DEMO_AGENT, name: "Pilot Ops Agent", description: "Phase 1b (gated).", configYaml: "{}", enabled: false },
    update: {},
  });
}

async function seed(): Promise<void> {
  await ensureDemoDefinition();
  const run = await prisma.agentRun.create({
    data: { agentKey: DEMO_AGENT, trigger: "test", triggerSource: "approval-verify", status: "awaiting_approval" },
  });

  const specs = [
    { action: "gmail.send", blast: "high", args: { to: "firm@example.com", subject: "Welcome to the PAT pilot" }, note: "tap ✅ Approve (8b)" },
    { action: "neon.write:PilotInvitation", blast: "medium", args: { firm: "ABC LLP", seats: 3 }, note: "tap ❌ Deny (8c)" },
    { action: "gmail.send", blast: "high", args: { to: "firm2@example.com", subject: "Welcome to the PAT pilot" }, note: 'reply "approve but change subject to: TEST EDIT" (8d)' },
  ];

  console.log(`Seeded run ${run.id}. Created approvals:`);
  for (const spec of specs) {
    const approval = await prisma.agentApproval.create({
      data: {
        runId: run.id,
        agentKey: DEMO_AGENT,
        proposedAction: spec.action,
        proposedArgs: toJsonValue(spec.args),
        blastRadius: spec.blast,
        rationale: "Phase 1d verification synthetic approval.",
        status: "pending",
      },
    });
    await sendApprovalToTelegram(approval.id);
    console.log(`  • ${approval.id}  [${spec.action}]  → ${spec.note}`);
  }
  console.log("\nCards sent to Telegram. Check the chat for buttons + edit prompt (8a).");
}

async function badmac(approvalId: string): Promise<void> {
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID ?? "0";
  const before = await prisma.agentApproval.findUnique({ where: { id: approvalId } });
  if (!before) {
    console.error(`No approval ${approvalId}`);
    process.exit(1);
    return;
  }

  await onCallbackQuery({
    id: "synthetic-bad-hmac",
    data: `approve:${approvalId}:0000000000000000`,
    from: { username: "attacker" },
    message: { message_id: 1, chat: { id: allowedChatId } },
  });

  const after = await prisma.agentApproval.findUnique({ where: { id: approvalId } });
  const blockedAudits = await prisma.agentAuditLogEntry.count({
    where: { hookPhase: "approval_decision", outcome: "blocked", payload: { path: ["approvalId"], equals: approvalId } },
  });
  console.log(
    JSON.stringify(
      {
        approvalId,
        statusBefore: before.status,
        statusAfter: after?.status,
        decisionRecorded: after?.decision ?? null,
        blockedAuditRows: blockedAudits,
        pass: after?.status === "pending" && after?.decision === null && blockedAudits >= 1,
      },
      null,
      2
    )
  );
}

// Self-contained 8f: create a throwaway pending approval (no card), fire a
// bad-HMAC callback through the real handler, and confirm it was rejected.
async function selftestBadmac(): Promise<void> {
  await ensureDemoDefinition();
  const run = await prisma.agentRun.create({
    data: { agentKey: DEMO_AGENT, trigger: "test", triggerSource: "approval-verify-selftest", status: "awaiting_approval" },
  });
  const approval = await prisma.agentApproval.create({
    data: {
      runId: run.id,
      agentKey: DEMO_AGENT,
      proposedAction: "gmail.send",
      proposedArgs: toJsonValue({ to: "selftest@example.com" }),
      blastRadius: "high",
      status: "pending",
    },
  });
  await badmac(approval.id);
}

async function status(approvalId?: string): Promise<void> {
  const rows = approvalId
    ? await prisma.agentApproval.findMany({ where: { id: approvalId } })
    : await prisma.agentApproval.findMany({ where: { agentKey: DEMO_AGENT }, orderBy: { createdAt: "desc" }, take: 10 });

  for (const row of rows) {
    const audits = await prisma.agentAuditLogEntry.findMany({
      where: { hookPhase: "approval_decision", payload: { path: ["approvalId"], equals: row.id } },
      orderBy: { createdAt: "asc" },
    });
    console.log(
      JSON.stringify(
        {
          id: row.id,
          action: row.proposedAction,
          status: row.status,
          decision: row.decision,
          decidedBy: row.decidedBy,
          editedArgs: row.editedArgs,
          auditOutcomes: audits.map((a) => a.outcome),
        },
        null,
        2
      )
    );
  }
}

async function main() {
  loadEnv();
  const [command, arg] = process.argv.slice(2);
  switch (command) {
    case "seed":
      await seed();
      break;
    case "badmac":
      if (!arg) {
        console.error("usage: badmac <approvalId>");
        process.exit(2);
      }
      await badmac(arg);
      break;
    case "status":
      await status(arg);
      break;
    case "selftest-badmac":
      await selftestBadmac();
      break;
    default:
      console.error("usage: telegram-approval-verify <seed|badmac <id>|selftest-badmac|status [id]>");
      process.exit(2);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
