"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { QuestionInputType } from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import {
  getDefaultAnswer,
  isAnswerPresent,
  normalizeAssessmentStep,
  type AssessmentModulePayload,
  type AssessmentQuestionRuntime,
  type NormalizedAnswer,
} from "@/lib/assessmentRuntime";

type Props = {
  moduleKey: string;
};

type VisiblePageSection = {
  key: string;
  title: string;
  description?: string;
  questionIds: string[];
};

function getPostSubmitHref(moduleKey: string) {
  if (moduleKey === "user_alignment_v1") {
    return "/user/insights?submitted=1";
  }

  if (moduleKey.startsWith("firm_alignment_")) {
    return "/firm/insights?submitted=1";
  }

  if (moduleKey === "vendor_product_alignment_v1") {
    return "/vendor/product-insight?submitted=1";
  }

  if (moduleKey === "firm_product_review_v1") {
    return "/firm/product-assessments?submitted=1";
  }

  return "/user/insights?submitted=1";
}

function getAssessmentLandingHref(moduleKey: string) {
  if (moduleKey === "user_alignment_v1") {
    return "/user/alignment-assessment";
  }

  if (moduleKey.startsWith("firm_alignment_")) {
    return "/firm/alignment-assessment";
  }

  if (moduleKey === "vendor_product_alignment_v1") {
    return "/vendor/product-assessment";
  }

  if (moduleKey === "firm_product_review_v1") {
    return "/firm/product-assessments";
  }

  return "/user/alignment-assessment";
}

function AssessmentPatFraming() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-left sm:gap-4">
      <div className="brand-pat-wordmark text-[2rem] leading-none text-[var(--shell-ink)] sm:text-[2.5rem]">
        PAT
      </div>
      <div className="h-10 w-px bg-[rgba(12,33,66,0.12)] sm:h-12" aria-hidden="true" />
      <div className="text-sm font-medium tracking-[0.08em] text-[var(--shell-ink)] sm:text-base">
        Performance Alignment Technology
      </div>
    </div>
  );
}

function isVendorStyleSlider(question: AssessmentQuestionRuntime) {
  return (
    question.inputType === QuestionInputType.SLIDER &&
    Boolean(question.validation.slider) &&
    question.validation.slider?.min === 0 &&
    question.validation.slider?.max === 5 &&
    question.validation.slider?.step === 1
  );
}

function renderLegacySliderChoices(
  question: AssessmentQuestionRuntime,
  value: NormalizedAnswer | undefined,
  setAnswer: (value: NormalizedAnswer) => void
) {
  const slider = question.validation.slider;
  if (!slider) {
    return null;
  }

  const selectedValue = typeof value === "number" ? value : null;
  const optionValues = Array.from(
    { length: Math.floor((slider.max - slider.min) / slider.step) + 1 },
    (_, index) => slider.min + index * slider.step
  );

  return (
    <div className="grid gap-4">
      <div
        className="mx-auto grid w-full max-w-[30rem] grid-cols-3 gap-2 sm:grid-cols-6"
        role="radiogroup"
        aria-label={`${question.prompt} answer choices`}
      >
        {optionValues.map((optionValue) => {
          const active = selectedValue === optionValue;

          return (
            <button
              key={optionValue}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setAnswer(optionValue)}
              className="pat-question-choice-button w-full min-w-0 justify-center"
              data-active={active}
            >
              {optionValue}
            </button>
          );
        })}
      </div>
      <div className="pat-sans flex items-center justify-between gap-3 text-xs text-[var(--shell-muted)]">
        <span>{slider.labels?.[String(slider.min)] ?? `Low (${slider.min})`}</span>
        {selectedValue === null ? (
          <span className="rounded-full border border-[var(--shell-border)] bg-white px-3 py-1 text-sm font-semibold text-[var(--shell-muted)]">
            Select a score
          </span>
        ) : (
          <span className="rounded-full border border-[var(--shell-border)] bg-white px-3 py-1 text-sm font-semibold text-[var(--shell-ink)]">
            {selectedValue}
          </span>
        )}
        <span>{slider.labels?.[String(slider.max)] ?? `High (${slider.max})`}</span>
      </div>
    </div>
  );
}

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

  if (isVendorStyleSlider(question) && question.validation.slider) {
    const slider = question.validation.slider;
    const hasAnswer = typeof value === "number" && Number.isFinite(value);
    const selectedValue = hasAnswer ? value : slider.min;

    return (
      <div className="grid gap-4">
        <input
          type="range"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={selectedValue}
          onInput={(event) => setAnswer(Number(event.currentTarget.value))}
          onChange={(event) => setAnswer(Number(event.currentTarget.value))}
          onPointerUp={(event) => setAnswer(Number(event.currentTarget.value))}
          onKeyUp={(event) => setAnswer(Number(event.currentTarget.value))}
          className={`w-full ${hasAnswer ? "accent-[var(--shell-accent)]" : "pat-range-unanswered"}`}
          aria-describedby={`${question.id}-range-state`}
        />
        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-[var(--shell-muted)]">
          <span>{slider.labels?.[String(slider.min)] ?? `Low (${slider.min})`}</span>
          <span
            id={`${question.id}-range-state`}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${
              hasAnswer
                ? "border-[var(--shell-border)] bg-white text-[var(--shell-ink)]"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {hasAnswer ? value : "Not answered"}
          </span>
          <span>{slider.labels?.[String(slider.max)] ?? `High (${slider.max})`}</span>
        </div>
      </div>
    );
  }

  if (question.inputType === QuestionInputType.SLIDER && question.validation.slider) {
    return renderLegacySliderChoices(question, value, setAnswer);
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const topCardRef = useRef<HTMLElement | null>(null);
  const hasMountedRef = useRef(false);
  const [data, setData] = useState<AssessmentModulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, NormalizedAnswer>>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const assessmentLandingHref = getAssessmentLandingHref(moduleKey);
  const resultsLandingHref = data ? getPostSubmitHref(data.key).replace(/\?submitted=1$/, "") : assessmentLandingHref;

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
    if (!data) {
      return;
    }

    setAnswers((currentAnswers) => {
      const nextAnswers = {
        ...(data.draft?.answers ?? {}),
        ...currentAnswers,
      };
      let changed = Object.keys(nextAnswers).length !== Object.keys(currentAnswers).length;

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

  const pages = data?.pages ?? [];
  const totalSteps = Math.max(1, pages.length);

  useEffect(() => {
    if (!data) {
      return;
    }

    const fallbackStep = data.draft?.currentStep ?? 1;
    const requested = Number(searchParams.get("step") ?? String(fallbackStep));
    const normalized = normalizeAssessmentStep(Number.isFinite(requested) ? requested : 1, totalSteps);

    if (normalized === requested) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (normalized <= 1) {
      params.delete("step");
    } else {
      params.set("step", String(normalized));
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [data, pathname, router, searchParams, totalSteps]);

  const requestedStep = Number(searchParams.get("step") ?? String(data?.draft?.currentStep ?? 1));
  const currentStep = normalizeAssessmentStep(Number.isFinite(requestedStep) ? requestedStep : 1, totalSteps);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    topCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [currentStep]);

  const questionsById = useMemo(() => {
    const entries: Array<[string, AssessmentQuestionRuntime]> =
      data?.questions.map((question) => [question.id, question]) ?? [];
    return new Map<string, AssessmentQuestionRuntime>(entries);
  }, [data]);

  const questionNumberById = useMemo(
    () => new Map((data?.questions ?? []).map((question, index) => [question.id, index + 1])),
    [data]
  );

  const requiredQuestionIds = useMemo(
    () => data?.questions.filter((question) => question.required).map((question) => question.id) ?? [],
    [data]
  );

  const answeredRequiredCount = useMemo(
    () => requiredQuestionIds.filter((questionId) => isAnswerPresent(answers[questionId])).length,
    [answers, requiredQuestionIds]
  );

  const missingRequiredCount = requiredQuestionIds.length - answeredRequiredCount;

  const currentPage = pages[currentStep - 1] ?? pages[0];
  const currentPageQuestionIds = currentPage?.questionIds ?? [];
  const currentPageRequiredIds = currentPageQuestionIds.filter((questionId) =>
    requiredQuestionIds.includes(questionId)
  );
  const currentPageAnsweredCount = currentPageRequiredIds.filter((questionId) =>
    isAnswerPresent(answers[questionId])
  ).length;
  const currentPageMissingCount = currentPageRequiredIds.length - currentPageAnsweredCount;

  const visibleSections = useMemo<VisiblePageSection[]>(() => {
    if (!data || !currentPage) {
      return [];
    }

    const pageQuestionIdSet = new Set(currentPage.questionIds);
    const sections: VisiblePageSection[] = [];

    currentPage.sectionKeys.forEach((sectionKey) => {
      const section = data.sections.find((entry) => entry.key === sectionKey);
      if (!section) {
        return;
      }

      const questionIds = section.questionIds.filter((questionId) => pageQuestionIdSet.has(questionId));
      if (questionIds.length === 0) {
        return;
      }

      sections.push({
        key: section.key,
        title: section.title,
        description: section.description,
        questionIds,
      });
    });

    return sections;
  }, [currentPage, data]);

  function setAnswer(questionId: string, value: NormalizedAnswer) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: value }));
  }

  async function saveDraft(stepOverride: number, answersOverride = answers) {
    if (!data || submitStatus === "success") {
      return true;
    }

    setAutosaveState("saving");
    setAutosaveError(null);

    try {
      const response = await fetch("/api/survey/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKey: data.key,
          step: stepOverride,
          totalSteps,
          answers: answersOverride,
        }),
      });

      if (response.status === 401) {
        const callbackUrl =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : `/survey/${data.key}`;
        window.location.assign(buildCanonicalSignInPath({ callbackUrl }));
        return false;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error ?? body?.detail ?? `HTTP ${response.status}`);
      }

      setAutosaveState("saved");
      return true;
    } catch (saveFailure) {
      setAutosaveState("error");
      setAutosaveError(saveFailure instanceof Error ? saveFailure.message : "Unable to save progress");
      return false;
    }
  }

  const autosaveDraft = useEffectEvent(() => {
    void saveDraft(currentStep);
  });

  useEffect(() => {
    if (!data || submitStatus === "success") {
      return;
    }

    const timeout = window.setTimeout(() => {
      autosaveDraft();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [answers, data, submitStatus]);

  function setStep(nextStep: number) {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedStep = normalizeAssessmentStep(nextStep, totalSteps);

    if (normalizedStep <= 1) {
      params.delete("step");
    } else {
      params.set("step", String(normalizedStep));
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setPageError(null);
    setSubmitError(null);
  }

  async function changeStep(nextStep: number) {
    const normalizedStep = normalizeAssessmentStep(nextStep, totalSteps);
    const saved = await saveDraft(normalizedStep);
    if (!saved) {
      return;
    }

    setStep(normalizedStep);
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
        window.location.assign(buildCanonicalSignInPath({ callbackUrl }));
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error || body?.detail || `HTTP ${response.status}`);
      }

      setSubmitStatus("success");
      router.push(getPostSubmitHref(data.key));
    } catch (submitFailure) {
      setSubmitStatus("error");
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : "Submit failed");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[72rem] py-6">
        <section className="pat-card p-8">
          <AssessmentPatFraming />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Loading the current module...
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
            PAT is preparing the assessment contract, sections, and question metadata for this workflow.
          </p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[72rem] py-6">
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
            <button
              type="button"
              onClick={() => router.push(assessmentLandingHref)}
              className="pat-button-secondary"
            >
              Back to readiness
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!data || !currentPage) {
    return (
      <div className="mx-auto w-full max-w-[72rem] py-6">
        <section className="pat-card p-8">Assessment module is unavailable.</section>
      </div>
    );
  }

  const unsupportedQuestions = data.questions.filter((question) => question.status === "unsupported");
  const completionPct =
    requiredQuestionIds.length === 0 ? 0 : Math.round((answeredRequiredCount / requiredQuestionIds.length) * 100);

  return (
    <div className="mx-auto w-full max-w-[72rem] space-y-8 py-6">
      <header ref={topCardRef} className="pat-card p-8">
        <AssessmentPatFraming />
        <div className="pat-label mt-5">Assessment module</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{data.title}</h1>
        {data.description ? (
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{data.description}</p>
        ) : null}
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
          PAT keeps this module in ten-question pages while preserving the same 0 to 5 scoring,
          draft-saving, and unlock logic underneath.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Page: <span className="font-semibold text-[var(--shell-ink)]">{currentStep} / {totalSteps}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Progress: <span className="font-semibold text-[var(--shell-ink)]">{completionPct}%</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Questions: <span className="font-semibold text-[var(--shell-ink)]">{data.questions.length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Autosave:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {autosaveState === "saving"
                ? "Saving"
                : autosaveState === "saved"
                  ? "Saved"
                  : autosaveState === "error"
                    ? "Issue"
                    : "Ready"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="pat-soft-panel p-5">
            <div className="pat-label">Process</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {currentPage.title}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {currentPage.description}
            </p>
            <div className="mt-4 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
              <div>
                Current page completion:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">
                  {currentPageAnsweredCount} of {currentPageRequiredIds.length}
                </span>
              </div>
              <div>
                Page range:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">
                  {currentPage.startQuestionNumber}-{currentPage.endQuestionNumber}
                </span>
              </div>
              <div>
                Total answered:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">
                  {answeredRequiredCount} of {requiredQuestionIds.length}
                </span>
              </div>
            </div>
          </section>

          <section className="pat-soft-panel p-5">
            <div className="pat-label">Help</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Ten-question pacing with the same scoring contract
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Use the range slider for the current-state 0 to 5 PAT score. Question numbering, draft
              saving, resume behavior, and unlock rules stay grounded in the same module contract.
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              The final five follow-up questions are module-specific and fixed today. PAT is not
              claiming adaptive firm follow-up wording yet.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-[var(--shell-accent)]">
              <Link href={assessmentLandingHref} className="hover:text-[var(--shell-accent-strong)]">
                Back to readiness
              </Link>
              <Link href={resultsLandingHref} className="hover:text-[var(--shell-accent-strong)]">
                Review current results
              </Link>
              <Link href="/survey/help" className="hover:text-[var(--shell-accent-strong)]">
                Open assessment help
              </Link>
            </div>
          </section>
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
        {visibleSections.map((section) => (
          <section key={section.key} className="pat-card overflow-hidden p-6">
            <div className="grid gap-2">
              <div className="pat-label">{section.title}</div>
              {section.description ? (
                <p className="max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">{section.description}</p>
              ) : null}
            </div>

            <div className="mt-6 grid gap-5">
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
                        Question {questionNumberById.get(question.id) ?? 1} of {data.questions.length} ·{" "}
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

                    <div className="mt-5">
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

      <section className="pat-card p-6">
        <div className="pat-label">{currentStep < totalSteps ? "Next" : "Submit"}</div>
        <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">
          {currentStep < totalSteps ? "Next" : "Submit"}
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          {currentStep < totalSteps
            ? "Continue to next page of the assessment"
            : "Submit this module to preserve the scored PAT record, unlock evaluation state, and carry the current module signal into the live firm results flow."}
        </p>

        {currentPageMissingCount > 0 ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {currentPageMissingCount} required question{currentPageMissingCount === 1 ? "" : "s"} still need a
            response before PAT can {currentStep < totalSteps ? "open the next page" : "submit this module"}.
          </div>
        ) : null}

        {pageError ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {pageError}
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {submitError}
          </div>
        ) : null}

        {submitStatus === "success" ? (
          <div className="mt-4 pat-banner pat-banner-success">
            Submission accepted. Opening the current results view...
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {currentStep > 1 ? (
            <button type="button" onClick={() => void changeStep(currentStep - 1)} className="pat-button-secondary">
              Back a page
            </button>
          ) : null}
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={() => void changeStep(currentStep + 1)}
              disabled={currentPageMissingCount > 0}
              className="pat-button-primary"
            >
              Continue to next page
            </button>
          ) : (
            <button
              type="button"
              onClick={submitSurvey}
              disabled={submitStatus === "submitting" || submitStatus === "success" || currentPageMissingCount > 0}
              className="pat-button-primary"
            >
              {submitStatus === "submitting" ? "Submitting assessment..." : "Submit assessment"}
            </button>
          )}
        </div>

        <div className="mt-4 text-sm text-[var(--shell-muted)]">
          {autosaveState === "saving"
            ? "Saving progress..."
            : autosaveState === "saved"
              ? "Progress saved"
              : autosaveState === "error"
                ? `Autosave issue: ${autosaveError ?? "Unable to save progress"}`
                : "Progress saves automatically as you move through the module."}
        </div>
      </section>
    </div>
  );
}
