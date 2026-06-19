import { afterEach, describe, expect, it } from "vitest";
import { INSUFFICIENT_CONTEXT, shouldEscalate } from "@/lib/patAssistant/model";
import {
  PAT_ASSISTANT_FLAG_ENV,
  PAT_PINGS_EMAIL_FLAG_ENV,
  PAT_PINGS_FLAG_ENV,
  isPatAssistantEnabled,
  isPingsEmailEnabled,
  isPingsEnabled,
} from "@/lib/patAssistant/flags";

describe("Pat chat cascade — shouldEscalate", () => {
  it("escalates on an empty fast reply", () => {
    expect(shouldEscalate("")).toBe(true);
    expect(shouldEscalate("   ")).toBe(true);
  });

  it("escalates when the fast model emits the insufficient-context sentinel", () => {
    expect(shouldEscalate(INSUFFICIENT_CONTEXT)).toBe(true);
    expect(shouldEscalate(`${INSUFFICIENT_CONTEXT}.`)).toBe(true);
    expect(shouldEscalate("insufficient_context")).toBe(true); // case-insensitive
  });

  it("does NOT escalate on a real answer (even if it mentions 'insufficient')", () => {
    expect(shouldEscalate("Go to Settings, then Billing to update your card.")).toBe(false);
    expect(shouldEscalate("Your profile is missing some insufficient detail fields.")).toBe(false);
  });
});

describe("Pat / ping feature flags — default OFF", () => {
  const saved = {
    assistant: process.env[PAT_ASSISTANT_FLAG_ENV],
    pings: process.env[PAT_PINGS_FLAG_ENV],
    email: process.env[PAT_PINGS_EMAIL_FLAG_ENV],
  };

  afterEach(() => {
    process.env[PAT_ASSISTANT_FLAG_ENV] = saved.assistant;
    process.env[PAT_PINGS_FLAG_ENV] = saved.pings;
    process.env[PAT_PINGS_EMAIL_FLAG_ENV] = saved.email;
  });

  it("is off when env is unset", () => {
    delete process.env[PAT_ASSISTANT_FLAG_ENV];
    delete process.env[PAT_PINGS_FLAG_ENV];
    delete process.env[PAT_PINGS_EMAIL_FLAG_ENV];
    expect(isPatAssistantEnabled()).toBe(false);
    expect(isPingsEnabled()).toBe(false);
    expect(isPingsEmailEnabled()).toBe(false);
  });

  it("enables the assistant only on exact '1'", () => {
    process.env[PAT_ASSISTANT_FLAG_ENV] = "true";
    expect(isPatAssistantEnabled()).toBe(false);
    process.env[PAT_ASSISTANT_FLAG_ENV] = "1";
    expect(isPatAssistantEnabled()).toBe(true);
  });

  it("requires BOTH pings and email flags for email to be enabled", () => {
    process.env[PAT_PINGS_FLAG_ENV] = "1";
    process.env[PAT_PINGS_EMAIL_FLAG_ENV] = "1";
    expect(isPingsEmailEnabled()).toBe(true);

    // email flag alone is not enough
    delete process.env[PAT_PINGS_FLAG_ENV];
    expect(isPingsEmailEnabled()).toBe(false);
  });
});
