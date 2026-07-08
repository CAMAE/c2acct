import { describe, expect, it } from "vitest";
import { sliderValueFromPointer } from "@/lib/scoreSlider";

/**
 * Score-slider click-to-position (P1 fix). The native track-click jumped to max
 * regardless of position; this drives the value from the click X. Synthetic
 * event: getBoundingClientRect + clientX are the only inputs.
 */

function eventAt(clientX: number, left = 100, width = 200) {
  return {
    clientX,
    currentTarget: { getBoundingClientRect: () => ({ left, width }) },
  } as unknown as Parameters<typeof sliderValueFromPointer>[0];
}

describe("sliderValueFromPointer", () => {
  it("maps click position to the scale (not always max)", () => {
    expect(sliderValueFromPointer(eventAt(100), 0, 5)).toBe(0); // far left
    expect(sliderValueFromPointer(eventAt(300), 0, 5)).toBe(5); // far right
    expect(sliderValueFromPointer(eventAt(200), 0, 5)).toBe(3); // middle -> 2.5 -> round 3
    expect(sliderValueFromPointer(eventAt(160), 0, 5)).toBe(2); // 30% -> 1.5 -> round 2
  });

  it("clamps clicks beyond the track to the scale bounds", () => {
    expect(sliderValueFromPointer(eventAt(0), 0, 5)).toBe(0);
    expect(sliderValueFromPointer(eventAt(999), 0, 5)).toBe(5);
  });

  it("honours a custom min/max/step and a zero-width track", () => {
    expect(sliderValueFromPointer(eventAt(200), 1, 5)).toBe(3); // (1..5) midpoint = 3
    expect(sliderValueFromPointer(eventAt(150, 100, 200), 0, 10, 2)).toBe(2); // 25% of 10 = 2.5 -> step 2 -> 2
    const zeroWidth = { clientX: 150, currentTarget: { getBoundingClientRect: () => ({ left: 100, width: 0 }) } } as never;
    expect(sliderValueFromPointer(zeroWidth, 0, 5)).toBe(0);
  });
});
