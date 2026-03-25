"use client";

import { useEffect, useMemo, useState } from "react";
import { QuestionInputType } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  getDefaultAnswer,
  isAnswerPresent,
  type AssessmentModulePayload,
  type AssessmentQuestionRuntime,
  type NormalizedAnswer,
} from "@/lib/assessmentRuntime";

type Props = {
  moduleKey: string;
};

function renderQuestionInput(
  question: AssessmentQuestionRuntime,
  value: NormalizedAnswer | undefined,
  setAnswer: (value: NormalizedAnswer) => void
) {
  if (question.status === "unsupported") {
    return (
      <div className="pat-banner pat-banner-danger">
        This question type is configured without the metadata the PAT runtime requires yet.
      </div>
    );
  }

  if (question.inputType === QuestionInputType.SLIDER && question.validation.slider) {
    const slider = question.validation.slider;
    const selectedValue = typeof value === "number" ? value : slider.min;

    return (
      <div className="grid gap-4">
        <input
          type="range"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={selectedValue}
          onChange={(event) => setAnswer(Number(event.target.value))}
          className="accent-[var(--shell-accent-strong)]"
        />
        <div className="pat-sans flex items-center justify-between gap-3 text-xs text-[var(--shell-muted)]">
          <span>{slider.labels?.[String(slider.min)] ?? `Low (${slider.min})`}</span>
          <span className="rounded-full border border-[var(--shell-border)] bg-white px-3 py-1 text-sm font-semibold text-[var(--shell-ink)]">
            {selectedValue}
          </span>
          <span>{slider.labels?.[String(slider.max)] ?? `High (${slider.max})`}</span>
        </div>
      </div>
    );
  }

  if (question.inputType === QuestionInputType.TEXT) {
    const textMeta = question.validation.text;
    const currentValue = typeof value === "string" ? value : "";

    if (textMeta?.multiline === false) {
      return (
        <input
          type="text"
          value={currentValue}
          placeholder={question.meta.placeholder ?? ""}
          onChange={(event) => setAnswer(event.target.value)}
          className="pat-input"
        />
      );
    }

    return (
      <textarea
        value={currentValue}
        placeholder={question.meta.placeholder ?? ""}
        onChange={(event) => setAnswer(event.target.value)}
        rows={4}
        className="pat-textarea min-h-[132px] resize-y"
      />
    );
  }

  if (question.inputType === QuestionInputType.BOOLEAN) {
    const currentValue = typeof value === "boolean" ? value : false;

    return (
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Yes", nextValue: true },
          { label: "No", nextValue: false },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setAnswer(option.nextValue)}
            data-active={currentValue === option.nextValue}
            className="pat-question-choice-button"
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.inputType === QuestionInputType.SELECT) {
    const currentValue = typeof value === "string" ? value : "";

    return (
      <select
        value={currentValue}
        onChange={(event) => setAnswer(event.target.value)}
        className="pat-select"
      >
        <option value="">{question.meta.placeholder ?? "Select one"}</option>
        {(question.validation.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (question.inputType === QuestionInputType.MULTISELECT) {
    const selectedValues = Array.isArray(value) ? value : [];

    return (
      <div className="grid gap-3">
        {(question.validation.options ?? []).map((option) => {
          const checked = selectedValues.includes(option.value);

          return (
            <label key={option.value} data-active={checked} className="pat-question-choice pat-sans">
              <input
                type="checkbox"
                checked={checked}
                className="mt-1"
                onChange={() => {
                  if (checked) {
                    setAnswer(selectedValues.filter((entry) => entry !== option.value));
                    return;
                  }

                  setAnswer([...selectedValues, option.value]);
                }}
              />
              <span className="grid gap-1">
                <span className="font-semibold text-[var(--shell-ink)]">{option.label}</span>
                {option.description ? (
                  <span className="text-sm leading-6 text-[var(--shell-muted)]">{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.inputType === QuestionInputType.NUMBER) {
    const currentValue = typeof value === "number" ? String(value) : "";

    return (
      <input
        type="number"
        min={question.validation.number?.min}
        max={question.validation.number?.max}
        step={question.validation.number?.step ?? 1}
        value={currentValue}
        placeholder={question.meta.placeholder ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          setAnswer(nextValue === "" ? null : Number(nextValue));
        }}
        className="pat-input"
      />
    );
  }

  return (
    <div className="pat-banner pat-banner-danger">
      This question type is not enabled in the current PAT runtime.
    </div>
  );
}

export default function AssessmentModuleClient({ moduleKey }: Props) {
  const router = useRouter();
  const [data, setData] = useState<AssessmentModulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, NormalizedAnswer>>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadModule() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/survey/module/${moduleKey}`, { cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.detail || body?.error || `HTTP ${response.status}`);
        }

        if (!cancelled) {
          setData(body as AssessmentModulePayload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load module");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadModule();

    return () => {
      cancelled = true;
    };
  }, [moduleKey]);

  useEffect(() => {
    if (!data) return;

    setAnswers((currentAnswers) => {
      const nextAnswers = { ...currentAnswers };
      let changed = false;

      for (const question of data.questions) {
        if (!(question.id in nextAnswers)) {
          const defaultAnswer = getDefaultAnswer(question);
          if (defaultAnswer !== undefined) {
            nextAnswers[question.id] = defaultAnswer;
            changed = true;
          }
        }
      }

      return changed ? nextAnswers : currentAnswers;
    });
  }, [data]);

  const questionsById = useMemo(() => {
    const entries: Array<[string, AssessmentQuestionRuntime]> =
      data?.questions.map((question) => [question.id, question]) ?? [];
    return new Map<string, AssessmentQuestionRuntime>(entries);
  }, [data]);

  const requiredQuestionIds = useMemo(
    () => data?.questions.filter((question) => question.required).map((question) => question.id) ?? [],
    [data]
  );

  const answeredRequiredCount = useMemo(
    () => requiredQuestionIds.filter((questionId) => isAnswerPresent(answers[questionId])).length,
    [answers, requiredQuestionIds]
  );

  const missingRequiredCount = requiredQuestionIds.length - answeredRequiredCount;

  function setAnswer(questionId: string, value: NormalizedAnswer) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: value }));
  }

  async function submitSurvey() {
    if (!data || submitStatus === "submitting") {
      return;
    }

    if (missingRequiredCount > 0) {
      setSubmitStatus("error");
      setSubmitError(
        `Complete the remaining ${missingRequiredCount} required question${
          missingRequiredCount === 1 ? "" : "s"
        } before submitting.`
      );
      return;
    }

    setSubmitStatus("submitting");
    setSubmitError(null);

    try {
      const response = await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKey: data.key,
          answers,
        }),
      });

      if (response.status === 401) {
        const callbackUrl =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : `/survey/${data.key}`;
        window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error || body?.detail || `HTTP ${response.status}`);
      }

      setSubmitStatus("success");
      router.push("/results?submitted=1");
    } catch (submitFailure) {
      setSubmitStatus("error");
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : "Submit failed");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-8">
        <section className="pat-card-strong p-8">
          <div className="pat-label text-white/60">PAT Assessment</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Loading the current module...</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/74">
            PAT is preparing the assessment contract, sections, and question metadata for this workflow.
          </p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl py-8">
        <section className="pat-card p-8">
          <div className="pat-label">Assessment unavailable</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-danger)]">
            The module could not be prepared.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-danger)]">{error}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => window.location.reload()} className="pat-button-primary">
              Retry
            </button>
            <button type="button" onClick={() => router.push("/survey")} className="pat-button-secondary">
              Back to readiness
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl py-8">
        <section className="pat-card p-8">Assessment module is unavailable.</section>
      </div>
    );
  }

  const unsupportedQuestions = data.questions.filter((question) => question.status === "unsupported");
  const completionPct =
    requiredQuestionIds.length === 0 ? 0 : Math.round((answeredRequiredCount / requiredQuestionIds.length) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <header className="pat-card-strong p-8">
        <div className="pat-label text-white/60">PAT Assessment Module</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{data.title}</h1>
        <div className="pat-sans mt-2 text-sm text-white/62">
          {data.scope} module · v{data.version}
        </div>
        {data.description ? (
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/74">{data.description}</p>
        ) : null}

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-white/7 p-5">
            <div className="pat-label text-white/54">Progress</div>
            <div className="pat-sans mt-3 text-4xl font-semibold tracking-tight">{completionPct}%</div>
            <div className="mt-3 text-sm leading-6 text-white/70">
              {answeredRequiredCount} of {requiredQuestionIds.length} required questions completed
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/7 p-5">
            <div className="pat-label text-white/54">Current path</div>
            <div className="pat-sans mt-3 text-xl font-semibold tracking-tight">
              Assessment - Results - Outputs
            </div>
            <div className="mt-3 text-sm leading-6 text-white/70">
              Submission moves directly into the protected PAT readout flow.
            </div>
          </div>
        </div>
      </header>

      {data.stagedFeatures.branching || data.stagedFeatures.roleVariants ? (
        <div className="pat-banner pat-banner-info">
          {data.stagedFeatures.branching
            ? "Branching metadata is present and reserved for phase 2 runtime control. "
            : ""}
          {data.stagedFeatures.roleVariants
            ? "Role-variant metadata is present and reserved for phase 2 module resolution."
            : ""}
        </div>
      ) : null}

      {unsupportedQuestions.length > 0 ? (
        <div className="pat-banner pat-banner-warning">
          {unsupportedQuestions.length} question{unsupportedQuestions.length === 1 ? "" : "s"} need metadata repair
          before they can render fully.
        </div>
      ) : null}

      <div className="grid gap-5">
        {data.sections.map((section, sectionIndex) => (
          <section key={section.key} className="pat-card overflow-hidden p-6">
            <div className="grid gap-2">
              <div className="pat-label">Section {sectionIndex + 1}</div>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{section.title}</h2>
              {section.description ? (
                <p className="max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">{section.description}</p>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4">
              {section.questionIds.map((questionId) => {
                const question = questionsById.get(questionId);
                if (!question) {
                  return null;
                }

                const value = answers[question.id];
                const hasAnswer = isAnswerPresent(value);

                return (
                  <article key={question.id} className="pat-subpanel p-5">
                    <div className="grid gap-3">
                      <div className="pat-label">
                        {question.required ? "Required" : "Optional"}
                        {question.meta.groupKey ? ` · ${question.meta.groupKey}` : ""}
                      </div>
                      <div className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
                        {question.prompt}
                      </div>
                      {question.meta.helpText ? (
                        <div className="text-sm leading-6 text-[var(--shell-muted)]">
                          {question.meta.helpText}
                        </div>
                      ) : null}
                      {question.meta.branching ? (
                        <div className="pat-banner pat-banner-info">
                          Branching rule staged for phase 2:{" "}
                          {question.meta.branching.visibleWhen?.questionKey ?? "conditional"}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      {renderQuestionInput(question, value, (nextValue) => setAnswer(question.id, nextValue))}
                    </div>

                    <div
                      className={`pat-sans mt-4 text-sm ${
                        hasAnswer ? "text-[var(--shell-success)]" : "text-[var(--shell-muted)]"
                      }`}
                    >
                      {hasAnswer ? "Response captured" : "Awaiting response"}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-3">
        {submitStatus === "success" ? (
          <div className="pat-banner pat-banner-success">Submission accepted. Opening the current results view...</div>
        ) : null}

        {missingRequiredCount > 0 ? (
          <div className="pat-banner pat-banner-warning">
            {missingRequiredCount} required question{missingRequiredCount === 1 ? "" : "s"} still need a response
            before PAT can accept this submission.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submitSurvey}
            disabled={submitStatus === "submitting" || submitStatus === "success"}
            className="pat-button-primary"
          >
            {submitStatus === "submitting" ? "Submitting assessment..." : "Submit assessment"}
          </button>
          <button type="button" onClick={() => router.push("/survey")} className="pat-button-secondary">
            Back to readiness
          </button>
          <button type="button" onClick={() => router.push("/results")} className="pat-button-secondary">
            Review current results
          </button>
        </div>

        {submitError ? <div className="pat-banner pat-banner-danger">Submit error: {submitError}</div> : null}
      </div>
    </div>
  );
}
