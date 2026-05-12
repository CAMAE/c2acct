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

  const artifact = await loadAccountingTaxonomyArtifact(artifactPath);
  const summary = await importAccountingTaxonomy({
    prisma,
    artifact,
    apply,
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
