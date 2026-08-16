import "./globals.css";
import { cookies } from "next/headers";
import { barlowFontClassName } from "@/app/fonts/barlow";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/lib/locale";

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

  // Block 21a STEP 2b — the shell (AppHeader + main + footer) moved into the
  // (app)/(public) group layouts. The root keeps only <html><body.pat-shell> so the
  // (public) group can swap AppShell ↔ V7PublicShell behind PAT_ENABLE_NEW_FRONT_DOOR
  // while the (app) group always renders AppShell. body keeps flex/min-h-screen/flex-col
  // so AppShell's sticky (mt-auto) footer still anchors to the viewport bottom.
  return (
    <html lang={locale}>
      <body
        className={`${barlowFontClassName} pat-shell flex min-h-screen flex-col bg-[var(--shell-bg)] text-[var(--shell-ink)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
