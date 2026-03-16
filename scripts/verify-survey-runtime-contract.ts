import fs from "node:fs";
import path from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function main() {
  const prismaSchema = read("prisma/schema.prisma");
  const surveyPage = read("app/survey/[key]/page.tsx");
  const surveyModuleRoute = read("app/api/survey/module/[key]/route.ts");
  const surveySubmitRoute = read("app/api/survey/submit/route.ts");
  const runtimeContract = read("lib/surveyRuntimeContract.ts");

  if (!prismaSchema.includes("enum QuestionInputType")) {
    fail("QuestionInputType enum missing from Prisma schema");
  }
  if (!runtimeContract.includes('SUPPORTED_SURVEY_RUNTIME_INPUT_TYPES = ["SLIDER"]')) {
    fail("Runtime survey contract must explicitly narrow supported input types");
  }
  if (!surveyModuleRoute.includes("Module uses unsupported runtime question types")) {
    fail("Survey module route must reject unsupported runtime question types");
  }
  if (!surveySubmitRoute.includes("Module uses unsupported runtime question types")) {
    fail("Survey submit route must reject unsupported runtime question types");
  }
  if (!surveyPage.includes('inputType: "SLIDER"')) {
    fail("Survey page must reflect the narrowed runtime question contract");
  }
  if (surveyPage.includes('q.inputType === "TEXT"') || surveyPage.includes("Unsupported input type")) {
    fail("Survey page still contains stale unsupported input rendering branches");
  }

  console.log(JSON.stringify({ ok: true, supportedRuntimeInputs: ["SLIDER"] }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(
    "VERIFY_SURVEY_RUNTIME_CONTRACT_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
