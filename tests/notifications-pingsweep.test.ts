import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * runPingSweep gate + pipeline wiring. The flag gate is the load-bearing safety
 * property: with PAT_ENABLE_PINGS off the sweep must be a hard no-op — no gather,
 * no plan, no writes. Deps are mocked at the module boundary (no DB).
 */

vi.mock("@/lib/notifications/gather", () => ({ gatherPingTargets: vi.fn() }));
vi.mock("@/lib/notifications/planPings", () => ({ planPings: vi.fn() }));
vi.mock("@/lib/notifications/executePlan", () => ({ executePingPlan: vi.fn() }));

import { runPingSweep } from "@/lib/notifications/runSweep";
import { gatherPingTargets } from "@/lib/notifications/gather";
import { planPings } from "@/lib/notifications/planPings";
import { executePingPlan } from "@/lib/notifications/executePlan";
import { PAT_PINGS_FLAG_ENV } from "@/lib/patAssistant/flags";

const gather = vi.mocked(gatherPingTargets);
const plan = vi.mocked(planPings);
const execute = vi.mocked(executePingPlan);

const savedFlag = process.env[PAT_PINGS_FLAG_ENV];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  process.env[PAT_PINGS_FLAG_ENV] = savedFlag;
});

describe("runPingSweep — flag gate", () => {
  it("is a hard no-op when PAT_ENABLE_PINGS is off", async () => {
    delete process.env[PAT_PINGS_FLAG_ENV];
    const res = await runPingSweep();
    expect(res).toEqual({
      enabled: false,
      evaluated: 0,
      fired: 0,
      escalated: 0,
      created: 0,
      suppressed: 0,
      total: 0,
    });
    expect(gather).not.toHaveBeenCalled();
    expect(plan).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("runPingSweep — enabled pipeline", () => {
  it("gathers, plans, and executes, merging the counts", async () => {
    process.env[PAT_PINGS_FLAG_ENV] = "1";
    const targets = [{ companyId: "firm1" }] as unknown as Awaited<ReturnType<typeof gatherPingTargets>>;
    gather.mockResolvedValue(targets);
    plan.mockReturnValue({ notifications: [], evaluated: 2, fired: 1, escalated: 1 });
    execute.mockResolvedValue({ created: 3, suppressed: 1, total: 4 });

    const res = await runPingSweep(1_000);

    expect(gather).toHaveBeenCalledWith(1_000);
    expect(plan).toHaveBeenCalledWith(targets, 1_000);
    expect(execute).toHaveBeenCalledWith({ notifications: [], evaluated: 2, fired: 1, escalated: 1 }, { actorUserId: null });
    expect(res).toEqual({
      enabled: true,
      evaluated: 2,
      fired: 1,
      escalated: 1,
      created: 3,
      suppressed: 1,
      total: 4,
    });
  });
});
