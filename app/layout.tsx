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
            <Link href="/" className="text-sm tracking-[0.25em] text-white/90">
              AAE
            </Link>
            <nav className="flex items-center gap-6 text-sm text-white/70">
              <Link className="hover:text-white" href="/profiles">Profiles</Link>
              <Link className="hover:text-white" href="/outputs">Top Seven Outputs</Link>
              <Link className="hover:text-white" href="/survey">Alignment Survey</Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-16">{children}</main>

        <footer className="border-t border-white/10 py-10">
          <div className="mx-auto max-w-6xl px-6 text-xs text-white/50">
            Â© {new Date().getFullYear()} AAE â€” Autonomous Alignment Infrastructure
          </div>
        </footer>
      </body>
    </html>
  );
}

