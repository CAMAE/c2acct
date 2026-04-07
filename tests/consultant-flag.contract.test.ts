import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/routes", () => ({
  buildCanonicalSignInPath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    consultantProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma-compat", () => ({
  matchesPrismaMissingSchemaTarget: vi.fn(),
  warnPrismaCompatibilityOnce: vi.fn(),
}));

import { CONSULTANT_ACCESS_FLAG_ENV, isConsultantAccessEnabled } from "@/lib/consultantAccess";

describe("consultant access flag contract", () => {
  it("stays off by default until consultant proof is explicitly enabled", () => {
    vi.unstubAllEnvs();
    expect(isConsultantAccessEnabled()).toBe(false);
  });

  it("turns on only when the explicit consultant flag is set to 1", () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "1");
    expect(isConsultantAccessEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });
});
