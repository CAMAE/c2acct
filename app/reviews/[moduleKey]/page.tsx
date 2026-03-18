"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

type ReviewQuestion = {
  id: string;
  key: string;
  prompt: string;
  inputType: "SLIDER" | "SELECT" | "MULTISELECT" | "BOOLEAN" | "NUMBER" | "TEXT";
  weight: number;
  order: number;
  required: boolean;
};

type ModulePayload = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  scope: string;
  version: number;
  axis: string;
  questions: ReviewQuestion[];
};

type VisibleProduct = {
  id: string;
  name: string;
  companyId: string;
  accessReason?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load review entry";
}

export default function ReviewModulePage() {
  const params = useParams<{ moduleKey: string }>();
  const searchParams = useSearchParams();
  const moduleKey = useMemo(() => (params?.moduleKey ? String(params.moduleKey) : ""), [params]);
  const requestedProductId = useMemo(() => {
    const raw = searchParams?.get("productId") ?? "";
    const normalized = raw.trim();
    return normalized.length > 0 ? normalized : null;
  }, [searchParams]);

  const [moduleData, setModuleData] = useState<ModulePayload | null>(null);
  const [products, setProducts] = useState<VisibleProduct[]>([]);
  const [targetProductId, setTargetProductId] = useState<string | null>(requestedProductId);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const QUESTIONS_PER_PAGE = 5;

  useEffect(() => {
    if (!moduleKey) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [moduleRes, contextRes] = await Promise.all([
          fetch(`/api/external-reviews/module/${moduleKey}`, { cache: "no-store" }),
          fetch("/api/products/context?includeSponsored=1", { cache: "no-store" }),
        ]);

        if (moduleRes.status === 401 || contextRes.status === 401) {
          const callbackUrl =
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : `/reviews/${moduleKey}`;
          window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          return;
        }

        const moduleBody = await moduleRes.json().catch(() => ({}));
        const contextBody = await contextRes.json().catch(() => ({}));

        if (!moduleRes.ok) {
          throw new Error(moduleBody?.error || `HTTP ${moduleRes.status}`);
        }

        if (!contextRes.ok) {
          throw new Error(contextBody?.error || `HTTP ${contextRes.status}`);
        }

        const visibleProducts: VisibleProduct[] = Array.isArray(contextBody?.products) ? contextBody.products : [];
        if (!cancelled) {
          setModuleData(moduleBody as ModulePayload);
          setProducts(visibleProducts);
          setTargetProductId((current) => current ?? visibleProducts[0]?.id ?? null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [moduleKey]);

  useEffect(() => {
    if (!moduleData) {
      return;
    }

    setAnswers((current) => {
      const next = { ...current };
      let changed = false;

      for (const question of moduleData.questions) {
        if (typeof next[question.id] !== "number") {
          next[question.id] = 3;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [moduleData]);

  const selectedProduct = products.find((product) => product.id === targetProductId) ?? null;

  async function submitReview() {
    if (!moduleData || !selectedProduct || submitStatus === "submitting") {
      return;
    }

    setSubmitStatus("submitting");
    setSubmitError(null);

    try {
      const response = await fetch("/api/external-reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKey: moduleData.key,
          subjectCompanyId: selectedProduct.companyId,
          subjectProductId: selectedProduct.id,
          answers,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        const callbackUrl =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : `/reviews/${moduleData.key}`;
        window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error || body?.detail || `HTTP ${response.status}`);
      }

      setSubmissionId(typeof body?.submission?.id === "string" ? body.submission.id : null);
      setSubmitStatus("success");
    } catch (err: unknown) {
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 px-6 py-16 text-sm text-slate-500">Loading review entry...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-slate-50 px-6 py-16 text-sm text-rose-700">Error: {error}</div>;
  }

  if (!moduleData) {
    return <div className="min-h-screen bg-slate-50 px-6 py-16 text-sm text-slate-500">No review module found.</div>;
  }

  const totalPages = Math.max(1, Math.ceil(moduleData.questions.length / QUESTIONS_PER_PAGE));
  const pagedQuestions = moduleData.questions.slice(
    pageIndex * QUESTIONS_PER_PAGE,
    pageIndex * QUESTIONS_PER_PAGE + QUESTIONS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              External Review
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{moduleData.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Sponsored firm feedback flows through the external-review lane and stays separate from self-assessment.
            </p>
          </div>
          <Link href="/reviews" className="text-sm font-medium text-slate-700 underline underline-offset-4">
            Back to sponsor products
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <label htmlFor="subjectProductId" className="text-sm font-semibold text-slate-900">
            Sponsor-visible product
          </label>
          <select
            id="subjectProductId"
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            value={targetProductId ?? ""}
            onChange={(event) => setTargetProductId(event.target.value || null)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            {selectedProduct?.accessReason === "SPONSORED" ? "Sponsor visible" : "Owned"} product
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {pagedQuestions.map((question) => (
            <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Question {question.order}</div>
              <div className="mt-3 text-base font-semibold leading-7 text-slate-950">{question.prompt}</div>
              <div className="mt-5 grid gap-3">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={answers[question.id] ?? 3}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: Number(event.target.value) }))}
                  className="accent-slate-900"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>1 Low evidence</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                    Selected: {answers[question.id] ?? 3}
                  </span>
                  <span>5 Strong evidence</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            disabled={pageIndex === 0}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
          >
            Previous 5
          </button>
          <div className="text-sm text-slate-500">
            Page {pageIndex + 1} of {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
            disabled={pageIndex >= totalPages - 1}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
          >
            Next 5
          </button>
        </div>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={submitReview}
            disabled={!selectedProduct || submitStatus === "submitting"}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitStatus === "submitting" ? "Submitting..." : "Submit external review"}
          </button>

          {submitStatus === "success" ? (
            <div className="text-sm font-medium text-emerald-700">
              External review submitted{submissionId ? ` (${submissionId})` : ""}.
            </div>
          ) : null}
          {submitError ? <div className="text-sm font-medium text-rose-700">Submit error: {submitError}</div> : null}
        </div>
      </div>
    </div>
  );
}
