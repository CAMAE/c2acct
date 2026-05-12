import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

export function loadEnv(filename = ".env") {
  dotenv.config({ path: path.join(process.cwd(), filename) });
}

type PrismaErrorLike = {
  code?: unknown;
  message?: unknown;
};

function isPrismaErrorLike(error: unknown): error is PrismaErrorLike {
  return typeof error === "object" && error !== null;
}

export function getDatabaseTarget() {
  const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/c2acct";

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
      "Start the Docker Postgres service with `npm run db:up`, wait with `npm run db:wait`, then rerun the validation command.",
      code ? `Prisma error code: ${code}.` : null,
      `Original error: ${message}`,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export async function runWithPrisma<T>(callback: (prisma: PrismaClient) => Promise<T>) {
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
