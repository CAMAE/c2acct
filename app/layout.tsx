import "./globals.css";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { resolvePortalExperience } from "@/lib/portalVisibility";

export const metadata = {
  title: "C2Acct | PAT Performance Alignment Technology",
  description:
    "C2Acct corporate surface for PAT, the Performance Alignment Technology workspace.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  const experience = await resolvePortalExperience(sessionUser);

  return (
    <html lang="en">
      <body className="pat-shell min-h-screen bg-[var(--shell-bg)] text-[var(--shell-ink)] antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[8%] top-[-10%] h-[540px] w-[780px] rounded-full bg-[radial-gradient(circle_at_center,rgba(209,160,90,0.16),transparent_62%)] blur-3xl" />
          <div className="absolute right-[-10%] top-[14%] h-[540px] w-[540px] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,77,98,0.16),transparent_65%)] blur-3xl" />
          <div className="absolute bottom-[-15%] left-[18%] h-[500px] w-[780px] rounded-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.08),transparent_65%)] blur-3xl" />
        </div>

        <header className="sticky top-0 z-50 border-b border-[var(--shell-border)] bg-[rgba(249,246,239,0.82)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="group">
                <div className="pat-label text-[var(--shell-muted)]">C2Acct</div>
                <div className="font-semibold tracking-tight text-[var(--shell-ink)] group-hover:text-[var(--shell-teal)]">
                  Parent identity for PAT
                </div>
              </Link>
              <span className="rounded-full border border-[var(--shell-border)] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                Performance Alignment Technology
              </span>
            </div>
            <nav className="pat-sans flex items-center gap-4 text-sm text-[var(--shell-muted)]">
              <Link className="hover:text-[var(--shell-ink)]" href="/">
                Home
              </Link>
              <Link className="hover:text-[var(--shell-ink)]" href="/platform">
                Workspace
              </Link>
              <Link className="hover:text-[var(--shell-ink)]" href="/survey">
                Survey
              </Link>
              <Link className="hover:text-[var(--shell-ink)]" href="/results">
                Results
              </Link>
              <Link className="hover:text-[var(--shell-ink)]" href="/outputs">
                Outputs
              </Link>
            </nav>
            <div className="hidden items-center gap-3 md:flex">
              <div className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 px-4 py-2 text-right shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <div className="pat-label">
                  PAT Perspective
                </div>
                <div className="pat-sans text-sm font-semibold text-[var(--shell-ink)]">
                  {experience.audienceLabel}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-16">{children}</main>

        <footer className="border-t border-[var(--shell-border)] py-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-[var(--shell-muted)]">
            <div className="pat-sans">
              C2Acct is the corporate identity. PAT is the institutional platform surface.
            </div>
            <div className="pat-sans">
              Copyright {new Date().getFullYear()} C2Acct / PAT
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
