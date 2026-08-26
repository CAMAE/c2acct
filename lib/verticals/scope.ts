import { resolveCurrentVertical, type ResolveVerticalOptions } from "./context";
import { isVerticalPacksEnabled } from "./flag";

/**
 * The query/write scope seam for verticalized content
 * (VERTICAL-READINESS-AUDIT-2026-08 §3.3, W5).
 *
 * The governing invariant is that PAT_ENABLE_VERTICAL_PACKS off is
 * byte-identical to pre-framework behaviour, and for the storage layer that
 * means something very specific and testable:
 *
 *   flag off  ⇒ this returns `{}`
 *
 * An empty object spread into a Prisma `where` adds no predicate, so the SQL
 * Postgres plans is the SQL it planned before this framework existed. No new
 * filter, no new index use, no query-plan change for a default tenant. Spread
 * into a `data` payload it names no column, so the write is the write it was
 * and the server-side `DEFAULT 'accounting'` from the W5 migration supplies the
 * value — which is why that default is the true value rather than a fallback.
 *
 * The shape is deliberately `{}` rather than `{ verticalId: undefined }`.
 * Prisma treats an explicit `undefined` as "no filter" too, but the two are not
 * the same object, `expect(...).toEqual({})` can tell them apart, and the
 * contract test asserts on the empty one — a filter that is absent is provable
 * in a way that a filter that is present-but-undefined is not.
 *
 * Flag on, the resolved vertical is applied. Resolution runs the full order
 * (explicit → tenant → env → constant); flag off it never runs at all, so a
 * mis-seeded `Company.verticalId` cannot reach a default tenant's queries.
 */
export type VerticalScope = { verticalId?: string };

function scope(options: ResolveVerticalOptions): VerticalScope {
  if (!isVerticalPacksEnabled(options.env ?? process.env)) {
    return {};
  }
  return { verticalId: resolveCurrentVertical(options) };
}

/**
 * Spread into a Prisma `where` on a verticalized model.
 *
 *   where: { companyId, ...verticalFilter({ session }) }
 *
 * Flag off this contributes nothing at all. Flag on it scopes the read to the
 * resolved vertical.
 */
export function verticalFilter(options: ResolveVerticalOptions = {}): VerticalScope {
  return scope(options);
}

/**
 * Spread into a Prisma `create`/`update` `data` payload on a verticalized model.
 *
 *   data: { ...row, ...verticalStamp({ session }) }
 *
 * Flag off this names no column and the database default stamps `"accounting"`.
 * Flag on it stamps the resolved vertical explicitly. Same implementation as
 * {@link verticalFilter} on purpose — read scope and write stamp must never be
 * able to disagree about which vertical a request is in — but named separately
 * so that a call site says which of the two it is doing.
 */
export function verticalStamp(options: ResolveVerticalOptions = {}): VerticalScope {
  return scope(options);
}
