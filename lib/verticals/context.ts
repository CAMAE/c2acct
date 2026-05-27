/**
 * Resolve the "current vertical" for a request. Phase 2 V1 is single-vertical
 * (accounting); existing routes/queries apply this default transparently. The
 * future hook is here: derive from session/org once tenants span verticals.
 */
export const DEFAULT_VERTICAL_ID = "accounting";

export function resolveCurrentVertical(): string {
  const override = process.env.PAT_DEFAULT_VERTICAL?.trim();
  return override && override.length > 0 ? override : DEFAULT_VERTICAL_ID;
}
