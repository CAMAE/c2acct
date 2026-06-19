import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Security-boundary unit test for lib/patAssistant/retrieveHelp.ts. Mocks the
 * prisma boundary (no DB) and inspects the composed SQL to prove:
 *
 *   1. EVERY retrieval is restricted to kind = 'help_doc' — the customer-facing
 *      corpus — so the internal repo_doc/audit_log/dream_state chunks are
 *      unreachable, in every mode.
 *   2. Strict (vendor/firm) callers get the roleAccess predicate.
 *   3. unrestricted (consultant/admin) callers drop roleAccess BUT still never
 *      leave help_doc.
 */

// Hoisted so the mock fn exists when vi.mock's hoisted factory references it
// (a bare top-level const would hit its temporal dead zone at load time).
const { queryRaw } = vi.hoisted(() => ({
  queryRaw: vi.fn(async () => [] as unknown[]),
}));

vi.mock("@/lib/prisma", () => ({
  default: { $queryRaw: queryRaw },
}));

import { retrieveHelp } from "@/lib/patAssistant/retrieveHelp";

function composedSql(callIndex = 0): string {
  const arg = (queryRaw.mock.calls[callIndex] as unknown[] | undefined)?.[0] as
    | { strings?: string[]; sql?: string; text?: string }
    | undefined;
  if (arg?.strings && Array.isArray(arg.strings)) return arg.strings.join(" ");
  return String(arg?.sql ?? arg?.text ?? "");
}

describe("retrieveHelp — corpus + role scoping is enforced in SQL", () => {
  beforeEach(() => {
    queryRaw.mockClear();
  });

  it("always restricts to kind = 'help_doc' (strict audience)", async () => {
    await retrieveHelp("where do I review an assessment", "vendor", 5);
    const sql = composedSql();
    expect(sql).toContain("help_doc");
    // never touches the internal corpus kinds
    expect(sql).not.toContain("audit_log");
    expect(sql).not.toContain("dream_state");
  });

  it("applies the roleAccess predicate for a strict (vendor/firm) caller", async () => {
    await retrieveHelp("how do I", "firm", 5);
    expect(composedSql()).toContain("roleAccess");
  });

  it("drops roleAccess for an unrestricted caller but stays in help_doc", async () => {
    await retrieveHelp("anything", "consultant", 5, { unrestricted: true });
    const sql = composedSql();
    expect(sql).toContain("help_doc");
    expect(sql).not.toContain("roleAccess");
  });

  it("returns nothing (no query) when the question or audience is empty", async () => {
    expect(await retrieveHelp("", "vendor")).toEqual([]);
    expect(await retrieveHelp("hi", "")).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
