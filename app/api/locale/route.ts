import { NextResponse } from "next/server";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/lib/locale";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { locale?: string } | null;
  const locale = resolveLocale(body?.locale);

  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set(APP_LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
