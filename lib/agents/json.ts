import type { Prisma } from "@prisma/client";

/**
 * Coerce an arbitrary value into something Prisma will accept for a `Json`
 * column. Round-tripping through JSON drops `undefined`, functions, and other
 * non-serializable members so a stray value never throws at the persistence
 * boundary (audit log, step trace).
 *
 * Prisma rejects a bare JS `null` for `Json` columns (it wants `Prisma.JsonNull`
 * / `Prisma.DbNull`), so nullish or unserializable input collapses to `{}`.
 * Call sites that want a column left NULL should omit the field instead of
 * passing `null` through here.
 */
export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return {} as Prisma.InputJsonValue;
  }
  const json = JSON.stringify(value);
  if (json === undefined) {
    return {} as Prisma.InputJsonValue;
  }
  return JSON.parse(json) as Prisma.InputJsonValue;
}
