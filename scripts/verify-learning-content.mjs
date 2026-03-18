import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function mustExist(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fullPath;
}

function parseQuestionIds(markdown, prefixPattern) {
  return [...markdown.matchAll(new RegExp(`^\\d+\\.\\s+\\[(${prefixPattern}\\d+)\\]`, "gm"))].map((m) => m[1]);
}

function parseAnswerIds(markdown, prefixPattern) {
  return [...markdown.matchAll(new RegExp(`^-\\s+(${prefixPattern}\\d+):`, "gm"))].map((m) => m[1]);
}

function parseSourceIds(markdown, prefixPattern) {
  return [...markdown.matchAll(new RegExp(`^-\\s+(${prefixPattern}\\d+):\\s+SRC\\d+\\s+\\|\\s+.+\\|\\s+https?:\\/\\/\\S+`, "gm"))].map((m) => m[1]);
}

const questionBankPath = "content/user-learning/question-bank/question-bank.md";
const questionBankAnswerPath = "content/user-learning/question-bank/question-bank-answer-key.md";
const questionBankSourcePath = "content/user-learning/question-bank/question-bank-source-map.md";
const finalTestPath = "content/user-learning/final-test.md";
const finalTestAnswerPath = "content/user-learning/final-test-answer-key.md";
const finalTestSourcePath = "content/user-learning/final-test-source-map.md";
const docs = [
  "content/user-learning/fields-of-study-mapping.md",
  "content/user-learning/grading-and-completion-model.md",
  "content/user-learning/unlock-design.md",
  "content/user-learning/module-progression-map.md",
  "content/user-learning/CONTENT_SUBSTANCE_AUDIT.md",
  "content/user-learning/COVERAGE_MATRIX.md",
];

[
  questionBankPath,
  questionBankAnswerPath,
  questionBankSourcePath,
  finalTestPath,
  finalTestAnswerPath,
  finalTestSourcePath,
  ...docs,
].forEach(mustExist);

const questionBank = read(questionBankPath);
const questionBankAnswer = read(questionBankAnswerPath);
const questionBankSource = read(questionBankSourcePath);
const finalTest = read(finalTestPath);
const finalTestAnswer = read(finalTestAnswerPath);
const finalTestSource = read(finalTestSourcePath);

const quizDir = path.join(root, "content/user-learning/quizzes");
const quizFiles = fs.readdirSync(quizDir).filter((file) => /^quiz-\d+\.md$/.test(file)).sort();
const readingFiles = [
  "module-1-governance-and-claim-boundaries.md",
  "module-2-fields-state-boards-and-configuration.md",
  "module-3-assurance-of-learning-and-institutional-design.md",
  "module-4-firm-vendor-controls-and-operational-risk.md",
  "module-5-delivery-evidence-and-automation-operations.md",
];

const questionBankIds = parseQuestionIds(questionBank, "Q");
const questionBankAnswerIds = parseAnswerIds(questionBankAnswer, "Q");
const questionBankSourceIds = parseSourceIds(questionBankSource, "Q");
const finalIds = parseQuestionIds(finalTest, "F");
const finalAnswerIds = parseAnswerIds(finalTestAnswer, "F");
const finalSourceIds = parseSourceIds(finalTestSource, "F");

if (questionBankIds.length < 125) {
  throw new Error(`Expected at least 125 source-backed question-bank items, got ${questionBankIds.length}`);
}

if (quizFiles.length !== 5) {
  throw new Error(`Expected exactly 5 quiz files, got ${quizFiles.length}`);
}

if (finalIds.length < 75) {
  throw new Error(`Expected at least 75 final-test items, got ${finalIds.length}`);
}

if (new Set(questionBankIds).size !== questionBankIds.length) {
  throw new Error("Question-bank IDs are not unique");
}

if (new Set(finalIds).size !== finalIds.length) {
  throw new Error("Final-test IDs are not unique");
}

if (questionBankAnswerIds.join("|") !== questionBankIds.join("|")) {
  throw new Error("Question-bank answer key coverage is incomplete or out of order");
}

if (questionBankSourceIds.join("|") !== questionBankIds.join("|")) {
  throw new Error("Question-bank source-map coverage is incomplete or out of order");
}

if (finalAnswerIds.join("|") !== finalIds.join("|")) {
  throw new Error("Final-test answer key coverage is incomplete or out of order");
}

if (finalSourceIds.join("|") !== finalIds.join("|")) {
  throw new Error("Final-test source-map coverage is incomplete or out of order");
}

if ((questionBank.match(/Which option best reflects the governing source for this module area\?/g) ?? []).length > 0) {
  throw new Error("Question bank still contains the previous weak templated prompt pattern");
}

if ((questionBank.match(/Rationale:\s.{0,35}$/gm) ?? []).length > 0 || (finalTestAnswer.match(/Rationale:\s.{0,35}$/gm) ?? []).length > 0) {
  throw new Error("One or more rationale lines are too thin");
}

const quizCounts = quizFiles.map((file) => parseQuestionIds(read(path.join("content/user-learning/quizzes", file)), "Q").length);
if (quizCounts.some((count) => count < 10)) {
  throw new Error(`Each quiz must contain at least 10 questions: ${quizCounts.join(", ")}`);
}

for (const file of readingFiles) {
  mustExist(path.join("content/user-learning/reading-material", file));
  const text = read(path.join("content/user-learning/reading-material", file));
  if (!text.includes("## Learning Objectives") || !text.includes("## Key Topics") || !text.includes("## Source List")) {
    throw new Error(`Reading module is missing required sections: ${file}`);
  }
  if ((text.match(/https?:\/\//g) ?? []).length < 3) {
    throw new Error(`Reading module has too few source citations: ${file}`);
  }
}

for (const doc of docs) {
  const text = read(doc);
  if (text.trim().length < 250) {
    throw new Error(`Learning support doc is too thin: ${doc}`);
  }
}

const result = {
  ok: true,
  questionBankCount: questionBankIds.length,
  quizCount: quizFiles.length,
  quizCounts,
  finalTestCount: finalIds.length,
  readingModuleCount: readingFiles.length,
  docsVerified: docs.length,
};

console.log(JSON.stringify(result, null, 2));
