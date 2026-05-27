/**
 * Minimal 5-field cron matcher (minute hour day-of-month month day-of-week).
 *
 * Each field supports: wildcard, step (wildcard or range followed by a slash and
 * an integer), single values, ranges, and comma lists of those — enough for the
 * Phase 1 agent cadences ("0 * * * *", "0 8 * * *", "0 (star)/2 * * *").
 * Evaluated against local time (launchd runs in the host timezone). Day-of-week
 * accepts 0 or 7 for Sunday. The day-of-month / day-of-week OR special-case is
 * not implemented (no Phase 1 expression restricts both).
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

  return fields.every((field, index) =>
    matchField(field, values[index], FIELD_BOUNDS[index].min, FIELD_BOUNDS[index].max)
  );
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
