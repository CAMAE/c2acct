import { PrismaClient } from "@prisma/client";
import { applyRepoEnv, resolveRepoEnvValue } from "@/lib/env/repoEnv";

export function loadEnv() {
  applyRepoEnv();
}

function getRequiredDatabaseUrl() {
  loadEnv();

  const resolved = resolveRepoEnvValue(["DATABASE_URL"]);
  if (resolved.value) {
    return resolved.value;
  }

  const location =
    resolved.defined && resolved.blank && resolved.source
      ? `${resolved.envName} is blank in ${resolved.source}.`
      : `${resolved.envName} was not found in runtime env, .env.local, or .env.`;

  throw new Error(
    `PAT local database commands require DATABASE_URL. ${location} Set DATABASE_URL in repo-root .env.local or .env, then rerun the command.`
  );
}

type PrismaErrorLike = {
  code?: unknown;
  message?: unknown;
};

function isPrismaErrorLike(error: unknown): error is PrismaErrorLike {
  return typeof error === "object" && error !== null;
}

export function getDatabaseTarget() {
  const databaseUrl = getRequiredDatabaseUrl();

  try {
    const parsed = new URL(databaseUrl);
    return {
      databaseUrl,
      host: parsed.hostname || "localhost",
      port: parsed.port ? Number(parsed.port) : 5432,
      database: parsed.pathname.replace(/^\//, "") || "unknown",
    };
  } catch {
    return {
      databaseUrl,
      host: "localhost",
      port: 5433,
      database: "unknown",
    };
  }
}

function formatDatabaseUnavailableError(error: unknown) {
  const target = getDatabaseTarget();
  const message =
    isPrismaErrorLike(error) && typeof error.message === "string" ? error.message : String(error);
  const code = isPrismaErrorLike(error) && typeof error.code === "string" ? error.code : null;

  return new Error(
    [
      `Local PAT database is unavailable at ${target.host}:${target.port}/${target.database}.`,
      "Start the Docker Postgres service with `pnpm db:up`, wait with `pnpm db:wait`, then rerun the validation command.",
      code ? `Prisma error code: ${code}.` : null,
      `Original error: ${message}`,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export async function runWithPrisma<T>(callback: (prisma: PrismaClient) => Promise<T>) {
  getRequiredDatabaseUrl();
  const prisma = new PrismaClient();
  try {
    return await callback(prisma);
  } catch (error) {
    if (
      (isPrismaErrorLike(error) && error.code === "P1001") ||
      String(isPrismaErrorLike(error) && typeof error.message === "string" ? error.message : error).match(
        /Can't reach database server|ECONNREFUSED|connect ECONNREFUSED|Timed out fetching a new connection/i
      )
    ) {
      throw formatDatabaseUnavailableError(error);
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
