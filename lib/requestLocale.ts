import { cookies } from "next/headers";
import { APP_LOCALE_COOKIE, getLocaleMessages, resolveLocale } from "@/lib/locale";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
}

export async function getRequestLocaleMessages() {
  return getLocaleMessages(await getRequestLocale());
}
