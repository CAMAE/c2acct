import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function countQuestions(markdown: string) {
  return (markdown.match(/^\d+\.\s+\[[QF]\d+\]/gm) ?? []).length;
}

async function main() {
  const requiredFiles = [
    "app/user/learning/page.tsx",
    "app/user/learning/[moduleKey]/page.tsx",
    "app/user/quizzes/[quizKey]/page.tsx",
    "app/user/final-test/page.tsx",
    "app/firm/users/page.tsx",
    "app/firm/users/grading/page.tsx",
    "app/api/user-learning/progress/route.ts",
    "app/api/user-learning/grade/route.ts",
    "lib/userLearning/content.ts",
    "lib/userLearning/grading.ts",
    "lib/userLearning/progressStore.ts",
    "lib/userLearning/access.ts",
    "lib/userLearning/runtime.ts",
  ];

  for (const file of requiredFiles) {
    assert(fs.existsSync(path.join(process.cwd(), file)), `Missing required runtime file: ${file}`);
  }

  const learningPage = read("app/user/learning/page.tsx");
  const modulePage = read("app/user/learning/[moduleKey]/page.tsx");
  const quizPage = read("app/user/quizzes/[quizKey]/page.tsx");
  const finalPage = read("app/user/final-test/page.tsx");
  const firmUsersPage = read("app/firm/users/page.tsx");
  const firmGradingPage = read("app/firm/users/grading/page.tsx");
  const progressRoute = read("app/api/user-learning/progress/route.ts");
  const gradeRoute = read("app/api/user-learning/grade/route.ts");
  const contentHelper = read("lib/userLearning/content.ts");
  const accessHelper = read("lib/userLearning/access.ts");
  const runtimeHelper = read("lib/userLearning/runtime.ts");

  assert(
    learningPage.includes("getOwnLearningSnapshot") &&
      modulePage.includes("getLearningModule") &&
      quizPage.includes("getQuizByKey") &&
      finalPage.includes("getFinalTest"),
    "Runtime pages must render from repo-backed learning content helpers"
  );

  assert(
    progressRoute.includes("resolveLearningViewer") &&
      progressRoute.includes("authorizeLearningSubject") &&
      progressRoute.includes('scope === "company"') &&
      progressRoute.includes('currentCompany.type !== "FIRM"') &&
      progressRoute.includes("isTenantAdmin(sessionUser)"),
    "Progress route must enforce auth, self-vs-company scope, and firm-only oversight"
  );

  assert(
    gradeRoute.includes("resolveLearningViewer") &&
      gradeRoute.includes('currentCompany.type !== "FIRM"') &&
      gradeRoute.includes("submitLearningGrade"),
    "Grade route must enforce auth, firm scope, and centralized grading"
  );

  assert(
    firmUsersPage.includes("isTenantAdmin(sessionUser)") &&
      firmGradingPage.includes("isTenantAdmin(sessionUser)") &&
      runtimeHelper.includes("getCompanyLearningRoster"),
    "Firm oversight pages must require tenant admin authority and use centralized roster loading"
  );

  assert(
    accessHelper.includes("isPlatformOperator") &&
      accessHelper.includes("isAdminRole") &&
      accessHelper.includes("targetUserCompanyIds.includes") &&
      accessHelper.includes("currentCompanyType !== \"FIRM\""),
    "Learning access helper must preserve platform-operator override and firm-only admin oversight"
  );

  assert(
    runtimeHelper.includes("recordQuizAttempt") &&
      runtimeHelper.includes("recordFinalAttempt") &&
      runtimeHelper.includes("markReadingComplete"),
    "Learning runtime helper must centralize progress writes"
  );

  assert(
    progressRoute.includes('currentCompany.type !== "FIRM"') &&
      gradeRoute.includes('currentCompany.type !== "FIRM"'),
    "Learning routes must enforce firm-scoped runtime boundaries"
  );

  assert(
    runtimeHelper.includes("recordQuizAttempt") &&
      runtimeHelper.includes("recordQuizAttempt") &&
      runtimeHelper.includes("recordFinalAttempt"),
    "Learning runtime helper must centralize grading writes"
  );

  assert(
    contentHelper.includes("content/user-learning") &&
      contentHelper.includes("question-bank-answer-key.md") &&
      contentHelper.includes("final-test-source-map.md"),
    "Content helper must read canonical repo-backed content files"
  );

  const questionBank = read("content/user-learning/question-bank/question-bank.md");
  const finalTest = read("content/user-learning/final-test.md");
  const readingFiles = [
    "module-1-governance-and-claim-boundaries.md",
    "module-2-fields-state-boards-and-configuration.md",
    "module-3-assurance-of-learning-and-institutional-design.md",
    "module-4-firm-vendor-controls-and-operational-risk.md",
    "module-5-delivery-evidence-and-automation-operations.md",
  ];

  assert(countQuestions(questionBank) >= 125, "Question bank must retain at least 125 questions");
  assert(countQuestions(finalTest) >= 75, "Final test must retain at least 75 questions");
  for (const file of readingFiles) {
    const text = read(path.join("content/user-learning/reading-material", file));
    assert(
      text.includes("## Learning Objectives") && text.includes("## Key Topics") && text.includes("## Source List"),
      `Reading module missing required structure: ${file}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "learning routes and pages exist",
          "runtime pages read repo-backed learning content",
          "progress and grade endpoints are access-controlled at the source/helper level",
          "firm oversight stays current-company scoped",
          "platform-admin seam remains preserved",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("VERIFY_LEARNING_RUNTIME_ERROR", error instanceof Error ? error.message : error);
  process.exit(1);
});
