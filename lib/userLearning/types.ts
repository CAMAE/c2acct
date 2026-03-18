export type LearningQuestion = {
  id: string;
  prompt: string;
  moduleTitle: string;
  fieldOfStudy: string;
  sourceCode: string;
  sourceTitle: string;
  sourceUrl: string;
  answer: string;
  rationale: string;
  origin: string;
  kind: "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  options: string[];
};

export type LearningModuleContent = {
  moduleKey: string;
  quizKey: string;
  title: string;
  fieldOfStudy: string;
  purpose: string;
  position: string;
  objectives: string[];
  topics: Array<{
    title: string;
    principle: string;
    operationalImplication: string;
    evidenceArtifact: string;
    failureRisk: string;
    whyItMatters: string;
    sourceCode: string;
    sourceTitle: string;
    sourceUrl: string;
  }>;
  assessmentStructure: string[];
  sourceList: Array<{ sourceCode: string; sourceTitle: string; sourceUrl: string }>;
  readingFile: string;
  questions: LearningQuestion[];
};

export type LearningAssessment = {
  key: string;
  title: string;
  kind: "QUIZ" | "FINAL";
  questions: LearningQuestion[];
};

export type LearningAttemptRecord = {
  assessmentKey: string;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  responses: Record<string, string>;
};

export type StoredLearningModuleState = {
  readingCompletedAt?: string;
  quizAttempts: LearningAttemptRecord[];
};

export type StoredLearningFinalState = {
  attempts: LearningAttemptRecord[];
};

export type StoredUserLearningState = {
  userId: string;
  companyId: string;
  updatedAt: string;
  modules: Record<string, StoredLearningModuleState>;
  finalTest?: StoredLearningFinalState;
};

export type StoredLearningStateFile = {
  version: 1;
  users: Record<string, StoredUserLearningState>;
};

export type DerivedLearningModuleProgress = {
  moduleKey: string;
  quizKey: string;
  title: string;
  fieldOfStudy: string;
  unlocked: boolean;
  readingCompleted: boolean;
  quizPassed: boolean;
  bestQuizScore: number | null;
  quizAttemptCount: number;
};

export type DerivedLearningSummary = {
  modules: DerivedLearningModuleProgress[];
  finalUnlocked: boolean;
  finalPassed: boolean;
  finalBestScore: number | null;
  completedModuleCount: number;
};
