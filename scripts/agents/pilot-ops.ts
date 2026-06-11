// Pilot Ops Agent (Phase 1b). The first GATED agent — proof that an agent can
// act on operator approval via the Phase 1d Telegram round-trip.
//
// Sub-tasks (selected by PAT_PILOT_TASK; default "health-summary"):
//   - health-summary    : read-only. Counts pilot members by provisioning state
//                         and sends a digest to Telegram. No approval.
//   - draft-invitation  : drafts a pilot welcome email and calls the gmail.draft
//                         tool, which is approval-gated. On approve it creates a
//                         SANDBOX draft (never sends); on deny it halts; on edit
//                         it applies the edited fields. (PAT_PILOT_FIRM / PAT_PILOT_TO)
//   - provision-account : creates a firm/vendor organization + owner user through
//                         the shared lib/provisioning/account seam (same code path
//                         as the /admin/organizations form). Gated by the
//                         provisioning.create_account approval rule; the generated
//                         temporary credential is delivered to the operator chat
//                         directly and never written to audit rows.
//                         (PAT_PROVISION_ORG_KIND / PAT_PROVISION_ORG_NAME /
//                          PAT_PROVISION_OWNER_EMAIL / PAT_PROVISION_OWNER_NAME)
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
import {
  generateTemporaryPassword,
  provisionOrganizationAccount,
  validateProvisionAccountRequest,
} from "@/lib/provisioning/account";
import type { AgentHandler, AgentRunContext } from "@/lib/agents/types";
import type { PilotMemberSnapshot, ProvisioningState } from "@/lib/agents/pilot-ops/types";

export const PILOT_OPS_KEY = "pilot-ops";

const pilotOpsHandler: AgentHandler = async (ctx) => {
  const task = process.env.PAT_PILOT_TASK ?? "health-summary";
  await ctx.log("pilot-ops task selected", { task });

  if (task === "draft-invitation") {
    return draftInvitation(ctx);
  }
  if (task === "provision-account") {
    return provisionAccount(ctx);
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

/**
 * provision-account: org + owner through the shared seam, behind the
 * provisioning.create_account approval gate. The temporary password is
 * generated here, kept OUT of the gated tool args (which land in AgentStep +
 * audit rows), and delivered to the operator chat directly after success.
 */
async function provisionAccount(ctx: AgentRunContext): Promise<{ summary: string }> {
  const request = {
    orgKind: process.env.PAT_PROVISION_ORG_KIND ?? "",
    orgName: process.env.PAT_PROVISION_ORG_NAME ?? "",
    ownerEmail: process.env.PAT_PROVISION_OWNER_EMAIL ?? "",
    ownerName: process.env.PAT_PROVISION_OWNER_NAME || null,
  };

  // Validate before requesting approval so malformed requests halt without
  // bothering the operator. The seam re-validates the (possibly edited) args.
  const validation = validateProvisionAccountRequest(request);
  if (!validation.ok) {
    return { summary: `Provisioning halted before approval: ${validation.message}` };
  }

  const temporaryPassword = generateTemporaryPassword();

  try {
    const result = await ctx.useTool(
      "provisioning.create_account",
      {
        orgKind: validation.orgKind,
        orgName: validation.orgName,
        ownerEmail: validation.ownerEmail,
        ownerName: request.ownerName ?? "",
      },
      async (args) => {
        const outcome = await provisionOrganizationAccount({
          orgKind: String(args.orgKind),
          orgName: String(args.orgName),
          ownerEmail: String(args.ownerEmail),
          ownerName: String(args.ownerName ?? "") || null,
          temporaryPassword,
          actorUserId: null,
          requestedVia: "pilot-ops-agent",
        });
        if (!outcome.ok) {
          throw new AgentError(`provisioning_${outcome.code}`, outcome.message);
        }
        // No credential material in the result — it is persisted to AgentStep.
        return {
          companyId: outcome.companyId,
          userId: outcome.userId,
          orgName: outcome.orgName,
          orgType: String(outcome.orgType),
          ownerEmail: outcome.ownerEmail,
        };
      }
    );

    // Deliver the temp credential straight to the operator chat — deliberately
    // NOT via the telegram.send_message tool, so the secret never lands in
    // AgentStep/audit payloads. First-login password update is enforced.
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
    let credentialNote = "temp credential NOT delivered (telegram env missing) — reset it via /admin/users.";
    if (token && chatId) {
      const delivery = await sendTelegramMessage(
        token,
        buildTelegramSendPayload(
          chatId,
          [
            `Provisioned ${result.orgType} "${result.orgName}" with owner ${result.ownerEmail}.`,
            `Temporary password: ${temporaryPassword}`,
            "Hand this to the owner over a trusted channel. It must be changed at first sign-in.",
          ].join("\n")
        )
      );
      credentialNote = delivery.sent
        ? "temp credential delivered via Telegram (value not logged)."
        : `temp credential delivery failed (${delivery.reason ?? delivery.status}) — reset it via /admin/users.`;
    }
    await ctx.log("provision-account credential delivery", { note: credentialNote });

    return {
      summary: `Provisioned ${result.orgType} "${result.orgName}" + owner ${result.ownerEmail} (company ${result.companyId}, user ${result.userId}); ${credentialNote}`,
    };
  } catch (error) {
    if (error instanceof AgentError && error.code === "approval_denied") {
      return { summary: `Provisioning of "${validation.orgName}" halted: ${error.message}` };
    }
    if (error instanceof AgentError && error.code.startsWith("provisioning_")) {
      return { summary: `Provisioning of "${validation.orgName}" failed: ${error.message}` };
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
