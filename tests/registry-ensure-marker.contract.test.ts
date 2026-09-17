import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  ensureFirmAlignmentSystemAtSeedVersion,
  getFirmRegistrySeedVersion,
  describeFirmRegistryEnsurer,
  type FirmRegistryEnsureDeps,
} from "@/lib/firmPat";

const MODULES = [{ id: "m1", key: "firm_ops", title: "Ops" }];

function fakeDeps(marker: string | null): FirmRegistryEnsureDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    seedVersion: () => "firm-alignment-system@deployed00000001",
    readMarker: async (seedVersion) => {
      calls.push(`read:${seedVersion}`);
      return marker === seedVersion ? { ensuredAt: new Date("2026-09-16T00:00:00Z") } : null;
    },
    writeMarker: async (seedVersion, ensuredBy) => {
      calls.push(`write:${seedVersion}:${ensuredBy}`);
    },
    ensure: async () => {
      calls.push("ensure");
      return MODULES;
    },
    loadEnsured: async () => {
      calls.push("load");
      return MODULES;
    },
    ensuredBy: () => "test-host:abcdef12",
  };
}

describe("R49 registry ensure marker", () => {
  it("skips the ensure when the deployed seed version is already recorded", async () => {
    const deps = fakeDeps("firm-alignment-system@deployed00000001");
    const result = await ensureFirmAlignmentSystemAtSeedVersion({ deps });
    expect(result.ran).toBe(false);
    expect(result.modules).toEqual(MODULES);
    expect(deps.calls).toEqual(["read:firm-alignment-system@deployed00000001", "load"]);
  });

  it("runs the ensure and records the marker when no row exists", async () => {
    const deps = fakeDeps(null);
    const result = await ensureFirmAlignmentSystemAtSeedVersion({ deps });
    expect(result.ran).toBe(true);
    expect(deps.calls).toEqual([
      "read:firm-alignment-system@deployed00000001",
      "ensure",
      "write:firm-alignment-system@deployed00000001:test-host:abcdef12",
    ]);
  });

  it("runs the ensure when the recorded version differs from the deployed seed (seed changed)", async () => {
    const deps = fakeDeps("firm-alignment-system@previous0000000");
    const result = await ensureFirmAlignmentSystemAtSeedVersion({ deps });
    expect(result.ran).toBe(true);
    expect(deps.calls).toContain("ensure");
    expect(deps.calls.at(-1)).toBe("write:firm-alignment-system@deployed00000001:test-host:abcdef12");
  });

  it("force runs the ensure even when the version is recorded (deploy-night re-ensure)", async () => {
    const deps = fakeDeps("firm-alignment-system@deployed00000001");
    const result = await ensureFirmAlignmentSystemAtSeedVersion({ deps, force: true });
    expect(result.ran).toBe(true);
    expect(deps.calls).toEqual(["ensure", "write:firm-alignment-system@deployed00000001:test-host:abcdef12"]);
  });

  it("a failed ensure records nothing", async () => {
    const deps = fakeDeps(null);
    deps.ensure = async () => {
      deps.calls.push("ensure");
      throw new Error("neon down");
    };
    await expect(ensureFirmAlignmentSystemAtSeedVersion({ deps })).rejects.toThrow("neon down");
    expect(deps.calls.some((c) => c.startsWith("write:"))).toBe(false);
  });

  it("the seed version is a stable hash of the seed definitions", () => {
    const version = getFirmRegistrySeedVersion();
    expect(version).toMatch(/^firm-alignment-system@[0-9a-f]{16}$/);
    expect(getFirmRegistrySeedVersion()).toBe(version);
  });

  it("the ensurer names the deployment and commit, never a secret", () => {
    expect(describeFirmRegistryEnsurer({ VERCEL_DEPLOYMENT_ID: "dpl_abc", PAT_COMMIT_SHA: "0123456789abcdef" })).toBe("dpl_abc:01234567");
    expect(describeFirmRegistryEnsurer({})).toMatch(/:local$/);
  });
});
