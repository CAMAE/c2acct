export function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
