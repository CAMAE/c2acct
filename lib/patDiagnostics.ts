type Primitive = string | number | boolean | null;

export type PatDiagnosticArea =
  | "survey_submit"
  | "capability_write"
  | "firm_unlock_eval"
  | "vendor_alignment"
  | "vendor_product"
  | "db_compat";

export type PatDiagnosticLevel = "info" | "warn" | "error";
export type PatDiagnosticStatus = "ok" | "warn" | "error" | "compat";

export type PatDiagnosticEvent = {
  id: string;
  ts: string;
  area: PatDiagnosticArea;
  level: PatDiagnosticLevel;
  status: PatDiagnosticStatus;
  summary: string;
  details: Record<string, Primitive | Primitive[]>;
};

declare global {
  var __patDiagnosticsStore: PatDiagnosticEvent[] | undefined;
}

const MAX_EVENTS = 40;

const patDiagnosticsStore = globalThis.__patDiagnosticsStore ?? [];
globalThis.__patDiagnosticsStore = patDiagnosticsStore;

function sanitizeValue(value: unknown): Primitive | Primitive[] | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .filter(
        (entry): entry is Primitive =>
          entry === null ||
          typeof entry === "string" ||
          typeof entry === "number" ||
          typeof entry === "boolean"
      )
      .slice(0, 12);
  }

  return undefined;
}

function sanitizeDetails(
  input: Record<string, unknown> | undefined
): Record<string, Primitive | Primitive[]> {
  if (!input) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, sanitizeValue(value)] as const)
      .filter((entry): entry is [string, Primitive | Primitive[]] => entry[1] !== undefined)
  );
}

export function recordPatDiagnostic(input: {
  area: PatDiagnosticArea;
  level: PatDiagnosticLevel;
  status: PatDiagnosticStatus;
  summary: string;
  details?: Record<string, unknown>;
}) {
  const event: PatDiagnosticEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    ts: new Date().toISOString(),
    area: input.area,
    level: input.level,
    status: input.status,
    summary: input.summary,
    details: sanitizeDetails(input.details),
  };

  patDiagnosticsStore.unshift(event);
  if (patDiagnosticsStore.length > MAX_EVENTS) {
    patDiagnosticsStore.length = MAX_EVENTS;
  }

  if (input.level !== "info") {
    const logger = input.level === "error" ? console.error : console.warn;
    logger(`[pat-diagnostic] ${JSON.stringify(event)}`);
  }

  return event;
}

export function getPatDiagnosticsSnapshot() {
  const recent = [...patDiagnosticsStore];
  const latestByArea = new Map<PatDiagnosticArea, PatDiagnosticEvent>();

  for (const event of recent) {
    if (!latestByArea.has(event.area)) {
      latestByArea.set(event.area, event);
    }
  }

  return {
    recent,
    latestByArea,
  };
}

export function getLatestPatDiagnostic(area: PatDiagnosticArea) {
  return getPatDiagnosticsSnapshot().latestByArea.get(area) ?? null;
}
