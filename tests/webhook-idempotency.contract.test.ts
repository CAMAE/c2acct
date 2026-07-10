import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { persistStripeWebhookEvent } from "@/lib/billing/reconcile";

/**
 * Webhook idempotency contract (2026-07-09 governance audit B4). Locks that the
 * same Stripe event id is never processed twice, including the concurrent-
 * delivery race where findUnique + create is not atomic.
 */
function eventFixture() {
  return { id: "evt_123", type: "invoice.paid", api_version: "2024-06-20", livemode: false, data: { object: {} } } as never;
}

function mockClient(overrides: {
  findUnique?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
}) {
  return {
    billingWebhookEvent: {
      findUnique: overrides.findUnique ?? vi.fn().mockResolvedValue(null),
      create: overrides.create ?? vi.fn(),
    },
  } as never;
}

describe("persistStripeWebhookEvent idempotency", () => {
  it("a brand-new event is created and marked shouldProcess", async () => {
    const create = vi.fn().mockResolvedValue({ id: "row1", processedAt: null });
    const result = await persistStripeWebhookEvent({ event: eventFixture(), client: mockClient({ create }) });
    expect(result.shouldProcess).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(create).toHaveBeenCalledOnce();
  });

  it("an already-processed event is a duplicate and NOT reprocessed", async () => {
    const create = vi.fn();
    const result = await persistStripeWebhookEvent({
      event: eventFixture(),
      client: mockClient({ findUnique: vi.fn().mockResolvedValue({ id: "row1", processedAt: new Date() }), create }),
    });
    expect(result.shouldProcess).toBe(false);
    expect(result.duplicate).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("the concurrent-delivery loser (P2002 on create) defers — never double-processes", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    });
    // First findUnique: null (both racers see nothing). create throws P2002 (lost
    // the race). Re-fetch returns the winner's row.
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "winner-row", processedAt: null });
    const create = vi.fn().mockRejectedValue(p2002);
    const result = await persistStripeWebhookEvent({ event: eventFixture(), client: mockClient({ findUnique, create }) });
    expect(result.shouldProcess).toBe(false);
    expect(result.duplicate).toBe(true);
    expect(result.record).toEqual({ id: "winner-row", processedAt: null });
  });
});
