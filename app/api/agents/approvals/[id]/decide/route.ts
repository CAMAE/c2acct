import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auditLog } from "@/lib/agents/audit";
import { requireAdminApi } from "@/lib/agents/adminApiAuth";
import { recordApprovalDecision } from "@/ops/telegram-bot/approvals";
import { verifyApproval } from "@/ops/telegram-bot/hmac";
import type { ToolArgs } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

type Decision = "approve" | "deny" | "edit";

/**
 * Operator decision from /admin. Writes to the same AgentApproval row + audit the
 * Telegram path uses (agents see no difference). Gated by admin role AND the same
 * HMAC the Telegram callback carries (defense-in-depth — HMAC verified before any
 * decision is recorded).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    decision?: string;
    hmac?: string;
    editedArgs?: ToolArgs;
  };
  const decision = body.decision as Decision | undefined;
  if (decision !== "approve" && decision !== "deny" && decision !== "edit") {
    return NextResponse.json({ ok: false, error: "decision must be approve|deny|edit" }, { status: 400 });
  }

  const approval = await prisma.agentApproval.findUnique({ where: { id } });
  if (!approval) {
    return NextResponse.json({ ok: false, error: "approval not found" }, { status: 404 });
  }

  if (!verifyApproval(approval.id, approval.createdAt.getTime(), body.hmac ?? "")) {
    await auditLog({
      runId: approval.runId,
      agentKey: approval.agentKey,
      hookPhase: "approval_decision",
      payload: { reason: "hmac_invalid", source: "admin", approvalId: id, decidedBy: auth.email },
      outcome: "blocked",
    });
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 403 });
  }

  if (approval.status !== "pending") {
    return NextResponse.json({ ok: false, error: `already ${approval.status}` }, { status: 409 });
  }

  await recordApprovalDecision(id, {
    decision,
    decidedBy: `admin:${auth.email}`,
    editedArgs: decision === "edit" ? body.editedArgs : undefined,
    decisionNote: `via /admin by ${auth.email}`,
  });

  return NextResponse.json({ ok: true, id, decision }, { headers: { "cache-control": "no-store" } });
}
