"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DerivedLearningSummary, LearningAssessment, LearningModuleContent } from "@/lib/userLearning/types";

export function ReadingCompletionButton({
  moduleKey,
  quizKey,
  disabled,
}: {
  moduleKey: string;
  quizKey: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function completeReading() {
    setStatus("saving");
    setError(null);

    try {
      const response = await fetch("/api/user-learning/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_reading", moduleKey }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      router.push(`/user/quizzes/${quizKey}`);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to record reading progress");
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={completeReading}
        disabled={disabled || status === "saving"}
        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "saving" ? "Recording progress..." : "Mark reading complete and continue"}
      </button>
      {error ? <div className="text-sm text-rose-700">{error}</div> : null}
    </div>
  );
}

function inputForQuestion(questionId: string, prompt: string, kind: LearningAssessment["questions"][number]["kind"], options: string[], value: string, onChange: (value: string) => void) {
  if (kind === "TRUE_FALSE") {
    return (
      <div className="flex gap-3">
        {["True", "False"].map((choice) => (
          <label key={choice} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <input type="radio" name={questionId} value={choice} checked={value === choice} onChange={(event) => onChange(event.target.value)} />
            <span>{choice}</span>
          </label>
        ))}
      </div>
    );
  }

  if (kind === "MULTIPLE_CHOICE") {
    return (
      <div className="grid gap-2">
        {options.map((option) => {
          const choice = option.split(")")[0];
          return (
            <label key={option} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <input type="radio" name={questionId} value={choice} checked={value === choice} onChange={(event) => onChange(event.target.value)} className="mt-1" />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={4}
      placeholder="Write a one-sentence professional response."
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
    />
  );
}

export function LearningAssessmentClient({
  assessment,
  assessmentKind,
  submitKey,
  summary,
  intro,
}: {
  assessment: LearningAssessment;
  assessmentKind: "QUIZ" | "FINAL";
  submitKey: string;
  summary: DerivedLearningSummary;
  intro: string;
}) {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ scorePercent: number; passed: boolean; correctCount: number; totalQuestions: number } | null>(null);
  const QUESTIONS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(assessment.questions.length / QUESTIONS_PER_PAGE));
  const pageQuestions = useMemo(
    () => assessment.questions.slice(pageIndex * QUESTIONS_PER_PAGE, pageIndex * QUESTIONS_PER_PAGE + QUESTIONS_PER_PAGE),
    [assessment.questions, pageIndex]
  );

  async function submitAssessment() {
    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/user-learning/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentKind,
          assessmentKey: submitKey,
          responses,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      setResult(body.grade);
      setStatus("success");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to grade assessment");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">{assessmentKind === "QUIZ" ? "Module quiz" : "Final assessment"}</div>
        <h1 className="mt-3 text-4xl font-semibold">{assessment.title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">{intro}</p>
        <div className="mt-4 text-sm text-white/60">
          Progress snapshot: {summary.completedModuleCount} of {summary.modules.length} modules passed.
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
        Page {pageIndex + 1} of {totalPages}. Questions {pageIndex * QUESTIONS_PER_PAGE + 1}-
        {Math.min((pageIndex + 1) * QUESTIONS_PER_PAGE, assessment.questions.length)} of {assessment.questions.length}.
      </div>

      <div className="grid gap-4">
        {pageQuestions.map((question) => (
          <div key={question.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">{question.id}</div>
            <div className="mt-3 text-lg font-semibold">{question.prompt}</div>
            <div className="mt-2 text-xs text-white/45">
              {question.fieldOfStudy} | {question.sourceCode} | {question.sourceTitle}
            </div>
            <div className="mt-4">
              {inputForQuestion(
                question.id,
                question.prompt,
                question.kind,
                question.options,
                responses[question.id] ?? "",
                (value) => setResponses((current) => ({ ...current, [question.id]: value }))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          disabled={pageIndex === 0}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm disabled:opacity-50"
        >
          Previous 5
        </button>
        <button
          type="button"
          onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
          disabled={pageIndex >= totalPages - 1}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm disabled:opacity-50"
        >
          Next 5
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <button
          type="button"
          onClick={submitAssessment}
          disabled={status === "submitting"}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {status === "submitting" ? "Grading..." : assessmentKind === "QUIZ" ? "Submit quiz" : "Submit final test"}
        </button>
        {error ? <div className="mt-3 text-sm text-rose-400">{error}</div> : null}
        {result ? (
          <div className="mt-4 grid gap-2 text-sm text-white/75">
            <div>
              Score: {result.scorePercent}% ({result.correctCount}/{result.totalQuestions})
            </div>
            <div>{result.passed ? "Status: pass" : "Status: remediation required"}</div>
            {assessmentKind === "QUIZ" && result.passed ? (
              <Link href="/user/learning" className="underline underline-offset-4">
                Return to learning overview
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
