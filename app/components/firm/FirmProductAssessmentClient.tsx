"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import { sliderValueFromPointer } from "@/lib/scoreSlider";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
} from "@/lib/productAssessmentRuntime";
import { getVendorUtilityLabels } from "@/lib/vendorPat";
import type { FirmProductCatalogItem } from "@/lib/firmPat";
import { buildFirmProductQuestions } from "@/lib/firmPat";

/**
 * Firm-side product assessment on ONE page (V3 box 4.1, 2026-09-09 — Leslie's
 * one-page rule, the firm twin of f2e7713d). Every section stacks on one
 * screen with its header, questions numbered continuously; the 10-per-page
 * pager, its Next/Back buttons and the top-scroll on page change are gone.
 * Submit gating is unchanged: every question scored, then one POST to
 * /api/firm/product-assessment/submit. (This surface has no draft API — the
 * firm review has always been score-then-submit — so there is no autosave to
 * carry; the vendor twin's save/resume paths are its own.)
 */

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

export default function FirmProductAssessmentClient({ product }: Props) {
  const router = useRouter();
  const questions = useMemo(() => buildFirmProductQuestions(product.utilityKeys), [product.utilityKeys]);
  const groups = useMemo(() => groupQuestionsBySection(questions), [questions]);
  const questionNumberById = useMemo(
    () => new Map(questions.map((question, index) => [question.id, index + 1])),
    [questions]
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = questions.filter((question) => typeof answers[question.id] === "number").length;
  const progress = questions.length === 0 ? 0 : Math.round((answeredCount / questions.length) * 100);
  const missingCount = questions.length - answeredCount;

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
    <div className="space-y-8" data-testid="firm-assessment-stacked">
      <section className="pat-card p-6">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Progress: <strong className="font-semibold text-[var(--shell-ink)]">{progress}%</strong>
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
            <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {groups.length > 0 ? groups.map((group) => group.title).join(" / ") : "Feature-scoped product review"}
            </div>
            <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Score each prompt based on how the product fits your firm’s current operating reality. Every question sits on
              this one page; submit when all of them are scored.
            </div>
            <div className="mt-4 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
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
                <span className="font-semibold text-[var(--shell-ink)]">How to take it:</span> Score each prompt with the
                slider, work down the page section by section, then submit once every question is answered.
              </div>
              <div>
                <span className="font-semibold text-[var(--shell-ink)]">Why it matters:</span> Your answers add current-state
                firm-side evidence about how this product performs in practice.
              </div>
              <div>
                <span className="font-semibold text-[var(--shell-ink)]">What happens next:</span> After submission, PAT carries
                this review into the current product evidence set and your firm insights.
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
        {groups.map((group) => (
          <div key={group.key} className="pat-card p-6" data-testid="firm-assessment-section">
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
                        onChange={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.currentTarget.focus();
                          setScoredAnswer(
                            question.id,
                            String(sliderValueFromPointer(event, PRODUCT_ASSESSMENT_SCALE_MIN, PRODUCT_ASSESSMENT_SCALE_MAX))
                          );
                        }}
                        onPointerMove={(event) => {
                          if ((event.buttons & 1) === 1) {
                            setScoredAnswer(
                              question.id,
                              String(sliderValueFromPointer(event, PRODUCT_ASSESSMENT_SCALE_MIN, PRODUCT_ASSESSMENT_SCALE_MAX))
                            );
                          }
                        }}
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
        <div className="pat-label">Submit</div>
        <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">Submit</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          Submit this review once every question is scored so PAT can carry the result into the current product evidence set.
        </p>
        {missingCount > 0 ? (
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]" data-testid="firm-assessment-remaining">
            {missingCount} question{missingCount === 1 ? "" : "s"} still unanswered.
          </p>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {error}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void submitAssessment()}
            className="pat-button-primary"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit firm product assessment"}
          </button>
        </div>
      </section>
    </div>
  );
}
