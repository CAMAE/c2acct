"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { QuestionInputType } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  getDefaultAnswer,
  isAnswerPresent,
  type AssessmentModulePayload,
  type AssessmentQuestionRuntime,
  type NormalizedAnswer,
} from "@/lib/assessmentRuntime";

type Props = {
  moduleKey: string;
};

function renderQuestionInput(
  question: AssessmentQuestionRuntime,
  value: NormalizedAnswer | undefined,
  setAnswer: (value: NormalizedAnswer) => void
) {
  if (question.status === "unsupported") {
    return (
      <div style={{ color: "#7f1d1d", background: "#fff1f2", borderRadius: 12, padding: 12 }}>
        This question type is configured without the metadata the PAT engine requires yet.
      </div>
    );
  }

  if (question.inputType === QuestionInputType.SLIDER && question.validation.slider) {
    const slider = question.validation.slider;
    const selectedValue = typeof value === "number" ? value : slider.min;
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <input
          type="range"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={selectedValue}
          onChange={(event) => setAnswer(Number(event.target.value))}
        />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#475569", fontSize: 13 }}>
          <span>{slider.labels?.[String(slider.min)] ?? `Low (${slider.min})`}</span>
          <strong style={{ color: "#0f172a" }}>{selectedValue}</strong>
          <span>{slider.labels?.[String(slider.max)] ?? `High (${slider.max})`}</span>
        </div>
      </div>
    );
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
          style={inputStyle}
        />
      );
    }

    return (
      <textarea
        value={currentValue}
        placeholder={question.meta.placeholder ?? ""}
        onChange={(event) => setAnswer(event.target.value)}
        rows={4}
        style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
      />
    );
  }

  if (question.inputType === QuestionInputType.BOOLEAN) {
    const currentValue = typeof value === "boolean" ? value : false;
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Yes", nextValue: true },
          { label: "No", nextValue: false },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setAnswer(option.nextValue)}
            style={choiceButtonStyle(currentValue === option.nextValue)}
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
      <select value={currentValue} onChange={(event) => setAnswer(event.target.value)} style={inputStyle}>
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
      <div style={{ display: "grid", gap: 10 }}>
        {(question.validation.options ?? []).map((option) => {
          const checked = selectedValues.includes(option.value);
          return (
            <label
              key={option.value}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: checked ? "#eff6ff" : "#ffffff",
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  if (checked) {
                    setAnswer(selectedValues.filter((entry) => entry !== option.value));
                    return;
                  }

                  setAnswer([...selectedValues, option.value]);
                }}
              />
              <span>
                <strong style={{ display: "block", color: "#0f172a" }}>{option.label}</strong>
                {option.description ? <span style={{ color: "#475569" }}>{option.description}</span> : null}
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
        style={inputStyle}
      />
    );
  }

  return (
    <div style={{ color: "#7f1d1d", background: "#fff1f2", borderRadius: 12, padding: 12 }}>
      This question type is not yet enabled in the PAT engine.
    </div>
  );
}

export default function AssessmentModuleClient({ moduleKey }: Props) {
  const router = useRouter();
  const [data, setData] = useState<AssessmentModulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, NormalizedAnswer>>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      const nextAnswers = { ...currentAnswers };
      let changed = false;

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

  const questionsById = useMemo(() => {
    const entries: Array<[string, AssessmentQuestionRuntime]> =
      data?.questions.map((question) => [question.id, question]) ?? [];
    return new Map<string, AssessmentQuestionRuntime>(entries);
  }, [data]);

  function setAnswer(questionId: string, value: NormalizedAnswer) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: value }));
  }

  async function submitSurvey() {
    if (!data || submitStatus === "submitting") {
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
        window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error || body?.detail || `HTTP ${response.status}`);
      }

      setSubmitStatus("success");
      router.push("/results");
    } catch (submitFailure) {
      setSubmitStatus("error");
      setSubmitError(submitFailure instanceof Error ? submitFailure.message : "Submit failed");
    }
  }

  if (loading) {
    return <div style={pageContainerStyle}>Loading assessment module...</div>;
  }

  if (error) {
    return (
      <div style={pageContainerStyle}>
        <div style={{ color: "#991b1b" }}>Module load failed: {error}</div>
      </div>
    );
  }

  if (!data) {
    return <div style={pageContainerStyle}>Assessment module is unavailable.</div>;
  }

  const unsupportedQuestions = data.questions.filter((question) => question.status === "unsupported");

  return (
    <div style={pageContainerStyle}>
      <header style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569" }}>
          PAT Assessment Module
        </div>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 4vw, 3rem)", color: "#0f172a" }}>{data.title}</h1>
        <div style={{ color: "#475569" }}>
          {data.scope} module · v{data.version}
        </div>
        {data.description ? <p style={{ margin: 0, color: "#334155", maxWidth: 720 }}>{data.description}</p> : null}
      </header>

      {(data.stagedFeatures.branching || data.stagedFeatures.roleVariants) ? (
        <div style={calloutStyle}>
          {data.stagedFeatures.branching ? "Branching metadata is present and reserved for phase 2 runtime control. " : ""}
          {data.stagedFeatures.roleVariants ? "Role variant metadata is present and reserved for phase 2 module resolution." : ""}
        </div>
      ) : null}

      {unsupportedQuestions.length > 0 ? (
        <div style={{ ...calloutStyle, background: "#fff7ed", borderColor: "#fdba74", color: "#9a3412" }}>
          {unsupportedQuestions.length} question{unsupportedQuestions.length === 1 ? "" : "s"} need metadata repair before
          they can render fully.
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 18, marginTop: 28 }}>
        {data.sections.map((section, sectionIndex) => (
          <section
            key={section.key}
            style={{
              display: "grid",
              gap: 16,
              padding: 20,
              borderRadius: 20,
              border: "1px solid #dbe4ee",
              background: "#ffffff",
              boxShadow: "0 12px 36px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
                Section {sectionIndex + 1}
              </div>
              <h2 style={{ margin: 0, color: "#0f172a" }}>{section.title}</h2>
              {section.description ? <p style={{ margin: 0, color: "#475569" }}>{section.description}</p> : null}
            </div>

            {section.questionIds.map((questionId) => {
              const question = questionsById.get(questionId);
              if (!question) {
                return null;
              }

              const value = answers[question.id];
              const hasAnswer = isAnswerPresent(value);
              return (
                <article
                  key={question.id}
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: 18,
                    borderRadius: 16,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {question.required ? "Required" : "Optional"}
                      {question.meta.groupKey ? ` · ${question.meta.groupKey}` : ""}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{question.prompt}</div>
                    {question.meta.helpText ? <div style={{ color: "#475569" }}>{question.meta.helpText}</div> : null}
                    {question.meta.branching ? (
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        Branching rule staged for phase 2: {question.meta.branching.visibleWhen?.questionKey ?? "conditional"}
                      </div>
                    ) : null}
                  </div>

                  {renderQuestionInput(question, value, (nextValue) => setAnswer(question.id, nextValue))}

                  <div style={{ fontSize: 13, color: hasAnswer ? "#166534" : "#64748b" }}>
                    {hasAnswer ? "Response captured" : "Awaiting response"}
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
        <button
          type="button"
          onClick={submitSurvey}
          disabled={submitStatus === "submitting"}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "14px 18px",
            fontWeight: 700,
            color: "#ffffff",
            background: submitStatus === "submitting" ? "#64748b" : "#0f172a",
            cursor: submitStatus === "submitting" ? "not-allowed" : "pointer",
          }}
        >
          {submitStatus === "submitting" ? "Submitting assessment..." : "Submit assessment"}
        </button>

        {submitError ? <div style={{ color: "#991b1b" }}>Submit error: {submitError}</div> : null}
      </div>
    </div>
  );
}

const pageContainerStyle: CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "32px 20px 64px",
};

const calloutStyle: CSSProperties = {
  marginTop: 20,
  padding: 14,
  borderRadius: 14,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
};

function choiceButtonStyle(selected: boolean): CSSProperties {
  return {
    borderRadius: 999,
    border: selected ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
    background: selected ? "#dbeafe" : "#ffffff",
    color: selected ? "#1d4ed8" : "#0f172a",
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
  };
}
