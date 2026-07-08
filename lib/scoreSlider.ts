import type { PointerEvent } from "react";

/**
 * Compute a score-slider value from the pointer's X position over the track
 * (P1 fix, 2026-07-07). The native `<input type="range">` track-click was
 * jumping to max regardless of where you clicked; driving the value from the
 * click position makes click-to-position deterministic. Keyboard stays on the
 * native onChange path.
 *
 * Pure + unit-tested (tests/score-slider.test.ts) — the DOM bits (clientX,
 * getBoundingClientRect) are the only inputs, so it's exercised with a synthetic
 * event.
 */
export function sliderValueFromPointer(
  event: Pick<PointerEvent<HTMLInputElement>, "clientX" | "currentTarget">,
  min: number,
  max: number,
  step = 1
): number {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width <= 0) {
    return min;
  }
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  const raw = min + ratio * (max - min);
  const snapped = Math.round(raw / step) * step;
  return Math.min(Math.max(snapped, min), max);
}
