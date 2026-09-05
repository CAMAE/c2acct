import Link from "next/link";
import type { ReactNode } from "react";
import { getRequestLocale } from "@/lib/requestLocale";
import LanguageSelector from "@/app/components/shell/LanguageSelector";

/**
 * Block 21a — the V7 product-native public shell: the front-door nav (now with the
 * EN/FR/ES language selector reused from AppHeader) + the product footer, wrapping
 * any public-page content. Dark behind PAT_ENABLE_NEW_FRONT_DOOR.
 *
 * STEP 2b: the (public) route group renders this shell DIRECTLY (the root layout is
 * now just html/body — no AppHeader, no root footer, no pat-shell-main). There is no
 * longer any app chrome to hide, so the STEP-1 full-bleed escape is gone; this shell
 * is a plain min-h-screen block child of body.pat-shell. The only scoped rule left is
 * the V7 pat-label size (the shared product class is 11px; 12px inside this shell).
 */
const borderLt = "rgba(12,33,66,.07)";

export default async function V7PublicShell({ children }: { children: ReactNode }) {
  const currentLocale = await getRequestLocale();

  return (
    <div className="min-h-screen bg-[#fbfcfe] text-[var(--shell-ink)]" data-testid="v7-public-shell">
      {/* V7-scoped pat-label size (12px inside this shell; the shared class is 11px). */}
      <style
        dangerouslySetInnerHTML={{
          __html: '[data-testid="v7-public-shell"] .pat-label{font-size:12px}',
        }}
      />
      {/* NAV — shared V7 public nav + language selector */}
      <nav
        className="sticky top-0 z-10 border-b bg-[rgba(251,252,254,.88)] backdrop-blur-[10px]"
        style={{ borderColor: borderLt }}
      >
        <div className="mx-auto flex h-[78px] max-w-[1120px] items-center justify-between px-9">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/PAT.png" alt="PAT" className="block h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-[24px] text-[15px] font-semibold text-[var(--shell-muted)]">
            <Link href="/methodology">Methodology</Link>
            <Link href="/trust">Trust</Link>
            <LanguageSelector currentLocale={currentLocale} />
            <Link href="/sign-in" className="rounded-full bg-[var(--shell-ink)] px-6 py-[11px] font-semibold text-white">
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {children}

      {/* PRODUCT FOOTER */}
      <footer className="bg-white pb-11 pt-8 text-center" style={{ borderTop: `1px solid ${borderLt}` }}>
        <div className="mx-auto max-w-[1120px] px-9">
          <div className="flex flex-wrap justify-center gap-[26px] text-[14px] font-semibold text-[var(--shell-muted)]">
            <Link href="/trust">Trust</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            {/* Methodology is NOT repeated here: the nav carries it on every public
                page and the door's trust accordion lists it — two occurrences on the
                door, per the 21a verdict. */}
            {/* Footer parity with the product: "Build proof" → /release. */}
            <Link href="/release">Build proof</Link>
          </div>
          <div className="mt-4 text-[13.5px] text-[var(--shell-muted)]">
            Copyright 2026 C2Acct · PAT — Performance Alignment Technology · a Patalign™ product
          </div>
        </div>
      </footer>
    </div>
  );
}
