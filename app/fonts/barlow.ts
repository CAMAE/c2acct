import localFont from "next/font/local";

// The ingested package did not include Barlow Condensed files,
// so phase 1 wires the closest available local Barlow weights.
export const barlow = localFont({
  src: [
    {
      path: "./barlow/Barlow-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./barlow/Barlow-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./barlow/Barlow-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./barlow/Barlow-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-barlow",
});

export const barlowDisplay = localFont({
  src: [
    {
      path: "./barlow/Barlow-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./barlow/Barlow-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-barlow-display",
});

export const barlowFontClassName = `${barlow.variable} ${barlowDisplay.variable}`;

