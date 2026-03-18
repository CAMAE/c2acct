"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type Question = {
  id: string;
  key: string;
  prompt: string;
  inputType: "SLIDER";
  weight: number;
  order: number;
  required?: boolean;
  meta?: Record<string, unknown> | null;
};

type ModulePayload = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  scope: string;
  version: number;
  questions: Question[];
};

function getDomainLabel(question: Question) {
  const raw = question.meta && typeof question.meta.domainKey === "string" ? question.meta.domainKey : null;
  if (!raw) {
    return null;
  }

  return raw
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function Page() {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const moduleKey = useMemo(() => (params?.key ? String(params.key) : ""), [params]);

  const [data, setData] = useState<ModulePayload | null>(null);
  const searchParams = useSearchParams();
  const requestedProductId = useMemo(() => {
    const raw = searchParams?.get("productId") ?? "";
    const normalized = raw.trim();
    return normalized.length > 0 ? normalized : null;
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const QUESTIONS_PER_PAGE = 5;

  useEffect(() => {
    if (!moduleKey) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/survey/module/${moduleKey}`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.detail || body?.error || `HTTP ${res.status}`);

        if (!cancelled) setData(body as ModulePayload);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [moduleKey]);

  useEffect(() => {
    if (!data) return;

    setAnswers((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const q of data.questions) {
        if (q.inputType === "SLIDER" && typeof next[q.id] !== "number") {
          next[q.id] = 3;
          changed = true;
        }
      }

      return changed ? next : prev;
    });

    if (requestedProductId && data.scope === "PRODUCT") {
      setTargetProductId((prev) => (prev === requestedProductId ? prev : requestedProductId));
    }
  }, [data, requestedProductId]);

  function setAnswer(qid: string, value: number) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function submitAssessment() {
    if (!data || submitStatus === "submitting") return;

    setSubmitStatus("submitting");
    setSubmitError(null);

    try {
      const payload: {
        moduleKey: string;
        answers: Record<string, number>;
        targetProductId?: string | null;
      } = {
        moduleKey: data.key,
        answers,
      };

      if (data.scope === "PRODUCT") {
        payload.targetProductId = targetProductId;
      }

      const res = await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        const callbackUrl =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : `/survey/${data.key}`;
        window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      const body = await res.json().catch(() => ({}));

      if (res.status === 403) {
        throw new Error("Signed in, but your account is not authorized to submit for a company.");
      }

      if (res.status === 400 || res.status === 404) {
        throw new Error(body?.error || body?.detail || `HTTP ${res.status}`);
      }

      if (!res.ok || body?.ok !== true) {
        throw new Error(body?.error || body?.detail || `HTTP ${res.status}`);
      }

      setSubmitStatus("success");
      const resultsPath = targetProductId
        ? `/results?productId=${encodeURIComponent(targetProductId)}`
        : "/results";
      router.push(resultsPath);
    } catch (e: any) {
      setSubmitStatus("error");
      setSubmitError(e?.message ?? "Submit failed.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Loading module...</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
          <div className="text-sm font-medium text-rose-700">Error: {err}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-sm font-medium text-slate-500">No module data available.</div>
        </div>
      </div>
    );
  }

  const isProductScope = data.scope === "PRODUCT";
  const isBetaModule = data.key !== "firm_alignment_v1" && data.scope === "FIRM";
  const totalPages = Math.max(1, Math.ceil(data.questions.length / QUESTIONS_PER_PAGE));
  const pagedQuestions = data.questions.slice(
    pageIndex * QUESTIONS_PER_PAGE,
    pageIndex * QUESTIONS_PER_PAGE + QUESTIONS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {isProductScope ? "Product assessment" : isBetaModule ? "Beta firm assessment" : "Baseline firm assessment"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  v{data.version}
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{data.title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {data.description ?? "Complete each question to generate the next results snapshot."}
              </p>
            </div>
            <div className="min-w-[240px] rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">Question count</div>
              <div className="mt-2">{data.questions.length} active questions</div>
              <div className="mt-1">Page {pageIndex + 1} of {totalPages}</div>
              <div className="mt-1 truncate" title={data.key}>
                Module key: {data.key}
              </div>
            </div>
          </div>

          {isProductScope ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <label htmlFor="targetProductId" className="text-sm font-semibold text-slate-900">
                Product context
              </label>
              <p className="mt-1 text-sm text-slate-600">Use the same product context you expect to review on the Results and Insights pages.</p>
              <input
                id="targetProductId"
                type="text"
                value={targetProductId ?? ""}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  setTargetProductId(next.length > 0 ? next : null);
                }}
                placeholder="Enter product id"
                title="Enter or confirm the product context for this Assessment. Submitting with this value sends the Assessment into the matching product-scoped results and insights path."
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
          ) : null}

          <div className="mt-8 grid gap-4">
            {pagedQuestions.map((q) => {
              const val = answers[q.id];
              const domainLabel = getDomainLabel(q);

              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Question {q.order}
                        </span>
                        {domainLabel ? (
                          <span
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                            title="This label shows the internal grouping used for the current Assessment module. It helps explain how the question fits into the broader staged modular structure."
                          >
                            {domainLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 text-base font-semibold leading-7 text-slate-950">{q.prompt}</div>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {q.required === false ? "Optional" : "Required"}
                    </div>
                  </div>

                  <div className="mt-5">
                    {q.inputType === "SLIDER" ? (
                      <div className="grid gap-3">
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={typeof val === "number" ? val : 3}
                          onChange={(e) => setAnswer(q.id, Number(e.target.value))}
                          title="Adjust your answer on the current Assessment scale from 1 to 5. Moving this control changes the value that will be submitted for this question."
                          className="accent-slate-900"
                        />
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>1 | Low / limited evidence</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                            Selected: {typeof val === "number" ? val : 3}
                          </span>
                          <span>5 | High / strong evidence</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
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
              Showing questions {pageIndex * QUESTIONS_PER_PAGE + 1}-{Math.min((pageIndex + 1) * QUESTIONS_PER_PAGE, data.questions.length)} of {data.questions.length}
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

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Response preview</div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-4 text-xs text-slate-700">
              {JSON.stringify(answers, null, 2)}
            </pre>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={submitAssessment}
              disabled={loading || submitStatus === "submitting"}
              title="Submit this Assessment and generate the next results snapshot for the current context. If the submission succeeds, you will be taken directly into Results and then on to Insights."
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitStatus === "submitting" ? "Submitting..." : "Submit assessment"}
            </button>

            {submitStatus === "submitting" ? (
              <div className="text-sm text-slate-500">Sending your Assessment responses and generating the next results snapshot...</div>
            ) : null}

            {submitError ? <div className="text-sm font-medium text-rose-700">Submit error: {submitError}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
