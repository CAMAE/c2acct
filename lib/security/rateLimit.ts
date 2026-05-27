import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export type DurableRateLimitInput = {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: Date;
  client?: Pick<typeof prisma, "rateLimitBucket">;
};

export type DurableRateLimitResult = {
  allowed: boolean;
  scope: string;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

function hashRateLimitKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function secondsUntil(resetAt: Date, now: Date) {
  return Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

export async function consumeDurableRateLimit(input: DurableRateLimitInput): Promise<DurableRateLimitResult> {
  const now = input.now ?? new Date();
  const resetAt = new Date(now.getTime() + input.windowMs);
  const client = input.client ?? prisma;
  const keyHash = hashRateLimitKey(input.key);

  await client.rateLimitBucket.deleteMany({
    where: {
      scope: input.scope,
      resetAt: { lte: now },
    },
  });

  const current = await client.rateLimitBucket.findUnique({
    where: {
      scope_keyHash: {
        scope: input.scope,
        keyHash,
      },
    },
  });

  if (!current || current.resetAt <= now) {
    await client.rateLimitBucket.upsert({
      where: {
        scope_keyHash: {
          scope: input.scope,
          keyHash,
        },
      },
      update: {
        count: 1,
        resetAt,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        scope: input.scope,
        keyHash,
        count: 1,
        resetAt,
        updatedAt: now,
      },
    });

    return {
      allowed: true,
      scope: input.scope,
      remaining: Math.max(0, input.limit - 1),
      resetAt,
      retryAfterSeconds: secondsUntil(resetAt, now),
    };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      scope: input.scope,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: secondsUntil(current.resetAt, now),
    };
  }

  const updated = await client.rateLimitBucket.update({
    where: {
      scope_keyHash: {
        scope: input.scope,
        keyHash,
      },
    },
    data: {
      count: { increment: 1 },
      updatedAt: now,
    },
    select: {
      count: true,
      resetAt: true,
    },
  });

  return {
    allowed: true,
    scope: input.scope,
    remaining: Math.max(0, input.limit - updated.count),
    resetAt: updated.resetAt,
    retryAfterSeconds: secondsUntil(updated.resetAt, now),
  };
}

export function rateLimitJsonResponse(result: DurableRateLimitResult) {
  return NextResponse.json(
    { ok: false, error: "Too many requests", scope: result.scope },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(result.retryAfterSeconds),
      },
    }
  );
}
