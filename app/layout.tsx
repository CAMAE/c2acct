import "./globals.css";
import { cookies } from "next/headers";
import { barlowFontClassName } from "@/app/fonts/barlow";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/lib/locale";
import AppShell from "@/app/components/shell/AppShell";

export const metadata = {
  title: "Patalign",
  description: "C2Acct corporate surface for the PAT platform workspace.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  // Block 21a: the shell (AppHeader + main + footer) is factored into <AppShell>.
  // STEP 1 interim — the root still renders AppShell directly (byte-identical to the
  // prior layout). STEP 2 moves AppShell into the (app)/(public) group layouts and
  // reduces this to html/body + {children} so the (public) group can swap in
  // V7PublicShell behind PAT_ENABLE_NEW_FRONT_DOOR.
  return (
    <html lang={locale}>
      <body
        className={`${barlowFontClassName} pat-shell flex min-h-screen flex-col bg-[var(--shell-bg)] text-[var(--shell-ink)] antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
