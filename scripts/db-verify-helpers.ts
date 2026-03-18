import { execFileSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

type DbExecResult = {
  mode: "psql" | "docker";
  containerName?: string;
  databaseUrl: string;
};

export function fail(message: string): never {
  throw new Error(message);
}

function formatExecError(error: unknown) {
  if (error instanceof Error && "code" in error && error.code === "EPERM") {
    return "DB verifier child-process execution is blocked by the current harness (EPERM). Run the same verifier from a normal terminal with docker or psql access.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    fail("DATABASE_URL is not set.");
  }
  if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    fail("DATABASE_URL must start with postgres:// or postgresql://");
  }
  return databaseUrl;
}

function parseDatabaseUrl(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName) {
    fail("DATABASE_URL must include a database name.");
  }
  return {
    databaseUrl,
    dbName,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parsed.port || "5432",
  };
}

function detectDockerContainer(port: string) {
  const preferred = process.env.AAE_LOCAL_DB_CONTAINER?.trim();
  if (preferred) {
    return preferred;
  }

  if (port === "5433") {
    return "c2acct-db";
  }

  const formatted = execFileSync(
    "docker",
    ["ps", "--format", "{{.Names}}\t{{.Ports}}"],
    { encoding: "utf8", shell: true }
  );
  const match = formatted
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => line.includes(`:${port}->5432/tcp`));

  if (!match) {
    fail(`No running Docker container exposes local PostgreSQL port ${port}.`);
  }

  return match.split("\t")[0];
}

export function resolveDbExec(): DbExecResult {
  const databaseUrl = getDatabaseUrl();
  const parsed = parseDatabaseUrl(databaseUrl);

  try {
    execFileSync("psql", ["--version"], { encoding: "utf8" });
    return {
      mode: "psql",
      databaseUrl,
    };
  } catch {}

  if (parsed.host === "localhost" || parsed.host === "127.0.0.1") {
    try {
      return {
        mode: "docker",
        containerName: detectDockerContainer(parsed.port),
        databaseUrl,
      };
    } catch (error) {
      fail(formatExecError(error));
    }
  }

  fail("No supported database execution path found. Install psql or run the local Docker Postgres container.");
}

export function runSql(sql: string) {
  const exec = resolveDbExec();

  if (exec.mode === "psql") {
    return execFileSync(
      "psql",
      [exec.databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
      { encoding: "utf8" }
    ).trim();
  }

  const parsed = parseDatabaseUrl(exec.databaseUrl);
  const args = [
    "exec",
    "-i",
    exec.containerName!,
    "psql",
    "-U",
    parsed.username,
    "-d",
    parsed.dbName,
    "-v",
    "ON_ERROR_STOP=1",
    "-tA",
    "-c",
    sql.replace(/\r?\n/g, " "),
  ];

  try {
    return execFileSync("docker", args, {
      encoding: "utf8",
      shell: true,
      env: {
        ...process.env,
        PGPASSWORD: parsed.password,
      },
    }).trim();
  } catch (error) {
    fail(formatExecError(error));
  }
}

export function runJsonQuery<T>(sql: string): T {
  const output = runSql(sql);
  if (!output) {
    fail("Expected JSON query output but received an empty response.");
  }
  return JSON.parse(output) as T;
}

export function safeJsonQuery<T>(sql: string): T | null {
  const output = runSql(sql);
  if (!output) {
    return null;
  }
  return JSON.parse(output) as T;
}
