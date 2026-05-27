import { headers } from "next/headers";
import { getResolvedAuthEnv } from "@/lib/auth/env";

export async function getRequestOrigin() {
  const authUrl = getResolvedAuthEnv().values.baseUrl;
  if (authUrl && authUrl.trim()) {
    return authUrl.trim().replace(/\/+$/, "");
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}
