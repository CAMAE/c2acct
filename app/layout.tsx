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
  const primaryNav = [
    ["Firm", "/firm"],
    ["Vendor", "/vendor"],
    ["User", "/user"],
    ["Products", "/products"],
    ["Assessment", "/survey"],
    ["Reviews", "/reviews"],
    ["Insights", "/outputs"],
    ["Badges", "/badges"],
    ["Executive Brief", "/briefs/executive"],
  ] as const;

  const secondaryNav = [
    ["Firm insights", "/firm/insights"],
    ["Vendor insights", "/vendor/insights"],
    ["User insights", "/user/insights"],
    ["Firm modules", "/firm/modules"],
    ["Vendor modules", "/vendor/modules"],
    ["User modules", "/user/modules"],
    ["Learning", "/user/learning"],
    ["Profiles", "/profiles"],
    ["Admin", "/admin"],
    ["Login", "/login"],
  ] as const;

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070A10] text-white antialiased">
        {/* top glow */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),transparent_60%)] blur-2xl" />
          <div className="absolute bottom-[-220px] right-[-260px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_60%)] blur-2xl" />
        </div>

        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070A10]/70 backdrop-blur">
          <div className="mx-auto grid max-w-6xl gap-3 px-6 py-4">
            <div className="flex items-center justify-between gap-6">
            <Link
              href="/"
              title="Return to the AAE home screen and view the current demo destinations. This link does not change any engine state or session data."
              className="text-sm tracking-[0.25em] text-white/90"
            >
              AAE
            </Link>
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">Core surfaces</div>
            </div>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
              {primaryNav.map(([label, href]) => (
                <Link key={href} className="hover:text-white" href={href}>
                  {label}
                </Link>
              ))}
            </nav>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-white/45">
              {secondaryNav.map(([label, href]) => (
                <Link key={href} className="hover:text-white" href={href}>
                  {label}
                </Link>
              ))}
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

