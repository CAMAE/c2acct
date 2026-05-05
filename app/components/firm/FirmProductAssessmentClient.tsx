"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
} from "@/lib/productAssessmentRuntime";
import { getVendorUtilityLabels } from "@/lib/vendorPat";
import type { FirmProductCatalogItem } from "@/lib/firmPat";
import { buildFirmProductQuestions } from "@/lib/firmPat";

type Props = {
  product: FirmProductCatalogItem;
};

type FirmProductQuestion = ReturnType<typeof buildFirmProductQuestions>[number];

type QuestionGroup = {
  key: string;
  title: string;
  description: string;
  label: string;
  questions: FirmProductQuestion[];
};

const QUESTIONS_PER_PAGE = 10;

function clampPageIndex(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function groupQuestionsBySection(questions: ReturnType<typeof buildFirmProductQuestions>) {
  const groups = new Map<string, QuestionGroup>();

  questions.forEach((question) => {
    const existing = groups.get(question.section.key);
    if (existing) {
      existing.questions.push(question);
      return;
    }

    groups.set(question.section.key, {
      key: question.section.key,
      title: question.section.title,
      description: question.section.description,
      label: question.utilityLabel ?? "Feature scoring",
      questions: [question],
    });
  });

  return Array.from(groups.values());
}

export default function FirmProductAssessmentClient({
  product,
}: Props) {
  const router = useRouter();
  const hasMountedRef = useRef(false);
  const questions = useMemo(() => buildFirmProductQuestions(product.utilityKeys), [product.utilityKeys]);
  const pages = useMemo(() => {
    const builtPages: ReturnType<typeof buildFirmProductQuestions>[] = [];

    for (let index = 0; index < questions.length; index += QUESTIONS_PER_PAGE) {
      builtPages.push(questions.slice(index, index + QUESTIONS_PER_PAGE));
    }

    return builtPages;
  }, [questions]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const answeredCount = questions.filter((question) => typeof answers[question.id] === "number").length;
  const progress = questions.length === 0 ? 0 : Math.round((answeredCount / questions.length) * 100);
  const totalPages = Math.max(pages.length, 1);
  const visibleCurrentPageIndex = clampPageIndex(currentPageIndex, totalPages);
  const currentPageQuestions = useMemo(
    () => pages[visibleCurrentPageIndex - 1] ?? [],
    [pages, visibleCurrentPageIndex]
  );
  const currentPageGroups = useMemo(() => groupQuestionsBySection(currentPageQuestions), [currentPageQuestions]);
  const questionNumberById = useMemo(
    () => new Map(questions.map((question, index) => [question.id, index + 1])),
    [questions]
  );
  const currentPageAnsweredCount = currentPageQuestions.filter(
    (question) => typeof answers[question.id] === "number"
  ).length;
  const currentPageMissingCount = currentPageQuestions.length - currentPageAnsweredCount;
  const currentPageTitle =
    currentPageGroups.length > 0
      ? currentPageGroups.map((group) => group.title).join(" / ")
      : "Feature-scoped product review";

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [visibleCurrentPageIndex]);

  function setScoredAnswer(questionId: string, nextValue: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: Number(nextValue),
    }));
  }

  function getScoredAnswerBadge(questionId: string) {
    const value = answers[questionId];
    return typeof value === "number" ? String(value) : "Not answered";
  }

  function hasScoredAnswer(questionId: string) {
    return typeof answers[questionId] === "number";
  }

  function goToPage(nextPage: number) {
    setCurrentPageIndex(clampPageIndex(nextPage, totalPages));
    setPageError(null);
    setError(null);
  }

  function continueToNextPage() {
    if (currentPageMissingCount > 0) {
      setPageError(
        `Complete the remaining ${currentPageMissingCount} required question${currentPageMissingCount === 1 ? "" : "s"} on this page before continuing.`
      );
      return;
    }

    goToPage(visibleCurrentPageIndex + 1);
  }

  async function submitAssessment() {
    if (questions.length === 0) {
      setError("This product has no declared features yet, so the firm assessment cannot open.");
      return;
    }
    if (answeredCount !== questions.length) {
      setError(`Complete all ${questions.length} questions before submitting.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setPageError(null);

    const response = await fetch("/api/firm/product-assessment/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        answers,
      }),
    });

    if (response.status === 401) {
      window.location.assign("/sign-in/firm");
      return;
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok !== true) {
      setSubmitting(false);
      setError(body?.error ?? body?.detail ?? `HTTP ${response.status}`);
      return;
    }

    router.push(`/firm/insights?submitted=1&productId=${product.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-6">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Page:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {visibleCurrentPageIndex} / {totalPages}
            </span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Progress: <span className="font-semibold text-[var(--shell-ink)]">{progress}%</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Answered:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {answeredCount} / {questions.length}
            </span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Features: <span className="font-semibold text-[var(--shell-ink)]">{product.utilityKeys.length}</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="pat-soft-panel p-5">
            <div className="pat-label">Progress</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{currentPageTitle}</div>
            <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Move through this review in 10-question pages and score each prompt based on how the product fits your firm’s current operating reality.
            </div>
            <div className="mt-4 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
              <div>
                Current page completion:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">
                  {currentPageAnsweredCount} of {currentPageQuestions.length}
                </span>
              </div>
              <div>
                Product: <span className="font-semibold text-[var(--shell-ink)]">{product.name}</span>
              </div>
            </div>
          </div>

          <div className="pat-soft-panel p-5">
            <div className="pat-label">Help</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              How to review this product
            </div>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
              <div>
                <span className="font-semibold text-[var(--shell-ink)]">How to take it:</span> Score each prompt with the slider, move page by page through the review, and submit once every active question is complete.
              </div>
              <div>
                <span className="font-semibold text-[var(--shell-ink)]">Why it matters:</span> Your answers add grounded firm-side evidence about how this product performs in real operating conditions.
              </div>
              <div>
                <span className="font-semibold text-[var(--shell-ink)]">What happens next:</span> After submission, PAT carries this review into the current product and firm insight surfaces.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Declared features</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {getVendorUtilityLabels(product.utilityKeys).map((featureLabel) => (
            <span
              key={featureLabel}
              className="rounded-full border border-[var(--shell-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--shell-ink)]"
            >
              {featureLabel}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {currentPageGroups.map((group) => (
          <div key={group.key} className="pat-card p-6">
            <div className="pat-label">{group.label}</div>
            <h3 className="mt-4 text-xl font-semibold text-[var(--shell-ink)]">{group.title}</h3>
            <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{group.description}</div>
            <div className="mt-6 grid gap-5">
              {group.questions.map((question) => {
                const questionNumber = questionNumberById.get(question.id) ?? 1;

                return (
                  <div key={question.id} className="pat-subpanel p-5">
                    <div className="pat-label">
                      {question.subcategory?.label ?? "Question cluster"}
                    </div>
                    <h4 className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">
                      {questionNumber}. {question.prompt}
                    </h4>
                    <div className="mt-5">
                      <input
                        type="range"
                        min={PRODUCT_ASSESSMENT_SCALE_MIN}
                        max={PRODUCT_ASSESSMENT_SCALE_MAX}
                        step={1}
                        value={answers[question.id] ?? PRODUCT_ASSESSMENT_SCALE_MIN}
                        onInput={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                        onChange={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                        onPointerUp={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                        onKeyUp={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                        className={`w-full ${hasScoredAnswer(question.id) ? "accent-[var(--shell-accent)]" : "pat-range-unanswered"}`}
                        aria-describedby={`${question.id}-range-state`}
                      />
                      <div className="mt-3 flex items-center justify-between text-xs text-[var(--shell-muted)]">
                        <span>0 = Low fit / weak value</span>
                        <span
                          id={`${question.id}-range-state`}
                          className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                            hasScoredAnswer(question.id)
                              ? "border-[var(--shell-border)] text-[var(--shell-ink)]"
                              : "border-amber-200 bg-amber-50 text-amber-900"
                          }`}
                        >
                          {getScoredAnswerBadge(question.id)}
                        </span>
                        <span>5 = Strong fit / high value</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">{visibleCurrentPageIndex < totalPages ? "Next" : "Submit"}</div>
        <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">
          {visibleCurrentPageIndex < totalPages ? "Next" : "Submit"}
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          {visibleCurrentPageIndex < totalPages
            ? "Continue to the next page of this product review."
            : "Submit this review once every question is scored so PAT can carry the result into the current product evidence set."}
        </p>
        {pageError ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {pageError}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {error}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {visibleCurrentPageIndex > 1 ? (
            <button type="button" onClick={() => goToPage(visibleCurrentPageIndex - 1)} className="pat-button-secondary">
              Back a page
            </button>
          ) : null}
          {visibleCurrentPageIndex < totalPages ? (
            <button type="button" onClick={continueToNextPage} className="pat-button-primary">
              Continue to next page
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submitAssessment()}
              className="pat-button-primary"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit firm product assessment"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
