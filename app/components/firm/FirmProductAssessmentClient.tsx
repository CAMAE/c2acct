"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VENDOR_PRODUCT_QUESTIONS_PER_UTILITY, VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import type { FirmProductCatalogItem } from "@/lib/firmPat";
import { buildFirmProductQuestions } from "@/lib/firmPat";

type Props = {
  product: FirmProductCatalogItem;
};

export default function FirmProductAssessmentClient({ product }: Props) {
  const router = useRouter();
  const questions = useMemo(() => buildFirmProductQuestions(product.utilityKeys), [product.utilityKeys]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = questions.filter((question) => typeof answers[question.id] === "number").length;

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
      <section className="pat-card p-6">
        <div className="pat-label">Product review scope</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Vendor: <span className="font-semibold text-[var(--shell-ink)]">{product.vendorName}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Utilities: <span className="font-semibold text-[var(--shell-ink)]">{product.utilityKeys.length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Questions: <span className="font-semibold text-[var(--shell-ink)]">{product.utilityKeys.length * VENDOR_PRODUCT_QUESTIONS_PER_UTILITY}</span>
          </div>
        </div>
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
                min={1}
                max={5}
                step={1}
                value={answers[question.id] ?? 1}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: Number(event.target.value),
                  }))
                }
                className="w-full accent-[var(--shell-accent)]"
              />
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--shell-muted)]">
                <span>Low fit / weak value</span>
                <span className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-sm font-semibold text-[var(--shell-ink)]">
                  {answers[question.id] ?? 1}
                </span>
                <span>Strong fit / high value</span>
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
