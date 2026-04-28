import { describe, expect, it } from "vitest";
import { SESSION_USER_FIELD_NAMES } from "@/lib/auth/sessionFields";
import { ELEVATED_ACTION, ELEVATED_CONFIRMATION_FIELD, hasElevatedConfirmation } from "@/lib/security/elevatedAction";
import { consumeDurableRateLimit } from "@/lib/security/rateLimit";

type BucketRecord = {
  id: string;
  scope: string;
  keyHash: string;
  count: number;
  resetAt: Date;
  updatedAt: Date;
};

function createRateLimitClient() {
  const buckets = new Map<string, BucketRecord>();
  const bucketKey = (scope: string, keyHash: string) => `${scope}:${keyHash}`;

  return {
    rateLimitBucket: {
      async deleteMany({ where }: { where: { scope: string; resetAt: { lte: Date } } }) {
        for (const [key, bucket] of buckets.entries()) {
          if (bucket.scope === where.scope && bucket.resetAt <= where.resetAt.lte) {
            buckets.delete(key);
          }
        }
      },
      async findUnique({ where }: { where: { scope_keyHash: { scope: string; keyHash: string } } }) {
        return buckets.get(bucketKey(where.scope_keyHash.scope, where.scope_keyHash.keyHash)) ?? null;
      },
      async upsert({
        where,
        update,
        create,
      }: {
        where: { scope_keyHash: { scope: string; keyHash: string } };
        update: { count: number; resetAt: Date; updatedAt: Date };
        create: BucketRecord;
      }) {
        const key = bucketKey(where.scope_keyHash.scope, where.scope_keyHash.keyHash);
        const existing = buckets.get(key);
        const next = existing ? { ...existing, ...update } : create;
        buckets.set(key, next);
        return next;
      },
      async update({
        where,
        data,
      }: {
        where: { scope_keyHash: { scope: string; keyHash: string } };
        data: { count: { increment: number }; updatedAt: Date };
        select: { count: true; resetAt: true };
      }) {
        const key = bucketKey(where.scope_keyHash.scope, where.scope_keyHash.keyHash);
        const existing = buckets.get(key);
        if (!existing) throw new Error("missing bucket");
        const next = {
          ...existing,
          count: existing.count + data.count.increment,
          updatedAt: data.updatedAt,
        };
        buckets.set(key, next);
        return {
          count: next.count,
          resetAt: next.resetAt,
        };
      },
    },
  };
}

describe("auth and sensitive-action boundaries", () => {
  it("keeps session payload fields intentionally minimal", () => {
    expect(SESSION_USER_FIELD_NAMES).toEqual(["id", "email", "role", "companyId"]);
  });

  it("requires explicit elevated confirmation for billing-sensitive form posts", () => {
    const formData = new FormData();
    expect(hasElevatedConfirmation(formData, ELEVATED_ACTION.MEMBERSHIP_CHECKOUT)).toBe(false);

    formData.set(ELEVATED_CONFIRMATION_FIELD, ELEVATED_ACTION.MEMBERSHIP_CHECKOUT);
    expect(hasElevatedConfirmation(formData, ELEVATED_ACTION.MEMBERSHIP_CHECKOUT)).toBe(true);
    expect(hasElevatedConfirmation(formData, ELEVATED_ACTION.BILLING_PORTAL)).toBe(false);
  });

  it("persists quota state in a durable rate-limit bucket model", async () => {
    const client = createRateLimitClient();
    const now = new Date("2026-04-28T00:00:00.000Z");

    const first = await consumeDurableRateLimit({
      scope: "billing.portal",
      key: "user-1:127.0.0.1",
      limit: 2,
      windowMs: 60_000,
      now,
      client: client as never,
    });
    const second = await consumeDurableRateLimit({
      scope: "billing.portal",
      key: "user-1:127.0.0.1",
      limit: 2,
      windowMs: 60_000,
      now,
      client: client as never,
    });
    const blocked = await consumeDurableRateLimit({
      scope: "billing.portal",
      key: "user-1:127.0.0.1",
      limit: 2,
      windowMs: 60_000,
      now,
      client: client as never,
    });
    const reset = await consumeDurableRateLimit({
      scope: "billing.portal",
      key: "user-1:127.0.0.1",
      limit: 2,
      windowMs: 60_000,
      now: new Date("2026-04-28T00:01:01.000Z"),
      client: client as never,
    });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(1);
  });
});
