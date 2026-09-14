import Link from "next/link";
import { TRUST_FOOTER_LINKS } from "@/lib/trustContent";
import type { ReactNode } from "react";
import { getRequestLocale } from "@/lib/requestLocale";
import LanguageSelector from "@/app/components/shell/LanguageSelector";
import SignedInHeaderControls from "@/app/components/shell/SignedInHeaderControls";
import SignedOutHeaderMenu from "@/app/components/shell/SignedOutHeaderMenu";
import { getSessionUser } from "@/lib/auth/session";

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
 *
 * R3 (box 2, 2026-09-11): session-aware. Signed out the nav is byte-for-byte what it
 * was (Methodology · Trust · language · Sign in). Signed in, the Sign in pill gives
 * way to the same controls AppShell shows — Ask Pat (consent-gated), the bell
 * (pings flag), Membership, the navigation menu, Sign out — via
 * SignedInHeaderControls, so a signed-in user keeps their shell on every public page.
 */
const borderLt = "rgba(12,33,66,.07)";

export default async function V7PublicShell({ children }: { children: ReactNode }) {
  const currentLocale = await getRequestLocale();
  const signedIn = !!(await getSessionUser());

  return (
    <div className="flex min-h-screen shrink-0 flex-col bg-[#fbfcfe] text-[var(--shell-ink)]" data-testid="v7-public-shell">
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
        <div className="mx-auto flex h-[78px] max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-9">
          {/* A2 (box 2b, Cam 9/14): production's logo link name, "Open home". */}
          <Link href="/" aria-label="Open home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/PAT.png" alt="PAT" className="block h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-3 text-[15px] font-semibold text-[var(--shell-muted)] sm:gap-[24px]">
            <Link href="/methodology">Methodology</Link>
            <Link href="/trust">Trust</Link>
            <LanguageSelector currentLocale={currentLocale} />
            {signedIn ? (
              <SignedInHeaderControls />
            ) : (
              <>
                <Link href="/sign-in" className="shrink-0 whitespace-nowrap rounded-full bg-[var(--shell-ink)] px-5 py-[11px] font-semibold text-white sm:px-6">
                  Sign in
                </Link>
                {/* A1 (box 2b, Cam 9/14 "all as recommended"): production's navigation
                    menu for a signed-out visitor — Home / Meet PAT / Sign in / Vendor /
                    Firm / [Consultant] / Trust / Return to C2Acct — composed from the
                    same HeaderControlsMenu the signed-in shell uses (no bell, no
                    Membership, no Sign out). The look of the nav is unchanged. */}
                <SignedOutHeaderMenu />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Box 2b: one <main> landmark around the page, as production's AppShell gives every
          page (the pat-shell-main element) — the guard keys controls by region, and V7 pages rendered
          without one filed their content under the shell. */}
      <main className="flex flex-1 flex-col">{children}</main>

      {/* PRODUCT FOOTER */}
      <footer className="mt-auto bg-white pb-11 pt-8 text-center" style={{ borderTop: `1px solid ${borderLt}` }}>
        <div className="mx-auto max-w-[1120px] px-9">
          {/* Depth box 0.2: the same link row the AppShell footer renders —
              TRUST_FOOTER_LINKS, nine links, one row (wraps at 390). */}
          <div className="flex flex-wrap justify-center gap-x-[26px] gap-y-2 text-[14px] font-semibold text-[var(--shell-muted)]">
            {TRUST_FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-[var(--shell-ink)]">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 text-[13.5px] text-[var(--shell-muted)]">
            Copyright 2026 C2Acct · PAT — Performance Alignment Technology · a Patalign™ product
          </div>
        </div>
      </footer>
    </div>
  );
}
