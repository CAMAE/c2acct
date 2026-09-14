import Link from "next/link";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import V7PublicShell from "@/app/components/frontdoor/V7PublicShell";
import AppShell from "@/app/components/shell/AppShell";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

/**
 * B8-4: branded light-theme 404, replacing Next's dark default. PAT header
 * lockup + plain-language copy + links back to sign-in and each portal home.
 *
 * R4 (box 2, 2026-09-11): the 404 renders inside the shell in BOTH flag modes —
 * V7PublicShell flag-on (since 48bbae69), AppShell flag-off (this box). The root
 * not-found boundary sits above the route-group layouts, so it wraps itself.
 */
export default function NotFound() {
  const destinations: { href: string; label: string; hint: string }[] = [
    { href: "/sign-in", label: "Sign in", hint: "Return to the sign-in page" },
    { href: "/firm", label: "Firm portal", hint: "Your firm workspace" },
    { href: "/vendor", label: "Vendor portal", hint: "Your vendor workspace" },
    { href: "/consultants", label: "Consultant portal", hint: "Ecosystems and briefs" },
  ];

  // Finish box 2 (item 2): flag-on the 404 sits inside the V7 public shell
  // (nav + footer) like every other public page; flag-off it is unchanged.
  if (isNewFrontDoorEnabled()) {
    return (
      <V7PublicShell>
        <div className="pat-container flex items-center justify-center px-6 py-16 text-[var(--shell-ink)]">
          <div className="w-full max-w-xl">
            <p className="pat-label">Page not found</p>
            <h1 className="pat-h1 mt-3">We couldn&apos;t find that page.</h1>
            <p className="pat-body mt-3 text-[var(--shell-muted)]">
              The link may be out of date or the page may have moved. Pick up from one of these
              instead:
            </p>
            <nav className="mt-8 grid gap-3 sm:grid-cols-2">
              {destinations.map((destination) => (
                <Link key={destination.href} href={destination.href} className="pat-card pat-card-interactive block p-5">
                  <div className="text-base font-semibold text-[var(--shell-ink)]">{destination.label}</div>
                  <div className="mt-1 text-xs text-[var(--shell-muted)]">{destination.hint}</div>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </V7PublicShell>
    );
  }

  return (
    <AppShell>
    <div className="flex flex-1 items-center justify-center bg-[var(--shell-bg)] px-6 py-16 text-[var(--shell-ink)]">
      <div className="w-full max-w-xl">
        <PatLogoLockup mode="hero" tone="light" />
        <p className="mt-10 text-sm font-medium uppercase tracking-[0.14em] text-[var(--shell-muted)]">
          Page not found
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight">
          We couldn&apos;t find that page.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
          The link may be out of date or the page may have moved. Pick up from one of these
          instead:
        </p>
        <nav className="mt-8 grid gap-3 sm:grid-cols-2">
          {destinations.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              className="pat-card pat-card-interactive block p-5"
            >
              <div className="text-base font-semibold text-[var(--shell-ink)]">{destination.label}</div>
              <div className="mt-1 text-xs text-[var(--shell-muted)]">{destination.hint}</div>
            </Link>
          ))}
        </nav>
      </div>
    </div>
    </AppShell>
  );
}
