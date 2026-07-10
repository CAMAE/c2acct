import assert from "node:assert/strict";
import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * Ask Pat citation smoke (Block 4). Proves the help corpus is retrievable and
 * cited — the same lexical FTS retrieval /api/pat feeds to the model. Asserts:
 *  1. the Secret-Firms question retrieves its article as a citation;
 *  2. global questions (methodology, sign out) retrieve grounded citations;
 *  3. roleAccess scoping holds — a firm audience does NOT get vendor-only help.
 *
 * Retrieval is the citation source (no LLM key needed); the model composes the
 * prose answer from these chunks. Run after `pnpm index:help`.
 */
async function main() {
  applyRepoEnv();
  const { retrieveHelp } = await import("@/lib/patAssistant/retrieveHelp");

  // 1. The required question → its article is retrieved and would be cited.
  const secret = await retrieveHelp("How do I unlock Secret Firms on the Sales Card?", "vendor", 5);
  assert.ok(secret.length > 0, "Secret-Firms question must retrieve at least one help chunk (a citation).");
  assert.equal(
    secret[0].sourcePath,
    "help/vendor/sales-card-secret-firms.md",
    `Top citation should be the Secret-Firms article, got ${secret[0].sourcePath}`
  );
  assert.ok(/elite/i.test(secret[0].text), "Secret-Firms answer text must mention the Elite upgrade path.");

  // 2. Global questions retrieve grounded citations.
  const methodology = await retrieveHelp("How does Patalign compute its scores?", "firm", 5);
  assert.ok(
    methodology.some((c) => c.sourcePath.includes("methodology")),
    "Methodology question must cite the methodology help article."
  );
  const signout = await retrieveHelp("How do I sign out?", "firm", 5);
  assert.ok(
    signout.some((c) => c.sourcePath.includes("sign-out")),
    "Sign-out question must cite the sign-out help article."
  );

  // 3. roleAccess wall: a FIRM audience never retrieves the vendor-only Secret-Firms doc.
  const firmSecret = await retrieveHelp("How do I unlock Secret Firms on the Sales Card?", "firm", 5);
  assert.ok(
    !firmSecret.some((c) => c.sourcePath === "help/vendor/sales-card-secret-firms.md"),
    "A firm audience must NOT retrieve the vendor-only Secret-Firms article (roleAccess wall)."
  );

  console.log(
    `PASS smoke-ask-pat: Secret-Firms cited (${secret[0].sourcePath}), methodology + sign-out cited, roleAccess wall holds.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
