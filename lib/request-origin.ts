import { headers } from "next/headers";

export async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) return `${proto}://${host}`;

  const authUrl = process.env.AUTH_URL;
  if (authUrl && authUrl.trim()) return authUrl.trim().replace(/\/+$/, "");

  return "http://localhost:3000";
}
