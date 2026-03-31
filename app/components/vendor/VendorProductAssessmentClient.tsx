"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  VENDOR_PRODUCT_TIER2_HOVER,
  VENDOR_PRODUCT_UTILITY_CAP,
  type UtilityDefinition,
} from "@/lib/vendorPat";
import {
  buildVendorProductAssessmentPlan,
  getVendorProductProfileQuestions,
  normalizeVendorProductProfileInput,
  type VendorProductProfileInput,
} from "@/lib/vendorProductAssessmentPlan";

type Props = {
  productId: string;
  productName: string;
  utilityCatalog: UtilityDefinition[];
  initialUtilityKeys: string[];
  initialAnswers: Record<string, number>;
  initialOpenEndedAnswers: Record<string, string>;
  initialProfile: VendorProductProfileInput;
};

export default function VendorProductAssessmentClient({
  productId,
  productName,
  utilityCatalog,
  initialUtilityKeys,
  initialAnswers,
  initialOpenEndedAnswers,
  initialProfile,
}: Props) {
  const router = useRouter();
  const [selectedUtilityKeys, setSelectedUtilityKeys] = useState<string[]>(initialUtilityKeys);
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [openEndedAnswers, setOpenEndedAnswers] = useState<Record<string, string>>(initialOpenEndedAnswers);
  const [profile, setProfile] = useState<VendorProductProfileInput>(initialProfile);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const profileQuestions = useMemo(() => getVendorProductProfileQuestions(), []);
  const assessmentPlan = useMemo(
    () => buildVendorProductAssessmentPlan(selectedUtilityKeys),
    [selectedUtilityKeys]
  );

  const activeQuestions = useMemo(
    () =>
      assessmentPlan.modules
        .filter((module) => module.kind === "utility")
        .flatMap((module) => module.questions),
    [assessmentPlan]
  );
  const scoredSections = useMemo(
    () =>
      assessmentPlan.modules
        .filter((module) => module.kind === "utility")
        .flatMap((module) =>
          module.sections.map((section) => ({
            ...section,
            moduleTitle: module.title,
            questions: module.questions.filter((question) => section.questionIds.includes(question.id)),
          }))
        ),
    [assessmentPlan]
  );
  const openEndedQuestions = useMemo(
    () =>
      assessmentPlan.modules
        .filter((module) => module.kind === "open-ended")
        .flatMap((module) => module.questions),
    [assessmentPlan]
  );

  const profileAnsweredCount = profileQuestions.filter((question) => {
    const fieldKey = question.fieldKey;
    return fieldKey ? profile[fieldKey].trim().length > 0 : false;
  }).length;
  const scoredAnsweredCount = activeQuestions.filter((question) => typeof answers[question.id] === "number").length;
  const openEndedAnsweredCount = openEndedQuestions.filter(
    (question) => openEndedAnswers[question.id]?.trim().length > 0
  ).length;
  const answeredCount = profileAnsweredCount + scoredAnsweredCount + openEndedAnsweredCount;
  const totalCount = profileQuestions.length + activeQuestions.length + openEndedQuestions.length;
  const progress = totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);

  function setScoredAnswer(questionId: string, nextValue: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: Number(nextValue),
    }));
  }

  function toggleUtility(nextKey: string) {
    setSelectedUtilityKeys((current) => {
      const selected = current.includes(nextKey);
      if (selected) {
        return current.filter((entry) => entry !== nextKey);
      }
      if (current.length >= VENDOR_PRODUCT_UTILITY_CAP) {
        return current;
      }
      return [...current, nextKey];
    });
  }

  async function submitAssessment() {
    if (selectedUtilityKeys.length === 0) {
      setSubmitState("error");
      setSubmitError("Select at least one utility before submitting.");
      return;
    }

    if (selectedUtilityKeys.length > VENDOR_PRODUCT_UTILITY_CAP) {
      setSubmitState("error");
      setSubmitError(`Select no more than ${VENDOR_PRODUCT_UTILITY_CAP} utilities in v1.`);
      return;
    }

    const normalizedProfile = normalizeVendorProductProfileInput(profile);
    const missingProfileField = profileQuestions.find((question) => {
      const fieldKey = question.fieldKey;
      return fieldKey ? normalizedProfile[fieldKey].length === 0 : false;
    });

    if (missingProfileField) {
      setSubmitState("error");
      setSubmitError(`Complete the product profile field "${missingProfileField.prompt}" before submitting.`);
      return;
    }

    if (answeredCount !== totalCount) {
      setSubmitState("error");
      setSubmitError(`Complete all ${totalCount} active questions before submitting.`);
      return;
    }

    setSubmitState("submitting");
    setSubmitError(null);

    const activeAnswerPayload = Object.fromEntries(
      activeQuestions.map((question) => [question.id, answers[question.id] ?? 1])
    );

    const response = await fetch("/api/vendor/product-assessment/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        utilityKeys: selectedUtilityKeys,
        profile: normalizedProfile,
        openEndedResponses: openEndedAnswers,
        answers: activeAnswerPayload,
      }),
    });

    if (response.status === 401) {
      window.location.assign(`/sign-in/vendor`);
      return;
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok !== true) {
      setSubmitState("error");
      setSubmitError(body?.error ?? body?.detail ?? `HTTP ${response.status}`);
      return;
    }

    router.push(`/vendor/product-insight/${productId}?submitted=1`);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-6">
        <div className="pat-label">Product profile</div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
          First 10 product-bio questions
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
          PAT stores these stable product profile fields separately from scored assessment answers so the product can be resumed, reviewed, and reused across future firm and individual product assessments.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {profileQuestions.map((question) => {
            const fieldKey = question.fieldKey;
            if (!fieldKey) {
              return null;
            }

            const value = profile[fieldKey];
            const isLongField =
              fieldKey === "productDescription" ||
              fieldKey === "positioning" ||
              fieldKey === "targetUseContext" ||
              fieldKey === "operatingModelFit" ||
              fieldKey === "integrationPosture";

            return (
              <label key={question.id} className={`grid gap-2 ${isLongField ? "lg:col-span-2" : ""}`}>
                <span className="text-sm font-semibold text-[var(--shell-ink)]">{question.prompt}</span>
                {isLongField ? (
                  <textarea
                    className="pat-textarea"
                    rows={3}
                    value={value}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        [fieldKey]: event.target.value,
                      }))
                    }
                  />
                ) : (
                  <input
                    className="pat-input"
                    value={value}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        [fieldKey]: event.target.value,
                      }))
                    }
                  />
                )}
              </label>
            );
          })}
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Utility declaration</div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Which utilities does {productName} solve?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
          This is the first step of the product assessment. PAT scales the question set based on declared utility coverage: 1 utility = 20 questions, up to a v1 cap of 4 utilities = 80 questions. Each utility runs as four 5-question sections so subcategory evidence stays visible.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {utilityCatalog.map((utility) => {
            const active = selectedUtilityKeys.includes(utility.key);
            const atCap = !active && selectedUtilityKeys.length >= VENDOR_PRODUCT_UTILITY_CAP;

            return (
              <button
                key={utility.key}
                type="button"
                disabled={atCap}
                onClick={() => toggleUtility(utility.key)}
                className={`rounded-[20px] border p-4 text-left ${
                  active
                    ? "border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.05)]"
                    : "border-[var(--shell-border)] bg-white"
                } ${atCap ? "opacity-55" : ""}`}
              >
                <div className="text-sm font-semibold text-[var(--shell-ink)]">{utility.label}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{utility.description}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Assessment overview</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Utilities selected: <span className="font-semibold text-[var(--shell-ink)]">{selectedUtilityKeys.length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Active questions: <span className="font-semibold text-[var(--shell-ink)]">{totalCount}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Progress: <span className="font-semibold text-[var(--shell-ink)]">{progress}%</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {selectedUtilityKeys.length === 0 ? (
          <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
            Select at least one utility to activate the product question bank.
          </div>
        ) : (
          scoredSections.map((section, sectionIndex) => (
            <div key={section.key} className="pat-card p-6">
              <div className="pat-label">
                Section {sectionIndex + 1} · {section.moduleTitle}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[var(--shell-ink)]">{section.title}</h3>
              <div className="mt-3 text-sm text-[var(--shell-muted)]">{section.description}</div>
              <div className="mt-6 grid gap-5">
                {section.questions.map((question, questionIndex) => (
                  <div key={question.id} className="pat-subpanel p-5">
                    <div className="pat-label">
                      {section.subcategoryTitle ?? question.subcategory?.label ?? "Question cluster"}
                    </div>
                    <h4 className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">
                      {questionIndex + 1}. {question.prompt}
                    </h4>
                    <div className="mt-5">
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={answers[question.id] ?? 1}
                        onInput={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                        onChange={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                        className="w-full accent-[var(--shell-accent)]"
                      />
                      <div className="mt-3 flex items-center justify-between text-xs text-[var(--shell-muted)]">
                        <span>Low confidence / weak fit</span>
                        <span className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-sm font-semibold text-[var(--shell-ink)]">
                          {answers[question.id] ?? 1}
                        </span>
                        <span>High confidence / strong fit</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-4">
        <div className="pat-card p-6">
          <div className="pat-label">Open-ended module</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Final 10 open-ended responses
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            These responses stay attached to the generated plan so PAT can preserve product nuance alongside the scored utility signal.
          </p>
        </div>
        {openEndedQuestions.map((question, index) => (
          <div key={question.id} className="pat-card p-6">
            <div className="pat-label">{question.section.title}</div>
            <div className="mt-3 text-sm text-[var(--shell-muted)]">{question.section.description}</div>
            <h3 className="mt-4 text-lg font-semibold text-[var(--shell-ink)]">
              {index + 1}. {question.prompt}
            </h3>
            <textarea
              className="pat-textarea mt-5"
              rows={4}
              value={openEndedAnswers[question.id] ?? ""}
              onChange={(event) =>
                setOpenEndedAnswers((current) => ({
                  ...current,
                  [question.id]: event.target.value,
                }))
              }
            />
          </div>
        ))}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Submit</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          PAT saves vendor product self-signal to the current product, persists the generated assessment plan for stable resume/review behavior, and stores the assessment record in the live submission system.
        </p>
        {submitError ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {submitError}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={submitState === "submitting"}
            onClick={() => void submitAssessment()}
            className="pat-button-primary"
          >
            {submitState === "submitting" ? "Submitting..." : "Submit product assessment"}
          </button>
          <div
            className="rounded-[18px] border border-[var(--shell-border)] bg-[rgba(79,191,226,0.12)] px-4 py-3 text-sm text-[var(--shell-muted)]"
            title={VENDOR_PRODUCT_TIER2_HOVER}
          >
            Elite membership remains staged behind locked blue cards until membership unlock is available.
          </div>
        </div>
      </section>
    </div>
  );
}
