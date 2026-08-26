import { describe, expect, it } from "vitest";
import {
  REQUEST_ID_HEADER,
  generateRequestId,
  readRequestId,
  resolveRequestId,
} from "@/lib/observability/requestId";
import { buildLogLine } from "@/lib/observability/logger";
import {
  SENTRY_DSN_ENV,
  buildSentryOptions,
  isSentryConfigured,
  scrubSentryEvent,
} from "@/lib/observability/sentry";

/** Minimal Headers stand-in. */
function h(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

describe("request correlation ids", () => {
  it("mints a well-formed id", () => {
    const id = generateRequestId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(generateRequestId()).not.toBe(id);
  });

  it("reuses a valid upstream id so one request keeps one id across hops", () => {
    expect(resolveRequestId(h({ [REQUEST_ID_HEADER]: "abcdef0123456789" }))).toBe("abcdef0123456789");
  });

  it("REJECTS a malformed upstream id rather than trusting it", () => {
    // The id is echoed into a log drain. Unbounded or newline-bearing input
    // would let a caller forge log lines and bloat every row.
    expect(readRequestId(h({ [REQUEST_ID_HEADER]: "not a valid id" }))).toBeNull();
    expect(readRequestId(h({ [REQUEST_ID_HEADER]: "abc\ndef0123456789" }))).toBeNull();
    expect(readRequestId(h({ [REQUEST_ID_HEADER]: "f".repeat(200) }))).toBeNull();
    expect(readRequestId(h({ [REQUEST_ID_HEADER]: "<script>" }))).toBeNull();
    // …and a rejected one still yields a usable id.
    expect(resolveRequestId(h({ [REQUEST_ID_HEADER]: "bad" }))).toMatch(/^[0-9a-f]{16}$/);
  });

  it("handles a missing header", () => {
    expect(readRequestId(h({}))).toBeNull();
    expect(readRequestId(null)).toBeNull();
    expect(resolveRequestId(null)).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("structured error lines", () => {
  it("emits one JSON object carrying the request id", () => {
    const line = buildLogLine("error", {
      event: "server_action_error",
      requestId: "abcdef0123456789",
      error: new Error("boom"),
    });
    expect(line.event).toBe("server_action_error");
    expect(line.requestId).toBe("abcdef0123456789");
    expect(line.errorName).toBe("Error");
    expect(line.message).toBe("boom");
    // One line, so a drain can grep it.
    expect(JSON.stringify(line)).not.toContain("\n");
  });

  it("REDACTS credentials in log context via the audit redactor", () => {
    // A log drain is append-only external storage, exactly like the audit
    // table — a secret written there cannot be taken back.
    const line = buildLogLine("error", {
      event: "db_error",
      context: { dsn: "postgresql://user:hunter2@db.example.com:5432/app", note: "fine" },
    });
    const serialized = JSON.stringify(line);
    expect(serialized).not.toContain("hunter2");
    expect(line.context?.note).toBe("fine");
  });

  it("truncates stacks so one error cannot flood the drain", () => {
    const error = new Error("deep");
    error.stack = ["Error: deep", ...Array.from({ length: 80 }, (_, i) => `    at frame${i}`)].join("\n");
    expect(buildLogLine("error", { event: "e", error }).stack!.split("\n").length).toBeLessThanOrEqual(12);
  });
});

describe("Sentry gating — absent DSN is a true no-op", () => {
  it("is not configured without a DSN", () => {
    expect(isSentryConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(isSentryConfigured({ [SENTRY_DSN_ENV]: "   " } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(buildSentryOptions({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it("initSentry does nothing and returns false without a DSN", async () => {
    const { initSentry } = await import("@/lib/observability/sentry");
    // The SDK is behind a dynamic import inside the DSN branch, so with no DSN
    // it is never evaluated — no transport is constructed, no network call can
    // occur. This is the zero-behaviour-change guarantee.
    await expect(initSentry({} as NodeJS.ProcessEnv)).resolves.toBe(false);
  });

  it("does not import the SDK at module load", async () => {
    // A top-level `import * as Sentry` would install global handlers on import,
    // which is behaviour change in an environment that opted out. Assert the
    // source uses a dynamic import instead.
    const { readFileSync } = await import("node:fs");
    const { default: path } = await import("node:path");
    const source = readFileSync(path.join(process.cwd(), "lib/observability/sentry.ts"), "utf8");
    expect(source).not.toMatch(/^import .*@sentry\/nextjs/m);
    expect(source).toContain('await import("@sentry/nextjs")');
  });

  it("tags the release and refuses default PII when a DSN IS present", () => {
    const options = buildSentryOptions({
      [SENTRY_DSN_ENV]: "https://key@o1.ingest.sentry.io/1",
      PAT_RELEASE_ID: "b6d8124:build-x",
      VERCEL_ENV: "production",
    } as unknown as NodeJS.ProcessEnv)!;
    expect(options.release).toBe("b6d8124:build-x");
    expect(options.environment).toBe("production");
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
  });
});

describe("Sentry event scrubbing", () => {
  it("drops cookies and the user object entirely", () => {
    const scrubbed = scrubSentryEvent({
      request: { headers: { authorization: "Bearer abcdefghijklmnopqrstuvwxyz012345" }, cookies: "session=live" },
      user: { email: "someone@example.com", id: "u1" },
    });
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.user).toBeNull();
    const serialized = JSON.stringify(scrubbed);
    expect(serialized).not.toContain("session=live");
    expect(serialized).not.toContain("someone@example.com");
    expect(serialized).not.toContain("abcdefghijklmnopqrstuvwxyz012345");
  });

  it("redacts extras but keeps benign fields", () => {
    const scrubbed = scrubSentryEvent({ extra: { api_key: "abc", route: "/firm" } });
    expect(scrubbed.extra?.route).toBe("/firm");
    expect(JSON.stringify(scrubbed)).not.toContain('"abc"');
  });
});
