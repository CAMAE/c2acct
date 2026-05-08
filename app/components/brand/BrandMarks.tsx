import Image from "next/image";

import { activeDivision, brandAssets } from "@/lib/brand/assets";

type BrandMarksProps = {
  mode?: "header" | "hero";
  tone?: "light" | "dark";
  className?: string;
};

type MarkProps = {
  mode?: "header" | "hero";
};

function getMarkSize(mode: "header" | "hero") {
  if (mode === "hero") {
    return {
      c2: { width: 1181, height: 696, className: "h-13 w-auto sm:h-15" },
      pat: { width: 800, height: 294, className: "h-10 w-auto sm:h-12" },
      accountingLabel: "text-[1.12rem] sm:text-[1.24rem]",
      patWord: "text-sm sm:text-base",
      divider: "h-14 sm:h-16",
    };
  }

  return {
    c2: { width: 1181, height: 696, className: "h-[2.7rem] w-auto sm:h-[3rem]" },
    pat: { width: 800, height: 294, className: "h-7 w-auto max-w-[110px] sm:h-8 sm:max-w-[130px]" },
    accountingLabel: "text-[1rem] sm:text-[1.1rem]",
    patWord: "text-[0.72rem] sm:text-[0.78rem]",
    divider: "h-[2.35rem] sm:h-[2.65rem]",
  };
}

export function C2BrandMark({ mode = "header" }: MarkProps) {
  const size = getMarkSize(mode).c2;

  return (
    <Image
      src={brandAssets.c2.primaryMarkPath}
      alt={`C2 ${brandAssets.divisions[activeDivision].label} logo`}
      width={size.width}
      height={size.height}
      priority={mode === "hero"}
      className={`${size.className} shrink-0`}
    />
  );
}

export function PatBrandMark({ mode = "header" }: MarkProps) {
  const size = getMarkSize(mode).pat;

  if (!brandAssets.pat.primaryMarkPath) {
    return null;
  }

  return (
    <Image
      src={brandAssets.pat.primaryMarkPath}
      alt="PAT logo"
      width={size.width}
      height={size.height}
      priority={mode === "hero"}
      className={`${size.className} shrink-0`}
    />
  );
}

export function PatLogoLockup({
  mode = "header",
  tone = mode === "hero" ? "dark" : "light",
  className = "",
}: BrandMarksProps) {
  const size = getMarkSize(mode);
  const textTone = tone === "dark" ? "text-white" : "text-[var(--shell-ink)]";
  const dividerTone = tone === "dark" ? "bg-white/18" : "bg-[rgba(12,33,66,0.12)]";

  return (
    <div className={`flex flex-wrap items-center gap-3 text-left sm:gap-4 ${className}`}>
      <PatBrandMark mode={mode} />
      <div className={`w-px ${size.divider} ${dividerTone}`} aria-hidden="true" />
      <div className={`font-medium uppercase leading-tight tracking-[0.08em] ${size.patWord} ${textTone}`}>
        Performance Alignment Technology
      </div>
    </div>
  );
}

export function BrandLockup({ mode = "header", tone = mode === "hero" ? "dark" : "light", className }: BrandMarksProps) {
  if (mode === "header") {
    return <PatLogoLockup mode={mode} tone={tone} className={className} />;
  }

  return <PatLogoLockup mode={mode} tone={tone} className={className} />;
}

export default BrandLockup;

export function PatHomepageLockup({ tone = "light" }: { tone?: "light" | "dark" }) {
  return <PatLogoLockup mode="hero" tone={tone} />;
}
