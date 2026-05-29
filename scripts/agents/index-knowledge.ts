// Internal Knowledge indexer (Phase 2 #2). One-shot, idempotent. Walks repo docs
// + the last 30 days of agent audit log, chunks (~500 tokens, paragraph-boundary,
// 1-paragraph overlap), and upserts KnowledgeSource + KnowledgeChunk. Unchanged
// sources (contentHash match) are skipped. No embedding/LLM calls — the generated
// tsvector column handles search. Re-runnable safely.
//
//   pnpm exec tsx scripts/agents/index-knowledge.ts            (local docker)
//   DATABASE_URL=<neon> pnpm exec tsx scripts/agents/index-knowledge.ts   (Neon)
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { loadEnv } from "../_shared/prismaScript";

const TARGET_CHARS = 2000; // ~500 tokens at ~4 chars/token
const OVERLAP_PARAS = 1;
const AUDIT_WINDOW_DAYS = 30;
const AUDIT_SOURCE_PATH = "audit:rolling-30d";
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "archive"]);

interface IndexStats {
  scanned: number;
  indexed: number;
  skipped: number;
  chunksAdded: number;
  tokens: number;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const estTokens = (value: string) => Math.ceil(value.length / 4);

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer: string[] = [];
  let length = 0;
  for (const paragraph of paragraphs) {
    if (length > 0 && length + paragraph.length > TARGET_CHARS) {
      chunks.push(buffer.join("\n\n"));
      buffer = buffer.slice(-OVERLAP_PARAS);
      length = buffer.join("\n\n").length;
    }
    buffer.push(paragraph);
    length += paragraph.length + 2;
  }
  if (buffer.length > 0) {
    chunks.push(buffer.join("\n\n"));
  }
  if (chunks.length === 0 && text.trim()) {
    return [text.trim()];
  }
  return chunks;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdown(dir: string, out: string[]): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkMarkdown(full, out);
    } else if (entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
}

async function collectRepoDocPaths(): Promise<string[]> {
  const out: string[] = [];
  for (const file of ["README.md", "CLAUDE.md"]) {
    if (await exists(file)) {
      out.push(file);
    }
  }
  for (const root of ["docs", "lib"]) {
    await walkMarkdown(root, out);
  }
  return Array.from(new Set(out)).sort();
}

async function replaceChunks(sourceId: string, texts: string[]): Promise<number> {
  await prisma.knowledgeChunk.deleteMany({ where: { sourceId } });
  if (texts.length > 0) {
    await prisma.knowledgeChunk.createMany({
      data: texts.map((text, index) => ({ sourceId, chunkIdx: index, text, tokens: estTokens(text) })),
    });
  }
  return texts.length;
}

async function indexRepoDoc(relPath: string, stats: IndexStats): Promise<void> {
  const content = await fs.readFile(relPath, "utf8");
  const hash = sha256(content);
  const existing = await prisma.knowledgeSource.findUnique({ where: { path: relPath } });
  if (existing && existing.contentHash === hash) {
    stats.skipped += 1;
    return;
  }
  const now = new Date();
  const source = await prisma.knowledgeSource.upsert({
    where: { path: relPath },
    update: { kind: "repo_doc", contentHash: hash, lastIndexedAt: now, updatedAt: now },
    create: { kind: "repo_doc", path: relPath, contentHash: hash, lastIndexedAt: now, verticalId: "accounting", updatedAt: now },
  });
  const texts = chunkText(content);
  const added = await replaceChunks(source.id, texts);
  stats.indexed += 1;
  stats.chunksAdded += added;
  stats.tokens += texts.reduce((sum, t) => sum + estTokens(t), 0);
}

async function indexAuditLog(stats: IndexStats): Promise<void> {
  const since = new Date(Date.now() - AUDIT_WINDOW_DAYS * 86_400_000);
  const rows = await prisma.agentAuditLogEntry.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });
  const hash = sha256(rows.map((r) => `${r.id}:${r.createdAt.getTime()}`).join("|"));
  const existing = await prisma.knowledgeSource.findUnique({ where: { path: AUDIT_SOURCE_PATH } });
  if (existing && existing.contentHash === hash) {
    stats.skipped += 1;
    return;
  }
  const now = new Date();
  const source = await prisma.knowledgeSource.upsert({
    where: { path: AUDIT_SOURCE_PATH },
    update: { kind: "audit_log", contentHash: hash, lastIndexedAt: now, updatedAt: now },
    create: { kind: "audit_log", path: AUDIT_SOURCE_PATH, contentHash: hash, lastIndexedAt: now, verticalId: "accounting", updatedAt: now },
  });
  const texts = rows.map((r) => {
    const payload = JSON.stringify(r.payload);
    return `[audit:${r.id}] ${r.createdAt.toISOString()} ${r.agentKey ?? "-"} ${r.hookPhase}${r.outcome ? ` [${r.outcome}]` : ""} ${payload}`.slice(0, 4000);
  });
  const added = await replaceChunks(source.id, texts);
  stats.indexed += 1;
  stats.chunksAdded += added;
  stats.tokens += texts.reduce((sum, t) => sum + estTokens(t), 0);
}

async function main() {
  loadEnv();
  const stats: IndexStats = { scanned: 0, indexed: 0, skipped: 0, chunksAdded: 0, tokens: 0 };

  const docPaths = await collectRepoDocPaths();
  for (const docPath of docPaths) {
    stats.scanned += 1;
    await indexRepoDoc(docPath, stats);
  }
  stats.scanned += 1;
  await indexAuditLog(stats);

  await prisma.$disconnect();
  console.log("[index-knowledge] complete");
  console.log(`  sources scanned: ${stats.scanned} · indexed(changed): ${stats.indexed} · skipped(unchanged): ${stats.skipped}`);
  console.log(`  chunks added: ${stats.chunksAdded} · est tokens: ${stats.tokens}`);
  console.log("  embedding cost: $0.00 (lexical FTS, no embeddings)");
}

main().catch((error) => {
  console.error("[index-knowledge] fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
