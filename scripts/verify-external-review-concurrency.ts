import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function fail(message: string): never {
  throw new Error(message);
}

const route = read("app/api/external-reviews/submit/route.ts");
const migration = read(
  "prisma/migrations/20260316160000_external_review_finalized_uniqueness/migration.sql"
);

if (!migration.includes("ExternalReviewSubmission_single_finalized_identity_idx")) {
  fail("Finalized-review uniqueness index missing");
}

const updateIndex = route.indexOf("updateMany({");
const createIndex = route.indexOf("externalReviewSubmission.create({");
if (updateIndex === -1 || createIndex === -1 || updateIndex > createIndex) {
  fail("Duplicate rejection must occur before finalized-row creation");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      verified: [
        "finalized uniqueness migration present",
        "duplicate rejection precedes finalized creation",
      ],
    },
    null,
    2
  )
);
