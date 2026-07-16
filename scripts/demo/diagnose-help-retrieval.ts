/**
 * READ-ONLY diagnosis of Ask Pat help retrieval (P0b: empty library on prod).
 * Pinpoints whether the empty result is: corpus-missing, tsv not matching,
 * roleAccess excluding the audience, or verticalId filtering.
 *
 *   set -a; source .env.prod; set +a; \
 *     DATABASE_URL="$DIRECT_URL" node --import tsx scripts/demo/diagnose-help-retrieval.ts
 */
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { retrieveHelp } from "@/lib/patAssistant/retrieveHelp";

const Q = "what does alignment delta mean on the battlecard";

async function main() {
  console.log(`\n=== ASK PAT HELP RETRIEVAL DIAGNOSIS ===`);
  console.log(`DB: ${(process.env.DATABASE_URL || "").replace(/^[^@]*@/, "").replace(/[/?].*$/, "")}`);

  const sources = await prisma.knowledgeSource.findMany({ where: { kind: "help_doc" }, select: { roleAccess: true, verticalId: true } });
  console.log(`\nhelp_doc sources: ${sources.length}`);
  const roleDist: Record<string, number> = {};
  const vertDist: Record<string, number> = {};
  for (const s of sources) {
    roleDist[JSON.stringify((s.roleAccess ?? []).slice().sort())] = (roleDist[JSON.stringify((s.roleAccess ?? []).slice().sort())] ?? 0) + 1;
    vertDist[String(s.verticalId)] = (vertDist[String(s.verticalId)] ?? 0) + 1;
  }
  console.log(`  roleAccess distribution: ${JSON.stringify(roleDist)}`);
  console.log(`  verticalId distribution: ${JSON.stringify(vertDist)}`);

  const tsquery = Q.split(/\s+/).filter(Boolean).join(" or ");
  const rawMatch = await prisma.$queryRaw<Array<{ n: number }>>(Prisma.sql`
    SELECT count(*)::int AS n FROM "KnowledgeChunk" c JOIN "KnowledgeSource" s ON s."id" = c."sourceId"
    WHERE s."kind" = 'help_doc' AND c."tsv" @@ websearch_to_tsquery('english', ${tsquery})`);
  console.log(`\nraw tsv matches for Q (NO role filter): ${rawMatch[0]?.n ?? "?"}`);
  const totalChunks = await prisma.$queryRaw<Array<{ n: number }>>(Prisma.sql`
    SELECT count(*)::int AS n FROM "KnowledgeChunk" c JOIN "KnowledgeSource" s ON s."id" = c."sourceId" WHERE s."kind" = 'help_doc'`);
  console.log(`total help_doc chunks: ${totalChunks[0]?.n ?? "?"}`);

  console.log(`\nretrieveHelp("${Q}"):`);
  for (const aud of ["vendor", "firm", "individual"]) {
    const r = await retrieveHelp(Q, aud, 5);
    console.log(`  audience=${aud} strict → ${r.length} chunks${r[0] ? ` (top: ${r[0].sourcePath})` : ""}`);
  }
  const unr = await retrieveHelp(Q, "vendor", 5, { unrestricted: true });
  console.log(`  audience=vendor UNRESTRICTED → ${unr.length} chunks`);

  console.log(`\nVERDICT:`);
  if ((totalChunks[0]?.n ?? 0) === 0) console.log(`  ❌ CORPUS MISSING — no help_doc chunks. Re-run the help seed on prod.`);
  else if ((rawMatch[0]?.n ?? 0) === 0) console.log(`  ❌ TSV NO MATCH — chunks exist but tsvector doesn't match the query (index/lexeme issue).`);
  else console.log(`  → chunks match at the tsv layer; if strict=0 but unrestricted>0, roleAccess EXCLUDES the audience (fix the roleAccess tags).`);
}

main().catch((e) => { console.error("diagnosis failed:", e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
