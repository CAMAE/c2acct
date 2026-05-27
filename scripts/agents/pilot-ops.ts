// Pilot Ops Agent (Phase 1b). The first GATED agent — proof that an agent can
// act on operator approval via the Phase 1d Telegram round-trip.
//
// Sub-tasks (selected by PAT_PILOT_TASK; default "health-summary"):
//   - health-summary   : read-only. Counts pilot members by provisioning state
//                        and sends a digest to Telegram. No approval.
//   - draft-invitation : drafts a pilot welcome email and calls the gmail.draft
//                        tool, which is approval-gated. On approve it creates a
//                        SANDBOX draft (never sends); on deny it halts; on edit
//                        it applies the edited fields. (PAT_PILOT_FIRM / PAT_PILOT_TO)
//
// Stubs (provisioning / invitation write / re-engagement) demonstrate the gated
// call shape but are not wired into the default flow in Phase 1b.
//
// Hard rule: gmail is draft-only (sandbox), never .send — no real email leaves.
import prisma from "@/lib/prisma";
import { registerAgent } from "@/lib/agents/registry";
import { AgentError } from "@/lib/agents/sdk";
import { computeHealth, formatHealthSummary } from "@/lib/agents/pilot-ops/health";
import { buildInvitationDraft } from "@/lib/agents/pilot-ops/invitation";
import { buildTelegramSendPayload, sendTelegramMessage } from "@/lib/agents/telegram";
import type { AgentHandler, AgentRunContext } from "@/lib/agents/types";
import type { PilotMemberSnapshot, ProvisioningState } from "@/lib/agents/pilot-ops/types";

export const PILOT_OPS_KEY = "pilot-ops";

const pilotOpsHandler: AgentHandler = async (ctx) => {
  const task = process.env.PAT_PILOT_TASK ?? "health-summary";
  await ctx.log("pilot-ops task selected", { task });

  if (task === "draft-invitation") {
    return draftInvitation(ctx);
  }
  return healthSummary(ctx);
};

async function healthSummary(ctx: AgentRunContext): Promise<{ summary: string }> {
  const members = await readPilotMembers(ctx);
  const health = computeHealth(members, Date.now());
  const text = formatHealthSummary(health);

  await sendTelegram(ctx, text);

  return {
    summary: `Pilot health digest sent: ${health.total} members (active ${health.active}, provisioning ${health.provisioning}, invited ${health.invited}, stalled ${health.stalled}, blocked ${health.blocked}).`,
  };
}

async function draftInvitation(ctx: AgentRunContext): Promise<{ summary: string }> {
  const firm = process.env.PAT_PILOT_FIRM ?? "Test Firm 1";
  const to = process.env.PAT_PILOT_TO ?? "test-firm-1@example.com";
  const draft = buildInvitationDraft(firm, to);

  try {
    const result = await ctx.useTool(
      "gmail.draft",
      { firm, to: draft.to, subject: draft.subject, body: draft.body },
      async (args) => {
        // SANDBOX: create a draft only; never send. (gmail is draft-only.)
        return {
          drafted: true,
          sandbox: true,
          to: String(args.to),
          subject: String(args.subject),
          bodyPreview: String(args.body ?? "").slice(0, 80),
        };
      }
    );
    return {
      summary: `Invitation draft created (SANDBOX, not sent) for ${firm} → ${result.to}, subject "${result.subject}".`,
    };
  } catch (error) {
    if (error instanceof AgentError && error.code === "approval_denied") {
      // Clean halt — operator denied (or it timed out). No draft created.
      return { summary: `Invitation draft for ${firm} halted: ${error.message}` };
    }
    throw error;
  }
}

async function readPilotMembers(ctx: AgentRunContext): Promise<PilotMemberSnapshot[]> {
  return ctx.useTool("neon.read", { table: "PilotCohortMember", purpose: "health" }, async () => {
    const rows = await prisma.pilotCohortMember.findMany({
      include: { User: true, Company: true },
    });
    return rows.map((row) => ({
      id: row.id,
      kind: String(row.memberKind),
      provisioningState: String(row.provisioningState) as ProvisioningState,
      createdAtMs: row.createdAt.getTime(),
      displayName: row.inviteEmail ?? row.User?.email ?? row.Company?.name ?? row.id,
    }));
  });
}

async function sendTelegram(ctx: AgentRunContext, text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID ?? "";
  await ctx.useTool("telegram.send_message", { chatId, text }, async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !chatId) {
      return { sent: false, reason: "telegram env not configured" };
    }
    return sendTelegramMessage(token, buildTelegramSendPayload(chatId, text));
  });
}

// --- Phase 1b stubs (demonstrate the gated-call shape; not wired by default) ---

/** Provision a pilot user (gated: neon.write:User). Sandbox no-op exec for now. */
export async function provisionPilotUserStub(ctx: AgentRunContext, email: string): Promise<unknown> {
  return ctx.useTool("neon.write", { table: "User", email }, async (args) => ({
    written: false,
    sandbox: true,
    table: String(args.table),
  }));
}

/** Create a pilot invitation (gated: neon.write:PilotCohortMember). Sandbox no-op. */
export async function createPilotInvitationStub(ctx: AgentRunContext, inviteEmail: string): Promise<unknown> {
  return ctx.useTool("neon.write", { table: "PilotCohortMember", inviteEmail }, async (args) => ({
    written: false,
    sandbox: true,
    table: String(args.table),
  }));
}

registerAgent(PILOT_OPS_KEY, pilotOpsHandler);
