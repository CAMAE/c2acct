import Link from "next/link";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";

/**
 * B8-4: branded light-theme 404, replacing Next's dark default. PAT header
 * lockup + plain-language copy + links back to sign-in and each portal home.
 */
export default function NotFound() {
  const destinations: { href: string; label: string; hint: string }[] = [
    { href: "/sign-in", label: "Sign in", hint: "Return to the sign-in page" },
    { href: "/firm", label: "Firm portal", hint: "Your firm workspace" },
    { href: "/vendor", label: "Vendor portal", hint: "Your vendor workspace" },
    { href: "/consultants", label: "Consultant portal", hint: "Ecosystems and briefs" },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--shell-bg)] px-6 py-16 text-[var(--shell-ink)]">
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
    </main>
  );
}
