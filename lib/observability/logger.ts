import { redactToolArgs } from "@/lib/agents/redact";

/**
 * Structured server logging for the Vercel log drain (deploy-night readiness).
 *
 * Error lines are emitted as single-line JSON so the drain is grep-able and
 * queryable. A multi-line `console.error(err)` is unsearchable once it reaches a
 * drain: the stack wraps across rows, and the row carrying the message has no
 * request id on it, so you cannot pivot from an error to the request that caused
 * it. One line, one object, one `requestId` field fixes both.
 *
 * PII IS SCRUBBED THROUGH THE SAME RULES AS THE AGENT AUDIT TRAIL
 * (lib/agents/redact.ts). A log drain is an append-only external store, exactly
 * like the audit table, so a credential written there cannot be taken back. The
 * redactor is reused rather than reimplemented so both surfaces can never drift
 * apart on what counts as a secret.
 *
 * Enabled everywhere by default — this is a formatting change, not a feature.
 * Nothing here makes a network call.
 */

export type LogLevel = "error" | "warn" | "info";

export interface StructuredLogInput {
  /** Short, greppable event key, e.g. "server_action_error". */
  event: string;
  requestId?: string | null;
  message?: string;
  error?: unknown;
  /** Extra fields. Redacted before emission. */
  context?: Record<string, unknown>;
}

export interface StructuredLogLine {
  ts: string;
  level: LogLevel;
  event: string;
  requestId: string | null;
  message: string;
  errorName?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

/** Stack frames kept. Enough to locate the fault, short enough not to flood the drain. */
const STACK_FRAME_LIMIT = 12;

function describeError(error: unknown): { errorName?: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, STACK_FRAME_LIMIT).join("\n"),
    };
  }
  if (error === undefined || error === null) {
    return { message: "" };
  }
  return { message: typeof error === "string" ? error : JSON.stringify(error) };
}

/** Build the line without emitting it — the unit-testable half. */
export function buildLogLine(level: LogLevel, input: StructuredLogInput): StructuredLogLine {
  const described = describeError(input.error);
  const line: StructuredLogLine = {
    ts: new Date().toISOString(),
    level,
    event: input.event,
    requestId: input.requestId ?? null,
    message: input.message ?? described.message,
  };
  if (described.errorName) line.errorName = described.errorName;
  if (described.stack) line.stack = described.stack;
  if (input.context && Object.keys(input.context).length > 0) {
    // Same redaction rules as the audit trail: size cap + credential shapes.
    line.context = redactToolArgs(input.context);
  }
  return line;
}

/** Emit one JSON line on the level's console channel. */
export function logStructured(level: LogLevel, input: StructuredLogInput): StructuredLogLine {
  const line = buildLogLine(level, input);
  const serialized = JSON.stringify(line);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
  return line;
}

export function logServerError(input: StructuredLogInput): StructuredLogLine {
  return logStructured("error", input);
}
