"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  key: string;
  prompt: string;
  inputType: "SLIDER";
  order: number;
};

type ModulePayload = {
  id: string;
  key: string;
  title: string;
  questions: Question[];
};

export default function SurveyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [module, setModule] = useState<ModulePayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/survey/module/firm_alignment_v1", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load module");
        const data: ModulePayload = await res.json();
        setModule(data);

        const init: Record<string, number> = {};
        (data.questions || [])
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .forEach((q) => (init[q.id] = 3));
        setAnswers(init);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleChange(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);

    try {
      const payload = {
        moduleKey: "firm_alignment_v1",
        companyId: "demo_company",
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value,
        })),
      };

      const res = await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Submit failed: ${res.status} ${txt}`);
      }

      router.push("/results");
    } catch (e) {
      console.error(e);
      alert("Submit failed. Check console.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">{module?.title ?? "Survey Module"}</h1>

      <form
        className="mt-6 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        {(module?.questions ?? [])
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((question) => {
            const value = answers[question.id] ?? 3;

            return (
              <div key={question.id} className="rounded border p-4">
                <label htmlFor={question.id} className="mb-2 block text-sm font-medium">
                  {question.prompt}
                </label>
                <input
                  id={question.id}
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={value}
                  onChange={(event) => {
                    handleChange(question.id, Number(event.target.value));
                  }}
                  className="w-full"
                />
                <div className="mt-1 text-sm opacity-70">Value: {value}</div>
              </div>
            );
          })}

        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            void handleSubmit();
          }}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </main>
  );
}



