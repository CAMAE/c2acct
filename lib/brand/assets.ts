export const brandColors = {
  c2Blue: "#063674",
  lightBlue: "#4FBFE2",
  accountingGreen: "#33E573",
  orange: "#FC4713",
  charcoal: "#202020",
  cream: "#F1F2EE",
  white: "#FFFFFF",
} as const;

export const brandSourcePaths = {
  c2Logo: "/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/C2 LOGO.png",
  patLogo: "/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/PAT LOGO.png",
  combinedLogo:
    "/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/C2 : PAT LOGO COMBO.png",
  c2StyleGuide:
    "/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/C2 Logo 2/C2 Logo/C2_style guide.pdf",
  barlowDirectory: "/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/Barlow",
} as const;

export const divisionThemes = {
  accounting: {
    key: "accounting",
    label: "Accounting",
    accent: brandColors.accountingGreen,
    c2MarkPath: "/brand/divisions/accounting/c2-accounting-green.png",
    c2MarkWhitePath: "/brand/divisions/accounting/c2-accounting-white-green.png",
  },
} as const;

export const brandAssets = {
  c2: {
    primaryMarkPath: "/brand/c2/c2-logo-accounting.png",
    primaryMarkSourcePath: brandSourcePaths.c2Logo,
    legacyPrimaryMarkPath: "/brand/c2/c2-main-blue.png",
    legacyPrimaryMarkSourcePath: "/brand/c2/c2-main-blue.eps",
    whiteMarkPath: "/brand/c2/c2-main-white.png",
    whiteMarkSourcePath: "/brand/c2/c2-main-white.eps",
    iconPath: "/brand/c2/c2-icon.png",
    iconSourcePath: "/brand/c2/c2-icon.eps",
  },
  pat: {
    primaryMarkPath: "/brand/pat/pat-logo-accounting.png",
    primaryMarkSourcePath: brandSourcePaths.patLogo,
    status: "raster-upload",
  },
  combined: {
    supportiveMarkPath: "/brand/combined/c2-pat-logo-combined.png",
    supportiveMarkSourcePath: brandSourcePaths.combinedLogo,
    usage: "supportive-only",
  },
  divisions: divisionThemes,
} as const;

export type DivisionKey = keyof typeof divisionThemes;

export const activeDivision: DivisionKey = "accounting";
