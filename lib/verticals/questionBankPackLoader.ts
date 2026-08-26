import { promises as fs } from "node:fs";
import path from "node:path";
import { loadVerticalPack } from "./loader";
import {
  registerProductUtilityRegistry,
  validateProductUtilityRegistryPayload,
  type ProductUtilityRegistryBundle,
} from "./questionBankRegistry";

/**
 * SERVER-ONLY half of the pack-declared question bank (W3).
 *
 * Split out from `./questionBankRegistry.ts` deliberately. That module is
 * reachable from a client component — a product-assessment client imports
 * `lib/vendorPat.ts` → the bank builders → the registry — and a `node:fs` or
 * `node:path` import anywhere in a client graph fails the bundle outright, even
 * behind a dynamic `import()`, because webpack still has to resolve it.
 *
 * So the rule is the same one the client lexicon follows: loading happens
 * server-side at a request/job boundary, and only the resolved values travel.
 * Nothing here is ever reached on the flag-off path.
 */
export async function loadPackProductUtilityRegistry(
  verticalId: string
): Promise<ProductUtilityRegistryBundle> {
  const pack = await loadVerticalPack(verticalId);
  const declared = pack.questionBank.utilityRegistry;
  if (!declared) {
    throw new Error(
      `Vertical Pack "${verticalId}" declares no questionBank.utilityRegistry. ` +
        "A vertical with no product-utility bank cannot run a product assessment."
    );
  }

  const file = path.resolve(pack.dir, declared);

  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    throw new Error(
      `Vertical Pack "${verticalId}" declares questionBank.utilityRegistry "${declared}", ` +
        `but no file exists at ${file}.`
    );
  }

  return registerProductUtilityRegistry(validateProductUtilityRegistryPayload(verticalId, JSON.parse(raw)));
}
