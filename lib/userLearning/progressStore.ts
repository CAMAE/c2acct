import fs from "node:fs/promises";
import path from "node:path";
import type {
  DerivedLearningModuleProgress,
  DerivedLearningSummary,
  LearningAttemptRecord,
  StoredLearningFinalState,
  StoredLearningModuleState,
  StoredLearningStateFile,
  StoredUserLearningState,
} from "@/lib/userLearning/types";
import { getLearningModules } from "@/lib/userLearning/content";

const STORE_PATH = path.join(process.cwd(), "artifacts", "runtime", "user-learning-progress.json");

function createEmptyStore(): StoredLearningStateFile {
  return {
    version: 1,
    users: {},
  };
}

async function ensureStoreDir() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
}

export async function loadLearningStore(): Promise<StoredLearningStateFile> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoredLearningStateFile;
    if (parsed?.version === 1 && parsed.users && typeof parsed.users === "object") {
      return parsed;
    }
  } catch {}

  return createEmptyStore();
}

export async function saveLearningStore(store: StoredLearningStateFile) {
  await ensureStoreDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getStoredLearningState(userId: string, companyId: string) {
  const store = await loadLearningStore();
  return (
    store.users[userId] ?? {
      userId,
      companyId,
      updatedAt: new Date(0).toISOString(),
      modules: {},
      finalTest: { attempts: [] },
    }
  );
}

export async function updateStoredLearningState(
  userId: string,
  companyId: string,
  updater: (current: StoredUserLearningState) => StoredUserLearningState
) {
  const store = await loadLearningStore();
  const current =
    store.users[userId] ?? {
      userId,
      companyId,
      updatedAt: new Date(0).toISOString(),
      modules: {},
      finalTest: { attempts: [] },
    };
  const next = updater(current);
  next.updatedAt = new Date().toISOString();
  store.users[userId] = next;
  await saveLearningStore(store);
  return next;
}

function getModuleState(state: StoredUserLearningState, moduleKey: string): StoredLearningModuleState {
  return state.modules[moduleKey] ?? { quizAttempts: [] };
}

function getFinalState(state: StoredUserLearningState): StoredLearningFinalState {
  return state.finalTest ?? { attempts: [] };
}

function bestScore(attempts: LearningAttemptRecord[]) {
  if (attempts.length === 0) return null;
  return Math.max(...attempts.map((attempt) => attempt.scorePercent));
}

export function deriveLearningSummary(state: StoredUserLearningState): DerivedLearningSummary {
  const modules = getLearningModules();
  let priorPassed = true;
  const derivedModules: DerivedLearningModuleProgress[] = modules.map((module) => {
    const moduleState = getModuleState(state, module.moduleKey);
    const bestQuizScore = bestScore(moduleState.quizAttempts);
    const quizPassed = moduleState.quizAttempts.some((attempt) => attempt.passed);
    const unlocked = priorPassed;
    priorPassed = priorPassed && quizPassed;
    return {
      moduleKey: module.moduleKey,
      quizKey: module.quizKey,
      title: module.title,
      fieldOfStudy: module.fieldOfStudy,
      unlocked,
      readingCompleted: Boolean(moduleState.readingCompletedAt),
      quizPassed,
      bestQuizScore,
      quizAttemptCount: moduleState.quizAttempts.length,
    };
  });

  const finalState = getFinalState(state);
  return {
    modules: derivedModules,
    finalUnlocked: derivedModules.every((module) => module.quizPassed),
    finalPassed: finalState.attempts.some((attempt) => attempt.passed),
    finalBestScore: bestScore(finalState.attempts),
    completedModuleCount: derivedModules.filter((module) => module.quizPassed).length,
  };
}

export async function markReadingComplete(userId: string, companyId: string, moduleKey: string) {
  return updateStoredLearningState(userId, companyId, (current) => {
    const modules = { ...current.modules };
    const moduleState = getModuleState(current, moduleKey);
    modules[moduleKey] = {
      ...moduleState,
      readingCompletedAt: moduleState.readingCompletedAt ?? new Date().toISOString(),
    };
    return { ...current, modules };
  });
}

export async function recordQuizAttempt(userId: string, companyId: string, moduleKey: string, attempt: LearningAttemptRecord) {
  return updateStoredLearningState(userId, companyId, (current) => {
    const modules = { ...current.modules };
    const moduleState = getModuleState(current, moduleKey);
    modules[moduleKey] = {
      ...moduleState,
      quizAttempts: [...moduleState.quizAttempts, attempt],
    };
    return { ...current, modules };
  });
}

export async function recordFinalAttempt(userId: string, companyId: string, attempt: LearningAttemptRecord) {
  return updateStoredLearningState(userId, companyId, (current) => {
    const finalState = getFinalState(current);
    return {
      ...current,
      finalTest: {
        attempts: [...finalState.attempts, attempt],
      },
    };
  });
}

export async function listLearningStateForCompany(companyId: string) {
  const store = await loadLearningStore();
  return Object.values(store.users).filter((entry) => entry.companyId === companyId);
}

export function getLearningStorePath() {
  return STORE_PATH;
}
