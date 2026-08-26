import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_VERTICAL_ID as AGENT_DEFAULT_VERTICAL_ID } from "@/lib/agents/vertical-pack";
import {
  DEFAULT_VERTICAL_ID,
  FROZEN_VERTICAL_IDS,
  resolveCurrentVertical,
  resolveCurrentVerticalWithSource,
} from "@/lib/verticals/context";
import { VERTICAL_PACKS_FLAG_ENV, type VerticalEnv } from "@/lib/verticals/flag";
import { loadVerticalPack } from "@/lib/verticals/loader";

/**
 * W1 contract (VERTICAL-READINESS-AUDIT-2026-08 §3.2, §3.3, §5.4).
 *
 * Three obligations:
 *   1. the resolution order is explicit → tenant → env → constant;
 *   2. the flag-off short-circuit sits in FRONT of that order, not inside it;
 *   3. a pack id referenced by stored rows is frozen.
 */

const ROOT = process.cwd();
const FLAG_ON: VerticalEnv = { [VERTICAL_PACKS_FLAG_ENV]: "1" };

const tenant = (verticalId: string | null) => ({ company: { verticalId } });

describe("resolveCurrentVertical — resolution order (flag on)", () => {
  it("prefers an explicit argument over every other source", () => {
    const resolved = resolveCurrentVerticalWithSource({
      verticalId: "explicit-vertical",
      session: tenant("tenant-vertical"),
      env: { ...FLAG_ON, PAT_DEFAULT_VERTICAL: "env-vertical" },
    });
    expect(resolved).toEqual({ verticalId: "explicit-vertical", source: "explicit" });
  });

  it("falls to Company.verticalId when no explicit argument is given", () => {
    const resolved = resolveCurrentVerticalWithSource({
      session: tenant("tenant-vertical"),
      env: { ...FLAG_ON, PAT_DEFAULT_VERTICAL: "env-vertical" },
    });
    expect(resolved).toEqual({ verticalId: "tenant-vertical", source: "tenant" });
  });

  it("falls to PAT_DEFAULT_VERTICAL when there is no tenant vertical", () => {
    const resolved = resolveCurrentVerticalWithSource({
      session: tenant(null),
      env: { ...FLAG_ON, PAT_DEFAULT_VERTICAL: "env-vertical" },
    });
    expect(resolved).toEqual({ verticalId: "env-vertical", source: "env" });
  });

  it("falls to the accounting constant when nothing else answers", () => {
    const resolved = resolveCurrentVerticalWithSource({ env: { ...FLAG_ON } });
    expect(resolved).toEqual({ verticalId: DEFAULT_VERTICAL_ID, source: "constant" });
  });

  it("treats blank and whitespace-only values as absent at every step", () => {
    // A blank column or an empty env var is a missing value, not a vertical
    // named "". Without this, `PAT_DEFAULT_VERTICAL=` would resolve a pack id
    // of "" and blow up at load time instead of falling through.
    expect(
      resolveCurrentVerticalWithSource({
        verticalId: "   ",
        session: tenant("  "),
        env: { ...FLAG_ON, PAT_DEFAULT_VERTICAL: "" },
      })
    ).toEqual({ verticalId: DEFAULT_VERTICAL_ID, source: "constant" });
  });

  it("trims a value it does accept", () => {
    expect(resolveCurrentVertical({ verticalId: "  legal  ", env: { ...FLAG_ON } })).toBe("legal");
  });

  it("handles a null session without reaching for a company", () => {
    expect(
      resolveCurrentVerticalWithSource({ session: null, env: { ...FLAG_ON, PAT_DEFAULT_VERTICAL: "env-vertical" } })
    ).toEqual({ verticalId: "env-vertical", source: "env" });
  });
});

describe("resolveCurrentVertical — flag-off short-circuit", () => {
  it("returns the constant, and says so, ignoring every input", () => {
    // The distinction that matters: source is "flag-off", not "constant". The
    // order was never consulted, so no pack was loaded and no tenant column,
    // env var, or explicit argument could have steered it.
    const resolved = resolveCurrentVerticalWithSource({
      verticalId: "explicit-vertical",
      session: tenant("tenant-vertical"),
      env: { PAT_DEFAULT_VERTICAL: "env-vertical" },
    });
    expect(resolved).toEqual({ verticalId: DEFAULT_VERTICAL_ID, source: "flag-off" });
  });

  it("treats any flag value other than exactly \"1\" as off", () => {
    for (const value of ["0", "", "true", "yes", "TRUE", " 1"]) {
      expect(
        resolveCurrentVerticalWithSource({
          verticalId: "explicit-vertical",
          env: { [VERTICAL_PACKS_FLAG_ENV]: value },
        }).source
      ).toBe("flag-off");
    }
  });

  it("defaults to off when the flag is absent from the environment", () => {
    expect(resolveCurrentVerticalWithSource({ verticalId: "legal", env: {} }).source).toBe("flag-off");
  });
});

describe("resolveCurrentVertical — reads process.env when no env is injected", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const name of [VERTICAL_PACKS_FLAG_ENV, "PAT_DEFAULT_VERTICAL"]) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("short-circuits on the ambient environment too", () => {
    process.env.PAT_DEFAULT_VERTICAL = "legal";
    expect(resolveCurrentVerticalWithSource({ verticalId: "healthcare" })).toEqual({
      verticalId: DEFAULT_VERTICAL_ID,
      source: "flag-off",
    });
  });

  it("consults the ambient environment once the flag is on", () => {
    process.env[VERTICAL_PACKS_FLAG_ENV] = "1";
    process.env.PAT_DEFAULT_VERTICAL = "legal";
    expect(resolveCurrentVerticalWithSource({})).toEqual({ verticalId: "legal", source: "env" });
  });
});

/**
 * Audit §5.4: stored `verticalId` values are all `"accounting"` today, written
 * by column default before any vertical existed. Renaming the pack would leave
 * every one of those rows pointing at a pack that no longer exists — and
 * nothing would fail loudly, because the column would still hold a valid-looking
 * string. A rename is a data migration; these assertions make a config-only
 * rename impossible to land quietly.
 */
describe("pack ids referenced by stored rows are frozen", () => {
  it("freezes \"accounting\" as the default vertical id", () => {
    expect(DEFAULT_VERTICAL_ID).toBe("accounting");
    expect(FROZEN_VERTICAL_IDS).toContain("accounting");
    expect(Object.isFrozen(FROZEN_VERTICAL_IDS)).toBe(true);
  });

  it("keeps the write-side agent seam on the same id as the read-side resolver", () => {
    // lib/agents/vertical-pack.ts WRITES the column; lib/verticals/context.ts
    // resolves it. If these two ever disagree, rows are stamped with one id and
    // looked up under another.
    expect(AGENT_DEFAULT_VERTICAL_ID).toBe(DEFAULT_VERTICAL_ID);
  });

  it("resolves every frozen id to an installed pack whose manifest id matches", async () => {
    for (const id of FROZEN_VERTICAL_IDS) {
      const pack = await loadVerticalPack(id);
      expect(pack.id).toBe(id);
      expect(pack.taxonomy.filter?.verticalId).toBe(id);
    }
  });

  it("keeps every verticalized model defaulting to the frozen id", () => {
    // Twenty-two models carry `verticalId String @default("accounting")`: the
    // fourteen from the original add_vertical_id_layer migration (audit §1.1),
    // the seven added by PF-2 W5 — ModuleItem, ModuleUnlockRule, ModuleSitting,
    // ItemResponse, SurveySubmission, CompanyBenchmark and
    // CompanyBenchmarkCohort — and PatDeclineLog from the corpus program. A pack
    // rename without a backfill orphans all of them, and this count is what
    // makes a new verticalized model join the freeze rule deliberately rather
    // than by being forgotten. (PatDeclineLog is exactly that: the count caught
    // it the moment the model was added.)
    const schema = readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
    const defaults = schema.match(/verticalId\s+String\s+@default\("([^"]+)"\)/g) ?? [];
    expect(defaults).toHaveLength(22);
    for (const line of defaults) {
      expect(line).toContain(`@default("${DEFAULT_VERTICAL_ID}")`);
    }
  });

  it("keeps the accounting pack directory named for its id", () => {
    // loadVerticalPack() reads verticals/<id>/pack.yaml, so renaming the
    // directory is the same breakage as renaming the id.
    const manifest = readFileSync(
      path.join(ROOT, "verticals", DEFAULT_VERTICAL_ID, "pack.yaml"),
      "utf8"
    );
    expect(manifest).toMatch(new RegExp(`^id:\\s*${DEFAULT_VERTICAL_ID}\\s*$`, "m"));
  });
});
