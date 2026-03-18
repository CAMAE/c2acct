import fs from "node:fs";
import path from "node:path";

type CheckResult = {
  name: string;
  ok: boolean;
  notes?: string;
};

const root = process.cwd();

function exists(relativePath: string) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function countQuestions(markdown: string) {
  return markdown
    .split("\n")
    .filter((line) => /^\d+\.\s/.test(line.trim())).length;
}

function checkFile(relativePath: string, pattern?: RegExp): CheckResult {
  if (!exists(relativePath)) {
    return { name: relativePath, ok: false, notes: "missing" };
  }
  if (!pattern) {
    return { name: relativePath, ok: true };
  }
  const content = read(relativePath);
  return {
    name: relativePath,
    ok: pattern.test(content),
    notes: pattern.test(content) ? undefined : "expected marker not found",
  };
}

function main() {
  const checks: CheckResult[] = [];

  [
    "audit/REALITY_CHECK_AUDIT.md",
    "audit/CLAIM_VERIFICATION_MATRIX.md",
    "audit/FILE_SUBSTANCE_MATRIX.md",
    "audit/OPEN_BLOCKERS_AND_THIN_AREAS.md",
    "FINAL_EXECUTION_REPORT.md",
    "FINAL_VERIFICATION_REPORT.md",
    "FINAL_DEFERRED_ITEMS.md",
    "FINAL_RESEARCH_INDEX.md",
    "scripts/mac-mini/setup-mac-mini.sh",
    "scripts/mac-mini/run-nightly-verification.sh",
    "scripts/export/generate-audit-bundle.sh",
    "scripts/audit/generate-current-build-audit.sh",
    "ops/mac-mini/README.md",
  ].forEach((relativePath) => checks.push(checkFile(relativePath)));

  checks.push(
    checkFile("app/api/survey/submit/route.ts", /takeRateLimitDecision|recordAuditEvent/),
    checkFile(
      "app/api/external-reviews/submit/route.ts",
      /takeRateLimitDecision|recordAuditEvent/
    ),
    checkFile("app/admin/page.tsx", /Admin Operating Center|Platform-only command center|Recent Audit Events/),
    checkFile("app/layout.tsx", /"\s*\/admin"|"\s*\/badges"|"\s*\/briefs\/executive"/),
    checkFile("app/survey/[key]/page.tsx", /QUESTIONS_PER_PAGE = 5/),
    checkFile("app/reviews/[moduleKey]/page.tsx", /QUESTIONS_PER_PAGE = 5/),
    checkFile("prisma/schema.prisma", /model ApiRateLimitBucket|model AuditEvent/),
    checkFile(
      "prisma/migrations/20260316160000_external_review_finalized_uniqueness/migration.sql"
    ),
    checkFile("research/accounting-accreditation-cpe-sourcebook.md", /https?:\/\//),
    checkFile(
      "research/masterwater-ethical-translation-for-learning.md",
      /Source status|Boundary statement|Ethical translation/
    ),
    checkFile("content/user-learning/question-bank/question-bank.md", /Source code:/),
    checkFile(
      "content/user-learning/question-bank/question-bank-answer-key.md",
      /Rationale:/
    ),
    checkFile(
      "content/user-learning/question-bank/question-bank-source-map.md",
      /https?:\/\//
    ),
    checkFile("content/user-learning/final-test.md", /Source code:/)
  );

  const questionBankCount = countQuestions(
    read("content/user-learning/question-bank/question-bank.md")
  );
  const finalTestCount = countQuestions(read("content/user-learning/final-test.md"));
  const quizCounts = [1, 2, 3, 4, 5].map((n) =>
    countQuestions(read(`content/user-learning/quizzes/quiz-${n}.md`))
  );
  const readingModuleCount = fs.readdirSync(
    path.join(root, "content/user-learning/reading-material")
  ).length;

  checks.push({
    name: "learning-content-counts",
    ok:
      questionBankCount >= 125 &&
      finalTestCount >= 75 &&
      quizCounts.every((count) => count > 0) &&
      readingModuleCount >= 5,
    notes: `questionBank=${questionBankCount}, finalTest=${finalTestCount}, quizzes=${quizCounts.join(",")}, readingModules=${readingModuleCount}`,
  });

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    console.error(
      "VERIFY_AUDIT_CLOSURE_ERROR",
      JSON.stringify(
        {
          ok: false,
          failed,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        closure: "current-reality-audit",
        checks,
      },
      null,
      2
    )
  );
}

main();
