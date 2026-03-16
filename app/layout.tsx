import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "AAE",
  description: "Autonomous Alignment Infrastructure for Accounting Firms.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070A10] text-white antialiased">
        {/* top glow */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),transparent_60%)] blur-2xl" />
          <div className="absolute bottom-[-220px] right-[-260px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_60%)] blur-2xl" />
        </div>

        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070A10]/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              title="Return to the AAE home screen and view the current demo destinations. This link does not change any engine state or session data."
              className="text-sm tracking-[0.25em] text-white/90"
            >
              AAE
            </Link>
            <nav className="flex flex-wrap items-center gap-5 text-sm text-white/70">
              <Link
                className="hover:text-white"
                href="/profiles"
                title="Open the Profiles page and view the staged firm profile surface. This page is still a placeholder and does not change the current demo path."
              >
                Profiles
              </Link>
              <Link
                className="hover:text-white"
                href="/survey"
                title="Open the Assessment entry experience and choose the current company or product path. This is the main starting point for the protected demo flow."
              >
                Assessment
              </Link>
              <Link
                className="hover:text-white"
                href="/results"
                title="Open the Results page and review the latest submission snapshot for the current session context. This page summarizes the current state without changing any stored data."
              >
                Results
              </Link>
              <Link
                className="hover:text-white"
                href="/outputs"
                title="Open the Insights page and review unlocked intelligence for the current context. This is the primary destination after results in the current demo flow."
              >
                Insights
              </Link>
              <Link
                className="hover:text-white"
                href="/admin"
                title="Open the Admin page and inspect the currently built administrative surface. This route is useful for internal review, not for the main customer demo path."
              >
                Admin
              </Link>
              <Link
                className="hover:text-white"
                href="/login"
                title="Open the Login page and start an authenticated session. This route returns you to the protected flow after sign-in when a callback is present."
              >
                Login
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-16">{children}</main>

        <footer className="border-t border-white/10 py-10">
          <div className="mx-auto max-w-6xl px-6 text-xs text-white/50">
            &copy; {new Date().getFullYear()} AAE | Autonomous Alignment Infrastructure
          </div>
        </footer>
      </body>
    </html>
  );
}

