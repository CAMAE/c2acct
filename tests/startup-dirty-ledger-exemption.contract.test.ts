import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  SESSION_LEDGER_PATH,
  classifyStartupDirty,
  getStartupDirtyVerdict,
  parseGitStatusPorcelain,
} from "@/lib/release/git-state";

/**
 * The mac-mini startup gate's one exact-path exemption.
 *
 * A working tree dirty SOLELY by PATALIGN-MEMORY/SESSION-LEDGER.md starts;
 * anything else — including ledger + one other file — does not.
 *
 * The reason the exemption exists at all: the launch gate stops unbuilt code
 * from starting, while the session ledger is an out-of-band record that appends
 * on its own cadence. It has appended DURING a fifteen-minute validate:launch
 * and failed the final step on a tree whose every other gate had passed.
 * Banking right before a run shrinks that window; it cannot close it.
 *
 * The reason it is exactly one path: the moment real work is in the tree, the
 * gate's original purpose applies again, and the ledger's presence must not
 * launder it.
 */

const LEDGER = SESSION_LEDGER_PATH;
const porcelain = (...lines: string[]) => parseGitStatusPorcelain(lines.join("\n"));

describe("classifyStartupDirty", () => {
  it("is clean when nothing is dirty", () => {
    expect(classifyStartupDirty([])).toBe("clean");
  });

  it("is ledger-only when the ledger is the sole entry", () => {
    expect(classifyStartupDirty(porcelain(` M ${LEDGER}`))).toBe("ledger-only");
  });

  it("is ledger-only for a staged ledger too", () => {
    // Banked-but-not-yet-committed is the same situation.
    expect(classifyStartupDirty(porcelain(`M  ${LEDGER}`))).toBe("ledger-only");
  });

  it("is DIRTY for the ledger plus one code file", () => {
    // THE case the exemption must not swallow.
    expect(classifyStartupDirty(porcelain(` M ${LEDGER}`, " M lib/patAssistant/ladder.ts"))).toBe(
      "dirty"
    );
  });

  it("is dirty for the ledger plus an untracked file", () => {
    expect(classifyStartupDirty(porcelain(` M ${LEDGER}`, "?? scripts/new-thing.mjs"))).toBe(
      "dirty"
    );
  });

  it("is dirty for any other single file", () => {
    expect(classifyStartupDirty(porcelain(" M package.json"))).toBe("dirty");
  });

  it("is dirty for a lookalike path", () => {
    // Exact path, not a prefix or a directory: nothing else that later lives
    // beside the ledger inherits its exemption.
    for (const lookalike of [
      "PATALIGN-MEMORY/SESSION-LEDGER.md.bak",
      "PATALIGN-MEMORY/OTHER.md",
      "PATALIGN-MEMORY/nested/SESSION-LEDGER.md",
      "SESSION-LEDGER.md",
    ]) {
      expect(classifyStartupDirty(porcelain(` M ${lookalike}`))).toBe("dirty");
    }
  });

  it("is dirty for a RENAME involving the ledger", () => {
    // A rename is a structural change to the record rather than an append, and
    // is exactly where "it's only the ledger" stops being true.
    expect(classifyStartupDirty(porcelain(`R  old/path.md -> ${LEDGER}`))).toBe("dirty");
  });
});

/**
 * The pure classifier is only half the guarantee — the other half is that the
 * shell gate actually reads this verdict off a real repository. These cases run
 * against throwaway git trees.
 */
describe("getStartupDirtyVerdict, against real git trees", () => {
  const roots: string[] = [];

  function makeRepo(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pat-startup-dirty-"));
    roots.push(root);
    const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
    git("init", "-q");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    fs.mkdirSync(path.join(root, path.dirname(LEDGER)), { recursive: true });
    fs.writeFileSync(path.join(root, LEDGER), "# ledger\n");
    fs.writeFileSync(path.join(root, "code.ts"), "export const a = 1;\n");
    git("add", "-A");
    git("commit", "-q", "-m", "seed");
    return root;
  }

  afterAll(() => {
    for (const root of roots) {
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    }
  });

  it("reports clean on a committed tree", () => {
    expect(getStartupDirtyVerdict(makeRepo())).toBe("clean");
  });

  it("reports ledger-only when ONLY the ledger has appended", () => {
    const root = makeRepo();
    fs.appendFileSync(path.join(root, LEDGER), "## banked\n");
    expect(getStartupDirtyVerdict(root)).toBe("ledger-only");
  });

  it("reports dirty for the ledger plus one code file", () => {
    const root = makeRepo();
    fs.appendFileSync(path.join(root, LEDGER), "## banked\n");
    fs.appendFileSync(path.join(root, "code.ts"), "export const b = 2;\n");
    expect(getStartupDirtyVerdict(root)).toBe("dirty");
  });

  it("reports dirty for a code file alone", () => {
    const root = makeRepo();
    fs.appendFileSync(path.join(root, "code.ts"), "export const b = 2;\n");
    expect(getStartupDirtyVerdict(root)).toBe("dirty");
  });
});

describe("the exemption is scoped to restart-app.sh alone", () => {
  const ROOT = process.cwd();
  const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

  it("is used by restart-app.sh", () => {
    expect(read("scripts/mac-mini/restart-app.sh")).toMatch(
      /mac_mini_assert_clean_root_allowing_ledger/
    );
  });

  it("is NOT used by the other startup scripts", () => {
    // app-start, launchd-install, rollback-release and validate-runtime-contract
    // keep the strict check. The ruling exempted one script, and a shared helper
    // is one edit away from silently exempting all five.
    for (const file of [
      "scripts/mac-mini/app-start.sh",
      "scripts/mac-mini/launchd-install.sh",
      "scripts/mac-mini/rollback-release.sh",
      "scripts/mac-mini/validate-runtime-contract.sh",
    ]) {
      const source = read(file);
      expect({ file, lenient: /mac_mini_assert_clean_root_allowing_ledger/.test(source) }).toEqual({
        file,
        lenient: false,
      });
      expect(source).toMatch(/mac_mini_assert_clean_root\b/);
    }
  });

  it("keeps the release fingerprint's dirty check strict", () => {
    // getReleaseGitState feeds lib/release/fingerprint.ts and the canonical
    // state written into release proof. The exemption must never reach it, or a
    // release would assert a clean tree it was not built from.
    const gitState = read("lib/release/git-state.ts");
    const fingerprintUsesStartupVerdict = /getStartupDirtyVerdict/.test(
      read("lib/release/fingerprint.ts")
    );
    expect(fingerprintUsesStartupVerdict).toBe(false);
    // And the startup verdict is derived from dirtyEntries rather than replacing
    // the gitDirty field itself.
    expect(gitState).toMatch(/classifyStartupDirty\(getReleaseGitState\(root\)\.dirtyEntries\)/);
  });
});
