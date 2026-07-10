import { headers } from "next/headers";
import { consumeDurableRateLimit } from "@/lib/security/rateLimit";

/**
 * Auth-endpoint rate limiting (2026-07-09 governance audit B6). Sign-in and
 * password-change server actions had no throttle — brute-force/credential-spray
 * was unbounded. This keys on (IP + identifier) so it blunts both account-targeted
 * and spray attacks, reusing the existing durable Prisma limiter.
 *
 * Default: 10 attempts per 5 minutes. Returns `true` when the caller may proceed.
 */
export async function checkAuthRateLimit(
  scope: string,
  identifier: string,
  opts?: { limit?: number; windowMs?: number }
): Promise<boolean> {
  let ip = "unknown";
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    // headers() unavailable outside a request scope — fall back to identifier-only.
  }
  const result = await consumeDurableRateLimit({
    scope,
    key: `${ip}:${identifier}`.slice(0, 256),
    limit: opts?.limit ?? 10,
    windowMs: opts?.windowMs ?? 5 * 60 * 1000,
  });
  return result.allowed;
}
