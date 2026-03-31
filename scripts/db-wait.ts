import net from "node:net";
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
              `Timed out waiting for local PAT database at ${host}:${port}. Start it with \`npm run db:up\`.`
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

async function main() {
  const target = getDatabaseTarget();
  await waitForTcpPort(target.host, target.port, timeoutMs);
  console.log(
    `PASS db-wait: local PAT database is reachable at ${target.host}:${target.port}/${target.database}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
