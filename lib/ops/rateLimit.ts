import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

type DbRateLimitInput = {
  bucketKey: string;
  limit: number;
  windowMs: number;
  onStorageError?: "block" | "allow";
};

type DbRateLimitResult = {
  allowed: boolean;
  requestCount: number;
  retryAfterSeconds: number;
  windowStart: Date;
  degraded?: boolean;
};

function normalizeBucketKey(value: string) {
  return value.trim().toLowerCase();
}

export function getRequestClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    const candidate = first?.trim();
    if (candidate) {
      return candidate;
    }
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

export async function consumeDbRateLimit(input: DbRateLimitInput): Promise<DbRateLimitResult> {
  const now = Date.now();
  const windowStartMs = Math.floor(now / input.windowMs) * input.windowMs;
  const windowStart = new Date(windowStartMs);
  const bucketKey = normalizeBucketKey(input.bucketKey);

  const retryAfterSeconds = Math.max(1, Math.ceil((windowStartMs + input.windowMs - now) / 1000));
  try {
    const row = await prisma.apiRateLimitBucket.upsert({
      where: {
        bucketKey_windowStart_windowMs: {
          bucketKey,
          windowStart,
          windowMs: input.windowMs,
        },
      },
      update: {
        requestCount: {
          increment: 1,
        },
        lastRequestAt: new Date(now),
      },
      create: {
        id: randomUUID(),
        bucketKey,
        windowStart,
        windowMs: input.windowMs,
        requestCount: 1,
        lastRequestAt: new Date(now),
      },
      select: {
        requestCount: true,
        windowStart: true,
      },
    });

    return {
      allowed: row.requestCount <= input.limit,
      requestCount: row.requestCount,
      retryAfterSeconds,
      windowStart: row.windowStart,
    };
  } catch (error) {
    console.error(
      "RATE_LIMIT_DEGRADED",
      JSON.stringify({
        bucketKey,
        windowMs: input.windowMs,
        error: error instanceof Error ? error.message : String(error),
      })
    );
    return {
      allowed: input.onStorageError === "allow",
      requestCount: 0,
      retryAfterSeconds,
      windowStart,
      degraded: true,
    };
  }
}
