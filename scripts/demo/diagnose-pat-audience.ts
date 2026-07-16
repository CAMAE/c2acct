/**
 * READ-ONLY: resolve the Ask Pat audience for a given account exactly as the
 * /api/pat route does (resolvePatAudience → resolvePortalExperience), then run
 * retrieveHelp with that resolved audience. Pinpoints P0b case-4 (upstream
 * audience mismatch): if the resolved audience isn't "vendor"/"firm" — or is
 * blank — retrieveHelp returns [] and Pat shows the "not in my help library"
 * fallback despite a healthy corpus.
 *
 *   set -a; source .env.prod; set +a; \
 *     DATABASE_URL="$DIRECT_URL" node --import tsx scripts/demo/diagnose-pat-audience.ts vendor-elite@c2acct.com
 */
import prisma from "@/lib/prisma";
import { resolvePatAudience } from "@/lib/patAssistant/audience";
import { retrieveHelp, buildHelpContext } from "@/lib/patAssistant/retrieveHelp";
import { generatePatReply } from "@/lib/patAssistant/model";
import { anthropicApiKeyPresent } from "@/lib/agents/llm";

const email = process.argv[2] ?? "vendor-elite@c2acct.com";
const Q = "what does alignment delta mean on the battlecard";

async function main() {
  console.log(`\n=== PAT AUDIENCE DIAGNOSIS — ${email} ===`);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, companyId: true, email: true, name: true } });
  if (!user) { console.log(`  ❌ no user ${email}`); return; }
  const company = user.companyId ? await prisma.company.findUnique({ where: { id: user.companyId }, select: { id: true, name: true, type: true, dataBoundary: true } }) : null;
  console.log(`  user: role=${user.role} companyId=${user.companyId ?? "null"}`);
  console.log(`  company: ${company ? `${company.name} type=${company.type} boundary=${company.dataBoundary}` : "NONE"}`);

  // Construct the session-user shape the route hands to resolvePatAudience.
  const sessionUser = { id: user.id, role: user.role, companyId: user.companyId, email: user.email, name: user.name } as never;
  const res = await resolvePatAudience(sessionUser);
  console.log(`\n  resolvePatAudience → ${res ? JSON.stringify(res) : "NULL (route returns no_audience 403)"}`);

  if (res) {
    const blank = !res.audience?.trim();
    console.log(`  audience blank? ${blank ? "YES ❌ (retrieveHelp returns [] immediately)" : "no"}`);
    const chunks = await retrieveHelp(Q, res.audience, 5, { unrestricted: res.unrestricted });
    console.log(`  retrieveHelp(resolved audience="${res.audience}", unrestricted=${res.unrestricted}) → ${chunks.length} chunks${chunks[0] ? ` (top: ${chunks[0].sourcePath})` : ""}`);
    if (chunks.length === 0) {
      console.log(`\n  VERDICT: ❌ fallback path (a) — retrieval EMPTY for audience "${res.audience}". Fix the audience mapping.`);
    } else if (!anthropicApiKeyPresent()) {
      console.log(`\n  (ANTHROPIC_API_KEY not in this shell — skipping the model call; retrieval is healthy.)`);
    } else {
      // Replicate the route's model step end-to-end.
      try {
        const reply = await generatePatReply({ prompt: Q, context: buildHelpContext(chunks) });
        console.log(`  generatePatReply → insufficientContext=${reply.insufficientContext} · answer="${reply.text ? reply.text.slice(0, 140).replace(/\n/g, " ") : "(none)"}"`);
        console.log(`\n  VERDICT: ${reply.insufficientContext ? `❌ fallback path (b) — retrieval OK but the MODEL returns INSUFFICIENT_CONTEXT. The bug is retrieval-quality (wrong chunks) or the model prompt/protocol.` : "✅ full pipeline answers — the deployed route SHOULD answer. Divergence is deploy/session-specific."}`);
      } catch (e) {
        console.log(`  generatePatReply THREW: ${(e as Error).message}`);
        console.log(`\n  VERDICT: ❌ the model call throws (this is what the route catches → generation_failed). Check key/model/timeout.`);
      }
    }
  }
}

main().catch((e) => { console.error("audience diagnosis failed:", e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
