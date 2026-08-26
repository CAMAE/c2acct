import { headers } from "next/headers";
import { REQUEST_ID_HEADER, readRequestId } from "@/lib/observability/requestId";

/**
 * Read the current request's correlation id from a server component, server
 * action, or route handler.
 *
 * Separate from lib/observability/requestId.ts on purpose: that module is pure
 * and edge-safe so proxy.ts and the agent supervisor can both import it. This
 * one pulls in next/headers, which only resolves inside a request scope — it
 * must never be imported by the supervisor or by a plain Node script.
 *
 * Returns null outside a request rather than throwing, so a shared helper that
 * logs from both a request and a background job does not need two code paths.
 */
export async function getServerRequestId(): Promise<string | null> {
  try {
    const store = await headers();
    return readRequestId(store) ?? store.get(REQUEST_ID_HEADER) ?? null;
  } catch {
    // Called outside a request scope (background job, build-time render).
    return null;
  }
}
