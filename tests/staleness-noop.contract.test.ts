import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * runStalenessSweep flag gate (GAP-1, Block 20). Symmetric to
 * `notifications-pingsweep.test.ts` — the load-bearing safety property is that with
 * PAT_ENABLE_STALENESS_ALERTS off the sweep is a hard no-op: it returns
 * NOOP_SUMMARY and writes zero rows. The persist sink (createNotification) is
 * mocked so we can assert it is never reached. `isStalenessAlertsEnabled` requires
 * BOTH PINGS and STALENESS, so deleting the STALENESS switch alone forces the gate
 * shut regardless of PINGS.
 */

vi.mock("@/lib/notifications/store", () => ({ createNotification: vi.fn() }));

import { runStalenessSweep } from "@/lib/notifications/staleness/runStalenessSweep";
import { createNotification } from "@/lib/notifications/store";
import { PAT_STALENESS_ALERTS_FLAG_ENV } from "@/lib/patAssistant/flags";

const create = vi.mocked(createNotification);
const savedFlag = process.env[PAT_STALENESS_ALERTS_FLAG_ENV];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (savedFlag === undefined) delete process.env[PAT_STALENESS_ALERTS_FLAG_ENV];
  else process.env[PAT_STALENESS_ALERTS_FLAG_ENV] = savedFlag;
});

describe("runStalenessSweep — flag gate", () => {
  it("is a hard no-op when PAT_ENABLE_STALENESS_ALERTS is off", async () => {
    delete process.env[PAT_STALENESS_ALERTS_FLAG_ENV];
    const res = await runStalenessSweep();
    expect(res).toEqual({
      enabled: false,
      companiesScanned: 0,
      evaluated: 0,
      fired: 0,
      dispatched: 0,
      created: 0,
    });
    expect(create).not.toHaveBeenCalled();
  });
});
