import fs from "node:fs";
import path from "node:path";
import type { LearningAssessment, LearningModuleContent, LearningQuestion } from "@/lib/userLearning/types";

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, "content", "user-learning");
const READING_ROOT = path.join(CONTENT_ROOT, "reading-material");

const MODULE_FILES = [
  ["governance-and-claim-boundaries", "quiz-1", "module-1-governance-and-claim-boundaries.md"],
  ["fields-state-boards-and-configuration", "quiz-2", "module-2-fields-state-boards-and-configuration.md"],
  ["assurance-of-learning-and-institutional-design", "quiz-3", "module-3-assurance-of-learning-and-institutional-design.md"],
  ["firm-vendor-controls-and-operational-risk", "quiz-4", "module-4-firm-vendor-controls-and-operational-risk.md"],
  ["delivery-evidence-and-automation-operations", "quiz-5", "module-5-delivery-evidence-and-automation-operations.md"],
] as const;

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function getSection(markdown: string, heading: string) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
  return match ? match[1].trim() : "";
}

function parseBulletLines(block: string) {
  return block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function parseReadingModule(moduleKey: string, quizKey: string, filename: string): LearningModuleContent {
  const markdown = read(path.join("content", "user-learning", "reading-material", filename));
  const title = markdown.match(/^# (.+)$/m)?.[1]?.trim() ?? filename;
  const position = getSection(markdown, "Position");
  const fieldOfStudy = getSection(markdown, "Field of Study Focus");
  const purpose = getSection(markdown, "Module Purpose");
  const objectives = parseBulletLines(getSection(markdown, "Learning Objectives"));
  const assessmentStructure = parseBulletLines(getSection(markdown, "Assessment Structure"));
  const sourceList = parseBulletLines(getSection(markdown, "Source List")).map((line) => {
    const [sourceCode, rest] = line.split(": ");
    const [sourceTitle, sourceUrl] = rest.split(" | ");
    return { sourceCode, sourceTitle, sourceUrl };
  });

  const topicMatches = [...markdown.matchAll(/### (.+)\n- Principle: ([^\n]+)\n- Operational implication: ([^\n]+)\n- Required evidence artifact: ([^\n]+)\n- Primary failure risk: ([^\n]+)\n- Why it matters: ([^\n]+)\n- Source: ([^|]+) \| ([^|]+) \| ([^\n]+)/g)];
  const topics = topicMatches.map((match) => ({
    title: match[1].trim(),
    principle: match[2].trim(),
    operationalImplication: match[3].trim(),
    evidenceArtifact: match[4].trim(),
    failureRisk: match[5].trim(),
    whyItMatters: match[6].trim(),
    sourceCode: match[7].trim(),
    sourceTitle: match[8].trim(),
    sourceUrl: match[9].trim(),
  }));

  return {
    moduleKey,
    quizKey,
    title,
    fieldOfStudy,
    purpose,
    position,
    objectives,
    topics,
    assessmentStructure,
    sourceList,
    readingFile: filename,
    questions: [],
  };
}

function parseQuestionKind(prompt: string) {
  if (prompt.startsWith("True or False:")) return "TRUE_FALSE" as const;
  if (prompt.includes("A) ")) return "MULTIPLE_CHOICE" as const;
  return "SHORT_ANSWER" as const;
}

function parseOptions(prompt: string) {
  if (!prompt.includes("A) ")) return [];
  const start = prompt.indexOf("A) ");
  const tail = prompt.slice(start);
  return [...tail.matchAll(/([A-D])\)\s(.+?)(?=\s[A-D]\)\s|$)/g)].map((match) => `${match[1]}) ${match[2].trim()}`);
}

function parseQuestionList(relativePath: string) {
  const markdown = read(relativePath);
  const title = markdown.match(/^# (.+)$/m)?.[1]?.trim() ?? relativePath;
  const items = [...markdown.matchAll(/^\d+\.\s+\[([QF]\d+)\]\s+([\s\S]*?)\n\s+- Module: ([^\n]+)\n\s+- Field of study: ([^\n]+)\n\s+- Source code: ([^\n]+)\n\s+- Source title: ([^\n]+)/gm)].map((match) => ({
    id: match[1].trim(),
    prompt: match[2].trim(),
    moduleTitle: match[3].trim(),
    fieldOfStudy: match[4].trim(),
    sourceCode: match[5].trim(),
    sourceTitle: match[6].trim(),
  }));
  return { title, items };
}

function parseAnswerMap(relativePath: string) {
  const markdown = read(relativePath);
  return new Map(
    [...markdown.matchAll(/^- ([QF]\d+): ([\s\S]*?)\n  Rationale: ([^\n]+)/gm)].map((match) => [
      match[1].trim(),
      { answer: match[2].trim(), rationale: match[3].trim() },
    ])
  );
}

function parseSourceMap(relativePath: string) {
  const markdown = read(relativePath);
  return new Map(
    [...markdown.matchAll(/^- ([QF]\d+): ([^|]+)\| ([^|]+)\| ([^|]+)\| Origin: ([^\n]+)/gm)].map((match) => [
      match[1].trim(),
      {
        sourceCode: match[2].trim(),
        sourceTitle: match[3].trim(),
        sourceUrl: match[4].trim(),
        origin: match[5].trim(),
      },
    ])
  );
}

function attachQuestionMetadata(
  relativePath: string,
  answerKeyPath: string,
  sourceMapPath: string
): LearningAssessment {
  const parsed = parseQuestionList(relativePath);
  const answerMap = parseAnswerMap(answerKeyPath);
  const sourceMap = parseSourceMap(sourceMapPath);
  const questions: LearningQuestion[] = parsed.items.map((item) => {
    const answer = answerMap.get(item.id);
    const source = sourceMap.get(item.id);
    if (!answer || !source) {
      throw new Error(`Missing answer or source metadata for ${item.id}`);
    }

    return {
      id: item.id,
      prompt: item.prompt,
      moduleTitle: item.moduleTitle,
      fieldOfStudy: item.fieldOfStudy,
      sourceCode: source.sourceCode,
      sourceTitle: source.sourceTitle,
      sourceUrl: source.sourceUrl,
      answer: answer.answer,
      rationale: answer.rationale,
      origin: source.origin,
      kind: parseQuestionKind(item.prompt),
      options: parseOptions(item.prompt),
    };
  });

  return {
    key: path.basename(relativePath, ".md"),
    title: parsed.title,
    kind: relativePath.includes("final-test") ? "FINAL" : "QUIZ",
    questions,
  };
}

export function getLearningModules(): LearningModuleContent[] {
  const quizAnswerKey = "content/user-learning/question-bank/question-bank-answer-key.md";
  const quizSourceMap = "content/user-learning/question-bank/question-bank-source-map.md";
  const questionBank = attachQuestionMetadata("content/user-learning/question-bank/question-bank.md", quizAnswerKey, quizSourceMap);

  return MODULE_FILES.map(([moduleKey, quizKey, filename]) => {
    const learningModule = parseReadingModule(moduleKey, quizKey, filename);
    learningModule.questions = questionBank.questions.filter((question) => question.moduleTitle === learningModule.title);
    return learningModule;
  });
}

export function getLearningModule(moduleKey: string) {
  return getLearningModules().find((learningModule) => learningModule.moduleKey === moduleKey) ?? null;
}

export function getQuizByKey(quizKey: string) {
  const modules = getLearningModules();
  const learningModule = modules.find((entry) => entry.quizKey === quizKey);
  if (!learningModule) return null;
  const quiz = attachQuestionMetadata(
    path.join("content", "user-learning", "quizzes", `${quizKey}.md`),
    "content/user-learning/question-bank/question-bank-answer-key.md",
    "content/user-learning/question-bank/question-bank-source-map.md"
  );
  return {
    ...quiz,
    key: quizKey,
    moduleKey: learningModule.moduleKey,
    moduleTitle: learningModule.title,
  };
}

export function getFinalTest() {
  return attachQuestionMetadata(
    "content/user-learning/final-test.md",
    "content/user-learning/final-test-answer-key.md",
    "content/user-learning/final-test-source-map.md"
  );
}

export function getLearningSupportDocs() {
  return {
    coverageMatrix: read("content/user-learning/COVERAGE_MATRIX.md"),
    gradingModel: read("content/user-learning/grading-and-completion-model.md"),
    unlockDesign: read("content/user-learning/unlock-design.md"),
    progressionMap: read("content/user-learning/module-progression-map.md"),
  };
}

export function getLearningContentRoot() {
  return {
    contentRoot: CONTENT_ROOT,
    readingRoot: READING_ROOT,
  };
}
