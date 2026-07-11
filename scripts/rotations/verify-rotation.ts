import fs from "node:fs";
import path from "node:path";
import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * Rotation verification (Block 9d). After a DB credential rotation, confirm the
 * new credential actually connects — via DIRECT_URL, NOT the pooled DATABASE_URL.
 *
 * Why DIRECT_URL: the pooled URL runs through pgbouncer (transaction mode), which
 * does not support the prepared statements Prisma issues by default. Verifying a
 * freshly rotated credential through the pooler throws a "prepared statement does
 * not exist / already exists" error that has NOTHING to do with the credential —
 * a false negative that has burned rotation checks before. The direct connection
 * (Neon's non-pooler host) bypasses pgbouncer entirely, so a pass means the
 * credential is genuinely good.
 *
 * Writes a proof file to artifacts/rotations/ and exits non-zero on failure.
 *
 *   pnpm rotations:verify
 */

async function main() {
  applyRepoEnv();

  const directUrl = process.env.DIRECT_URL?.trim();
  const pooledUrl = process.env.DATABASE_URL?.trim();
  const url = directUrl || pooledUrl;
  const connectedVia = directUrl ? "DIRECT_URL" : "DATABASE_URL";

  if (!url) {
    console.error("No DIRECT_URL or DATABASE_URL in the runtime env — cannot verify rotation.");
    process.exit(1);
  }
  if (!directUrl) {
    console.warn(
      "DIRECT_URL is not set; falling back to DATABASE_URL. If this is a pooled " +
        "(pgbouncer) URL, a prepared-statement error here is a FALSE negative — set DIRECT_URL."
    );
  }

  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return "unparseable";
    }
  })();

  const { PrismaClient } = await import("@prisma/client");
  // Fresh client pinned to the direct (non-pooler) connection.
  const client = new PrismaClient({ datasourceUrl: url });

  const startedAt = new Date();
  let ok = false;
  let detail: Record<string, unknown> = {};
  try {
    const rows = await client.$queryRaw<
      Array<{ ok: number; who: string; server: string; at: Date }>
    >`SELECT 1 AS ok, current_user AS who, version() AS server, now() AS at`;
    const row = rows[0];
    ok = row?.ok === 1;
    detail = { user: row?.who, serverVersion: row?.server, dbTime: row?.at };
  } catch (error) {
    detail = { error: error instanceof Error ? error.message : String(error) };
  } finally {
    await client.$disconnect();
  }

  const proof = {
    ok,
    connectedVia,
    host,
    checkedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    ...detail,
  };

  const dir = path.join(process.cwd(), "artifacts", "rotations");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `rotation-verify-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(proof, null, 2) + "\n");

  console.log(`[rotation-verify] ${ok ? "PASS" : "FAIL"} via ${connectedVia} (${host})`);
  console.log(`[rotation-verify] proof → ${path.relative(process.cwd(), file)}`);
  if (!ok) {
    console.error(`[rotation-verify] ${JSON.stringify(detail)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
