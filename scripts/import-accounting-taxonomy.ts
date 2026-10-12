import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  importAccountingTaxonomy,
  loadAccountingTaxonomyArtifact,
} from "../lib/research/accountingTaxonomy";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const artifactArg = args.find((arg) => arg.startsWith("--artifact="));
  const artifactPath = artifactArg
    ? artifactArg.slice("--artifact=".length)
    : path.join(process.cwd(), "data/research/accounting-software-taxonomy-v1.json");

  // legal-load (R64, 1g): --vertical=<id> names the vertical outright; otherwise the
  // artifact's own verticalId; otherwise the column default (accounting).
  const verticalArg = args.find((arg) => arg.startsWith("--vertical="));
  const verticalId = verticalArg ? verticalArg.slice("--vertical=".length) : null;

  const artifact = await loadAccountingTaxonomyArtifact(artifactPath);
  const summary = await importAccountingTaxonomy({
    prisma,
    artifact,
    apply,
    verticalId,
  });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error("IMPORT_ACCOUNTING_TAXONOMY_ERROR", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
