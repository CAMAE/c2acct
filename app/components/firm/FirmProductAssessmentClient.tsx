"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
} from "@/lib/productAssessmentRuntime";
import { VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import type { FirmProductCatalogItem } from "@/lib/firmPat";
import { buildFirmProductQuestions } from "@/lib/firmPat";

type Props = {
  product: FirmProductCatalogItem;
  assessmentsHref: string;
  productInsightHref: string;
  helpHref: string;
};

export default function FirmProductAssessmentClient({
  product,
  assessmentsHref,
  productInsightHref,
  helpHref,
}: Props) {
  const router = useRouter();
  const questions = useMemo(() => buildFirmProductQuestions(product.utilityKeys), [product.utilityKeys]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = questions.filter((question) => typeof answers[question.id] === "number").length;
  const progress = questions.length === 0 ? 0 : Math.round((answeredCount / questions.length) * 100);

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
      setError("This product has no declared utilities yet, so the firm assessment cannot open.");
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
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="pat-soft-panel p-5">
          <div className="pat-label">Progress card</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">{progress}%</div>
          <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {answeredCount} of {questions.length} utility-scoped review questions completed
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            This firm review remains inside the vendor-declared utility scope for {product.name}.
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[var(--shell-accent)]">
            <Link href={assessmentsHref} className="hover:text-[var(--shell-accent-strong)]">
              Back to products
            </Link>
            <Link href={productInsightHref} className="hover:text-[var(--shell-accent-strong)]">
              Open vendor product insight
            </Link>
          </div>
        </div>

        <Link href={helpHref} className="pat-soft-panel pat-soft-panel-interactive block p-5">
          <div className="pat-label">Help card</div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Firm product assessment help
          </div>
          <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Open the scoped help view for utility-scoped firm review, current scoring expectations, and how this review feeds vendor product insight.
          </div>
        </Link>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Declared utilities</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {product.utilityKeys.map((utilityKey) => (
            <span
              key={utilityKey}
              className="rounded-full border border-[var(--shell-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--shell-ink)]"
            >
              {utilityKey.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {questions.map((question, index) => (
          <div key={question.id} className="pat-card p-6">
            <div className="pat-label">{question.section.title}</div>
            <div className="mt-3 text-sm text-[var(--shell-muted)]">{question.section.description}</div>
            <h3 className="mt-4 text-lg font-semibold text-[var(--shell-ink)]">
              {index + 1}. {question.prompt}
            </h3>
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
        ))}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Submit</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          This firm-side product review feeds the vendor product intelligence loop. It stays aligned to vendor-declared utilities only and does not ask irrelevant product questions outside that scope.
        </p>
        {error ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {error}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => void submitAssessment()} className="pat-button-primary" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit firm product assessment"}
          </button>
          <div
            className="rounded-[18px] border border-[var(--shell-border)] bg-[rgba(79,191,226,0.12)] px-4 py-3 text-sm text-[var(--shell-muted)]"
            title={VENDOR_PRODUCT_TIER2_HOVER}
          >
            Elite membership remains staged behind locked blue cards.
          </div>
        </div>
      </section>
    </div>
  );
}
