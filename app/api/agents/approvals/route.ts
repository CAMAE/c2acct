import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/agents/adminApiAuth";
import { getPendingApprovals } from "@/lib/agents/adminConsole";
import { signApproval } from "@/ops/telegram-bot/hmac";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const approvals = await getPendingApprovals();
  const withHmac = approvals.map((approval) => ({
    ...approval,
    hmac: signApproval(approval.id, new Date(approval.createdAt).getTime()),
  }));
  return NextResponse.json({ ok: true, approvals: withHmac }, { headers: { "cache-control": "no-store" } });
}
