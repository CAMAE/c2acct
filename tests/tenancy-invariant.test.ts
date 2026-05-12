import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Static guard for Invariant 1 from docs/tenancy.md:
 *
 *   Every exported function whose name ends in `…ForConsultant` MUST make
 *   its first prisma call to `consultantAssignment.findFirst` (or
 *   `findMany` for list routes), filtered by
 *   `{ consultantProfileId, active: true }`. No other prisma read or
 *   write may precede it.
 *
 * Strategy: replace the project's prisma client with a Proxy that records
 * `[model, method]` tuples in call order. Every `…ForConsultant` function
 * is invoked with a synthetic consultantProfileId. The first recorded
 * tuple's model + method are asserted. We never let the aggregator
 * succeed past the tenancy gate — the mock's tenancy result is a `null`
 * lookup so each function returns null and short-circuits.
 */

type CallTuple = [model: string, method: string];

const callLog: CallTuple[] = [];

function buildMockClient() {
  // Per-model "found nothing" defaults that let aggregators short-circuit
  // cleanly without throwing. findFirst/findUnique return null so the
  // tenancy gate fails closed; findMany returns []; everything else
  // returns a benign 0 / null / [].
  const handler: ProxyHandler<object> = {
    get(_, modelKey) {
      if (typeof modelKey === "symbol") return undefined;
      // The prisma client also has lifecycle methods ($disconnect, $connect,
      // $transaction, etc.). Ignore those — they're not models.
      if (typeof modelKey === "string" && modelKey.startsWith("$")) {
        return () => Promise.resolve(undefined);
      }
      return new Proxy(
        {},
        {
          get(_inner, methodKey) {
            if (typeof methodKey !== "string") return undefined;
            return (...args: unknown[]) => {
              void args;
              callLog.push([modelKey as string, methodKey]);
              if (methodKey === "findMany") return Promise.resolve([]);
              if (methodKey === "findFirst" || methodKey === "findUnique") {
                return Promise.resolve(null);
              }
              if (methodKey === "count") return Promise.resolve(0);
              return Promise.resolve(null);
            };
          },
        }
      );
    },
  };
  return new Proxy({}, handler);
}

vi.mock("@/lib/prisma", () => ({
  default: buildMockClient(),
}));

// Lazy-import after the mock is installed.
async function loadEcosystem() {
  return import("@/lib/ecosystem");
}
async function loadBriefs() {
  return import("@/lib/briefs");
}
async function loadFirmBriefs() {
  return import("@/lib/firmBriefs");
}

describe("Invariant 1: consultant tenancy lookup is the first prisma call", () => {
  beforeEach(() => {
    callLog.length = 0;
  });

  afterEach(() => {
    callLog.length = 0;
  });

  it("getEcosystemListForConsultant probes consultantAssignment.findMany first", async () => {
    const { getEcosystemListForConsultant } = await loadEcosystem();
    await getEcosystemListForConsultant("synthetic-consultant-1");
    expect(callLog.length).toBeGreaterThan(0);
    const [model, method] = callLog[0];
    expect(model).toBe("consultantAssignment");
    expect(["findMany", "findFirst"]).toContain(method);
  });

  it("getEcosystemDetailForConsultant probes consultantAssignment.findFirst first", async () => {
    const { getEcosystemDetailForConsultant } = await loadEcosystem();
    await getEcosystemDetailForConsultant("synthetic-consultant-2", "synthetic-ecosystem-x");
    expect(callLog.length).toBeGreaterThan(0);
    expect(callLog[0]).toEqual(["consultantAssignment", "findFirst"]);
  });

  it("getVendorBriefForConsultant probes consultantAssignment.findFirst first", async () => {
    const { getVendorBriefForConsultant } = await loadBriefs();
    await getVendorBriefForConsultant("synthetic-consultant-3", "synthetic-ecosystem-y");
    expect(callLog.length).toBeGreaterThan(0);
    expect(callLog[0]).toEqual(["consultantAssignment", "findFirst"]);
  });

  it("getFirmBriefForConsultant probes consultantAssignment.findFirst first", async () => {
    const { getFirmBriefForConsultant } = await loadFirmBriefs();
    await getFirmBriefForConsultant(
      "synthetic-consultant-4",
      "synthetic-ecosystem-z",
      "synthetic-firm-q"
    );
    expect(callLog.length).toBeGreaterThan(0);
    expect(callLog[0]).toEqual(["consultantAssignment", "findFirst"]);
  });
});
