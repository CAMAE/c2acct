import net from "node:net";
import { PrismaClient } from "@prisma/client";
import { getDatabaseTarget, loadEnv } from "./_shared/prismaScript";

loadEnv();

const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS ?? 30_000);
const intervalMs = 500;

function waitForTcpPort(host: string, port: number, timeout: number) {
  const startedAt = Date.now();

  return new Promise<void>((resolve, reject) => {
    function attempt() {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeout) {
          reject(
            new Error(
              `Timed out waiting for local PAT database at ${host}:${port}. Start it with \`pnpm db:up\`.`
            )
          );
          return;
        }

        setTimeout(attempt, intervalMs);
      });
    }

    attempt();
  });
}

/**
 * A published container port answers TCP well before Postgres finishes a
 * cold-start `initdb`+restart (empty volume, e.g. after `docker compose down
 * -v`). A raw socket connect therefore returns "ready" while the server still
 * refuses real connections, and the next step (`prisma migrate deploy`) fails
 * with P1001. Poll an actual `SELECT 1` so callers only proceed once the
 * database can serve queries.
 */
async function waitForQueryReady(timeout: number) {
  const startedAt = Date.now();
  const prisma = new PrismaClient();
  try {
    for (;;) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        if (Date.now() - startedAt >= timeout) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const target = getDatabaseTarget();
  await waitForTcpPort(target.host, target.port, timeoutMs);
  await waitForQueryReady(timeoutMs);
  console.log(
    `PASS db-wait: local PAT database is reachable and query-ready at ${target.host}:${target.port}/${target.database}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
