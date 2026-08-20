/**
 * Minimal 5-field cron matcher (minute hour day-of-month month day-of-week).
 *
 * Each field supports: wildcard, step (wildcard or range followed by a slash and
 * an integer), single values, ranges, and comma lists of those — enough for the
 * Phase 1 agent cadences ("0 * * * *", "0 8 * * *", "0 (star)/2 * * *").
 * Evaluated against local time (launchd runs in the host timezone). Day-of-week
 * accepts 0 or 7 for Sunday. The day-of-month / day-of-week OR special-case is
 * not implemented (no Phase 1 expression restricts both).
 *
 * DST HANDLING. Local time is not a continuous line, and an hour-pinned daily
 * cron sits directly on the discontinuity:
 *   - SPRING FORWARD skips an hour entirely. `0 2 * * *` in a zone that jumps
 *     01:59 → 03:00 matched nothing that day, so the agent silently did not run
 *     — once a year, with no error anywhere. Such an expression now fires a
 *     catch-up at the first real instant after the gap (see below).
 *   - FALL BACK repeats an hour. `0 1 * * *` matches twice, but the scheduler
 *     dedupes per wall-clock minute (Scheduler.checkCron builds its key from
 *     the local hour/minute), so the repeat is suppressed and the agent runs
 *     once. That half needs no change here.
 */

const FIELD_BOUNDS: ReadonlyArray<{ min: number; max: number }> = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day of month
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 }, // day of week (0 = Sunday)
];

export function cronMatches(expression: string, date: Date): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    return false;
  }

  const values = [
    date.getMinutes(),
    date.getHours(),
    date.getDate(),
    date.getMonth() + 1,
    date.getDay(),
  ];

  const direct = fields.every((field, index) =>
    matchField(field, values[index], FIELD_BOUNDS[index].min, FIELD_BOUNDS[index].max)
  );
  if (direct) {
    return true;
  }

  return matchesDstSkippedHour(fields, date);
}

/** Does this local hour exist on this local date? False inside a DST spring-forward gap. */
export function localHourExists(date: Date, hour: number): boolean {
  const probe = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0);
  return probe.getHours() === hour;
}

/**
 * Catch-up match for an hour erased by DST.
 *
 * If the expression targets an hour that does not exist on this local date, the
 * run is due at the instant the clock jumped to. `new Date(Y, M, D, missingHour,
 * minute)` normalizes to exactly that instant, so comparing `now` against it
 * fires the catch-up once, at the first real minute after the gap — and only on
 * the one day a year the gap exists.
 */
function matchesDstSkippedHour(fields: string[], date: Date): boolean {
  const [minuteField, hourField, domField, monthField, dowField] = fields;

  // A wildcard hour matches every existing hour already; nothing can be skipped.
  if (hourField === "*") {
    return false;
  }

  // The date fields must still match today.
  if (
    !matchField(domField, date.getDate(), FIELD_BOUNDS[2].min, FIELD_BOUNDS[2].max) ||
    !matchField(monthField, date.getMonth() + 1, FIELD_BOUNDS[3].min, FIELD_BOUNDS[3].max) ||
    !matchField(dowField, date.getDay(), FIELD_BOUNDS[4].min, FIELD_BOUNDS[4].max)
  ) {
    return false;
  }

  for (let hour = FIELD_BOUNDS[1].min; hour <= FIELD_BOUNDS[1].max; hour += 1) {
    if (!matchField(hourField, hour, FIELD_BOUNDS[1].min, FIELD_BOUNDS[1].max)) {
      continue;
    }
    if (localHourExists(date, hour)) {
      continue; // not skipped — the direct match already had its chance
    }
    for (let minute = FIELD_BOUNDS[0].min; minute <= FIELD_BOUNDS[0].max; minute += 1) {
      if (!matchField(minuteField, minute, FIELD_BOUNDS[0].min, FIELD_BOUNDS[0].max)) {
        continue;
      }
      const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
      if (shifted.getHours() === date.getHours() && shifted.getMinutes() === date.getMinutes()) {
        return true;
      }
    }
  }
  return false;
}

function matchField(field: string, value: number, min: number, max: number): boolean {
  return field.split(",").some((part) => matchPart(part, value, min, max));
}

function matchPart(part: string, value: number, min: number, max: number): boolean {
  if (part === "*") {
    return true;
  }

  const [rangePart, stepPart] = part.split("/");
  const step = stepPart ? Number.parseInt(stepPart, 10) : 1;
  if (!Number.isInteger(step) || step <= 0) {
    return false;
  }

  let lo = min;
  let hi = max;
  if (rangePart !== "*") {
    if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-").map((n) => Number.parseInt(n, 10));
      lo = a;
      hi = b;
    } else {
      lo = Number.parseInt(rangePart, 10);
      hi = lo;
    }
  }
  if (!Number.isInteger(lo) || !Number.isInteger(hi)) {
    return false;
  }

  // Day-of-week: normalize a 7 in the value space to 0 (Sunday).
  const candidate = value;
  const candidateAlt = max === 6 && value === 0 ? 7 : value;

  for (let v = lo; v <= hi; v += step) {
    if (v === candidate || v === candidateAlt) {
      return true;
    }
  }
  return false;
}

/**
 * Is this expression well-formed and satisfiable?
 *
 * Validated FIELD BY FIELD rather than by simulating a window of time. A
 * brute-force probe has to cover every day-of-week AND every day-of-month to
 * avoid false negatives — a single-day probe rejects "0 14 * * 1" (Mondays)
 * simply for having started on a Thursday. Each field is independent here, so
 * checking that each one matches at least one value in its own range is both
 * exact and cheap.
 */
export function isValidCronExpression(expression: string): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    return false;
  }
  return fields.every((field, index) => {
    const { min, max } = FIELD_BOUNDS[index];
    for (let value = min; value <= max; value += 1) {
      if (matchField(field, value, min, max)) {
        return true;
      }
    }
    return false;
  });
}
