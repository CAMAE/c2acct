import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * pattern box A (R60, change 9; audit section 5): the named guards exist as pnpm
 * scripts and every file they name is inside the plain `pnpm test:unit` include
 * (tests/**\/*.test.ts), so they run in every box without being invoked by name.
 */
const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };

describe("named guards run in every box", () => {
  for (const name of ["test:two-readers", "test:clock", "test:role-landing"]) {
    it(`${name} names existing test files that test:unit already includes`, () => {
      const script = pkg.scripts[name];
      expect(script, name).toMatch(/^vitest run /);
      const files = script.replace(/^vitest run /, "").split(/\s+/);
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        expect(existsSync(path.join(ROOT, file)), file).toBe(true);
        expect(file).toMatch(/^tests\/.+\.test\.ts$/); // the test:unit include glob
      }
    });
  }
  it("test:unit is the plain vitest run over tests/**", () => {
    expect(pkg.scripts["test:unit"]).toBe("vitest run");
    expect(readFileSync(path.join(ROOT, "vitest.config.ts"), "utf8")).toContain('include: ["tests/**/*.test.ts"]');
  });
});
