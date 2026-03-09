"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Question = {
  id: string;
  key: string;
  prompt: string;
  inputType: "SLIDER" | "SELECT" | "MULTISELECT" | "BOOLEAN" | "NUMBER" | "TEXT";
  weight: number;
  order: number;
  required?: boolean;
  meta?: any;
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

export default function Page() {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const moduleKey = useMemo(() => (params?.key ? String(params.key) : ""), [params]);

  const [data, setData] = useState<ModulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  }, [data]);

  function setAnswer(qid: string, value: any) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function submitSurvey() {
    if (!data || submitStatus === "submitting") return;

    setSubmitStatus("submitting");
    setSubmitError(null);

    try {
      const payload: {
        moduleKey: string;
        answers: Record<string, any>;
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

      // Preserve expected success contract read: { ok, submission, milestoneReached }
      void body?.submission;
      void body?.milestoneReached;

      setSubmitStatus("success");
      router.push("/results");
    } catch (e: any) {
      setSubmitStatus("error");
      setSubmitError(e?.message ?? "Submit failed.");
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (err) return <div style={{ padding: 24, color: "crimson" }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 24 }}>No data.</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{data.title}</h1>
      <div style={{ opacity: 0.7, marginTop: 6 }}>
        {data.scope} · v{data.version} · {data.key}
      </div>

      {data.scope === "PRODUCT" ? (
        <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
          <label htmlFor="targetProductId" style={{ fontWeight: 600 }}>
            Target Product ID
          </label>
          <input
            id="targetProductId"
            type="text"
            value={targetProductId ?? ""}
            onChange={(e) => {
              const next = e.target.value.trim();
              setTargetProductId(next.length > 0 ? next : null);
            }}
            placeholder="Enter product id"
            style={{
              border: "1px solid #00000022",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          />
        </div>
      ) : null}

      <div style={{ marginTop: 22, display: "grid", gap: 16 }}>
        {data.questions.map((q) => {
          const val = answers[q.id];

          return (
            <div key={q.id} style={{ border: "1px solid #00000022", borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 600 }}>
                {q.order}. {q.prompt}
              </div>

              <div style={{ marginTop: 12 }}>
                {q.inputType === "SLIDER" ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={typeof val === "number" ? val : 3}
                      onChange={(e) => setAnswer(q.id, Number(e.target.value))}
                    />
                    <div style={{ opacity: 0.75 }}>Selected: {typeof val === "number" ? val : 3}</div>
                  </div>
                ) : q.inputType === "TEXT" ? (
                  <textarea
                    value={typeof val === "string" ? val : ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    rows={4}
                    style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #00000022" }}
                  />
                ) : (
                  <div style={{ opacity: 0.7 }}>Unsupported inputType: {q.inputType}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <pre style={{ marginTop: 20, padding: 12, background: "#00000008", borderRadius: 10, overflowX: "auto" }}>
        {JSON.stringify(answers, null, 2)}
      </pre>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <button
          type="button"
          onClick={submitSurvey}
          disabled={loading || submitStatus === "submitting"}
          style={{
            border: "1px solid #00000022",
            borderRadius: 10,
            padding: "10px 14px",
            fontWeight: 600,
            cursor: loading || submitStatus === "submitting" ? "not-allowed" : "pointer",
            opacity: loading || submitStatus === "submitting" ? 0.6 : 1,
          }}
        >
          {submitStatus === "submitting" ? "Submitting..." : "Submit Survey"}
        </button>

        {submitStatus === "submitting" ? (
          <div style={{ opacity: 0.75 }}>Sending your responses...</div>
        ) : null}

        {submitError ? <div style={{ color: "crimson" }}>Submit error: {submitError}</div> : null}
      </div>
    </div>
  );
}
