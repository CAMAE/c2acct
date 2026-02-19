"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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
  const params = useParams<{ key: string }>();
  const moduleKey = useMemo(() => (params?.key ? String(params.key) : ""), [params]);

  const [data, setData] = useState<ModulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, any>>({});

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

  function setAnswer(qid: string, value: any) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
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
    </div>
  );
}
