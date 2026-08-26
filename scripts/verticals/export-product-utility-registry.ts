/**
 * Regenerate a Vertical Pack's product-utility registry file from the in-code
 * registry (W3).
 *
 *   node --import tsx scripts/verticals/export-product-utility-registry.ts
 *
 * Accounting's bank is IN-CODE TRUTH: `lib/productUtilityRegistry.ts` is what
 * ships, and `verticals/accounting/registry/product-utility-v3.json` is its
 * mirror, existing so the pack declares its own bank the way a second vertical
 * would. The two cannot be allowed to drift, so this script writes the mirror
 * and `tests/vertical-question-bank-registry.contract.test.ts` deep-equals it
 * back against the in-code registry.
 *
 * Same discipline as ACCOUNTING_LEXICON vs the pack's `lexicon:` block: one
 * authoring surface, one derived copy, one test holding them together.
 *
 * A NEW vertical does NOT use this script — it authors its own bank file by
 * hand (or from its own source) and points `questionBank.utilityRegistry` at it.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { ACCOUNTING_PRODUCT_UTILITY_REGISTRY } from "@/lib/verticals/questionBankRegistry";

const OUTPUT = path.resolve("verticals/accounting/registry/product-utility-v3.json");

async function main() {
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  // Two-space JSON with a trailing newline so a regeneration produces a clean
  // diff, not a one-line churn.
  await fs.writeFile(OUTPUT, `${JSON.stringify(ACCOUNTING_PRODUCT_UTILITY_REGISTRY, null, 2)}\n`, "utf8");

  const bundle = ACCOUNTING_PRODUCT_UTILITY_REGISTRY;
  const subcategories = bundle.utilities.reduce((sum, utility) => sum + utility.subcategories.length, 0);
  console.log(
    `[verticals] wrote ${path.relative(process.cwd(), OUTPUT)} — ` +
      `(${bundle.verticalId}, ${bundle.versionId}): ${bundle.utilities.length} utilities, ` +
      `${subcategories} subcategories, general ${bundle.generalModule.questions.length}, ` +
      `open-ended ${bundle.openEndedModule.questions.length}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
