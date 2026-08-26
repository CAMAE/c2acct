import {
  evaluateBenchmarkSuppression,
  type BenchmarkSuppression,
} from "@/lib/benchmarkSuppression";
import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";
import { listVerticalIds } from "@/lib/verticals/registry";

/**
 * Benchmark cohort isolation (W6, VERTICAL-READINESS-AUDIT-2026-08 §5.1).
 *
 * §5.1 is the one risk in this framework that can corrupt PUBLISHED numbers,
 * and the reason is precise: suppression already enforces a 5-contributor floor
 * and a 25% dominance cap, and **neither rule would notice a cross-vertical
 * pool**. Five firms are five firms whether or not they are in the same
 * industry. The counts still pass; every published benchmark silently changes
 * meaning. Nothing downstream fails, which is exactly why it needs an explicit
 * invariant rather than a careful convention.
 *
 * The invariant:
 *
 *   A benchmark cohort contains exactly one vertical's contributors, and a
 *   mixed contributor set is a THROWN ERROR, never a filtered one.
 *
 * Throwing rather than filtering is deliberate and is the whole design. A
 * filter would "handle" the mixed input: it would drop the foreign rows,
 * publish a plausible-looking number, and leave no trace that a caller had
 * assembled a cross-vertical pool. The bug that produced the mix would survive,
 * and the next caller would hit it too. An exception is the only outcome that
 * makes the defect visible at the moment it is introduced.
 *
 * The same reasoning covers an unknown or packless vertical: a cohort keyed to
 * a vertical that no installed pack defines is not an empty cohort, it is a
 * caller with a bad id. Silent acceptance is the bug.
 */

export type BenchmarkCohortIsolationCode =
  | "mixed_verticals"
  | "foreign_vertical"
  | "unknown_vertical"
  | "blank_vertical";

export class BenchmarkCohortIsolationError extends Error {
  constructor(
    public readonly code: BenchmarkCohortIsolationCode,
    message: string
  ) {
    super(message);
    this.name = "BenchmarkCohortIsolationError";
  }
}

/** One firm/vendor's contribution to a cut, tagged with the vertical it belongs to. */
export type CohortContributor = {
  companyId: string;
  verticalId: string;
  /** Data points supplied. Defaults to 1 (one-firm-one-vote). */
  weight?: number;
};

function clean(verticalId: string | null | undefined): string {
  const trimmed = verticalId?.trim();
  if (!trimmed) {
    throw new BenchmarkCohortIsolationError(
      "blank_vertical",
      "A benchmark cohort contributor carries a blank verticalId. A missing vertical is " +
        "not a default — the row cannot be placed in any cohort."
    );
  }
  return trimmed;
}

/**
 * The cohort key for a vertical.
 *
 * Accounting keeps TODAY'S LITERAL KEY — `firm:real`, `vendor:demo` and so on —
 * with no vertical segment appended. That is not cosmetic: `BenchmarkCohort.key`
 * is unique and already stored, so qualifying accounting's key would orphan
 * every existing cohort row and every CompanyBenchmark that points at it. It is
 * also what makes accounting's cohorts byte-identical flag-off AND
 * flag-on-with-only-accounting-data, which is the third isolation proof.
 *
 * Another vertical gets its id appended, so its cohorts are separate ROWS rather
 * than a filtered view of a shared row. This key is only ever CONSTRUCTED, never
 * parsed back apart: a cohort's vertical is read from the `verticalId` column on
 * its membership rows (W5), which is the single source of truth.
 */
export function benchmarkCohortKey(baseKey: string, verticalId: string): string {
  const resolved = clean(verticalId);
  return resolved === DEFAULT_VERTICAL_ID ? baseKey : `${baseKey}:${resolved}`;
}

/**
 * Fail loudly for a vertical no installed pack defines.
 *
 * A packless vertical is a caller with a bad id, not an empty cohort. Accepting
 * it would create real benchmark rows under a vertical nothing can ever resolve,
 * render or suppress — rows that look valid and mean nothing.
 */
export async function assertVerticalPackInstalled(verticalId: string): Promise<string> {
  const resolved = clean(verticalId);
  const installed = await listVerticalIds();
  if (!installed.includes(resolved)) {
    throw new BenchmarkCohortIsolationError(
      "unknown_vertical",
      `No Vertical Pack is installed for "${resolved}", so no benchmark cohort can be ` +
        `constructed under it. Installed packs: ${installed.join(", ") || "(none)"}.`
    );
  }
  return resolved;
}

/**
 * THE invariant. Assert that every contributor belongs to `cohortVerticalId`.
 *
 * Throws on the first foreign contributor, naming it. Returns the contributors
 * unchanged on success — it is an assertion, not a filter, and the return value
 * exists so a caller can write `for (const c of assertSingleVerticalCohort(...))`
 * and be unable to forget the check.
 */
export function assertSingleVerticalCohort<T extends CohortContributor>(
  cohortVerticalId: string,
  contributors: readonly T[]
): readonly T[] {
  const cohortVertical = clean(cohortVerticalId);

  const foreign = contributors.filter((contributor) => clean(contributor.verticalId) !== cohortVertical);
  if (foreign.length === 0) {
    return contributors;
  }

  const others = [...new Set(foreign.map((contributor) => contributor.verticalId.trim()))].sort();
  throw new BenchmarkCohortIsolationError(
    foreign.length === contributors.length ? "foreign_vertical" : "mixed_verticals",
    `Benchmark cohort for vertical "${cohortVertical}" was given ${foreign.length} contributor(s) ` +
      `from ${others.map((id) => `"${id}"`).join(", ")} ` +
      `(e.g. company ${foreign[0].companyId}). A cohort holds exactly one vertical. ` +
      "This is thrown rather than filtered on purpose: dropping the foreign rows would " +
      "publish a plausible number and hide the caller that mixed them."
  );
}

/**
 * Suppression, counted PER VERTICAL.
 *
 * `evaluateBenchmarkSuppression` is vertical-neutral arithmetic (class c) and
 * stays that way — the floor is still 5 and the cap is still 25%. What changes
 * is the denominator: only the named vertical's contributors are counted, so
 * three accounting firms plus three fixture firms is three, not six, and stays
 * suppressed for both. Pooling them would clear the floor with a cut that means
 * nothing, which is precisely audit §5.1's warning.
 *
 * Contributors are asserted single-vertical first: a mixed input reaching here
 * is a caller bug, and quietly counting the subset would hide it.
 */
export function evaluateBenchmarkSuppressionForVertical(
  cohortVerticalId: string,
  contributors: readonly CohortContributor[]
): BenchmarkSuppression {
  assertSingleVerticalCohort(cohortVerticalId, contributors);
  return evaluateBenchmarkSuppression(contributors.map((contributor) => contributor.weight ?? 1));
}

/**
 * Split a mixed set into per-vertical cohorts.
 *
 * The ONLY sanctioned way to handle rows from more than one vertical: they
 * become separate cohorts, never one filtered cohort. Use this where a mix is
 * legitimately expected (a cross-vertical job iterating every tenant); use
 * {@link assertSingleVerticalCohort} everywhere a single cohort is being built.
 */
export function partitionByVertical<T extends CohortContributor>(
  contributors: readonly T[]
): Map<string, T[]> {
  const byVertical = new Map<string, T[]>();
  for (const contributor of contributors) {
    const verticalId = clean(contributor.verticalId);
    const bucket = byVertical.get(verticalId) ?? [];
    bucket.push(contributor);
    byVertical.set(verticalId, bucket);
  }
  return byVertical;
}
