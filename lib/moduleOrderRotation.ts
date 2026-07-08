/**
 * Per-user module order rotation (flag: PAT_ENABLE_MODULE_ORDER_ROTATION, default
 * OFF).
 *
 * The five firm alignment modules are presented in a fixed canonical order today.
 * When the flag is on, each user sees a Latin-square rotation of that order that
 * is deterministic from their user id and therefore stable across sessions and
 * resume-safe. This is PRESENTATION ONLY — scoring, benchmarks, and insight
 * unlocks key modules by id and are unaffected by the display order.
 *
 * The rotation is a cyclic shift by `hash(userId) % n`. Across the n residue
 * classes the shifts form a Latin square: every module lands in every position
 * exactly once, so no position is systematically biased toward one module (the
 * anti-anchoring goal). Pure + unit-tested in tests/module-order-rotation.test.ts.
 */

// FNV-1a-style stable string hash. Deterministic; no Math.random / Date (both are
// unavailable in some runtimes here and would break stability regardless).
function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The cyclic shift this user gets for a list of `count` items (0..count-1). */
export function moduleRotationOffset(userId: string, count: number): number {
  if (count <= 0) {
    return 0;
  }
  return stableHash(userId) % count;
}

/** Cyclic left-rotation of `items` by `offset` positions (offset normalized). */
export function rotateByOffset<T>(items: readonly T[], offset: number): T[] {
  const n = items.length;
  if (n === 0) {
    return [];
  }
  const k = ((offset % n) + n) % n;
  return [...items.slice(k), ...items.slice(0, k)];
}

export function isModuleOrderRotationEnabled(): boolean {
  return process.env.PAT_ENABLE_MODULE_ORDER_ROTATION === "1";
}

/**
 * Return `items` in this user's stable presentation order. When the flag is off
 * (or there is no user id) the input order is returned unchanged.
 */
export function orderModulesForUser<T>(items: readonly T[], userId: string | null | undefined): T[] {
  if (!isModuleOrderRotationEnabled() || !userId) {
    return [...items];
  }
  return rotateByOffset(items, moduleRotationOffset(userId, items.length));
}
