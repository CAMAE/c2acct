"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import DraftSavedIndicator, { type DraftSaveState } from "@/app/components/assessment/DraftSavedIndicator";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import { sliderValueFromPointer } from "@/lib/scoreSlider";
import {
  VENDOR_PRODUCT_TIER2_HOVER,
  type UtilityDefinition,
} from "@/lib/vendorPat";
import { formatFeatureCountLabel } from "@/lib/displayCopy";
import {
  buildVendorProductAssessmentPagePlan,
  buildVendorProductAssessmentPlan,
  getVendorProductAssessmentQuestionLoad,
  normalizeVendorProductProfileInput,
  type VendorProductAssessmentPageEntry,
  type VendorProductProfileInput,
} from "@/lib/vendorProductAssessmentPlan";
import type { ProductAssessmentQuestion } from "@/lib/vendorProductQuestionBank";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
} from "@/lib/productAssessmentRuntime";

type Props = {
  productId: string;
  productName: string;
  productWebsite: string | null;
  latestScore: number | null;
  utilityCatalog: UtilityDefinition[];
  initialUtilityKeys: string[];
  initialAnswers: Record<string, number>;
  initialOpenEndedAnswers: Record<string, string>;
  initialProfile: VendorProductProfileInput;
  /** Resume position from a saved draft (1-based page). Defaults to page 1. */
  initialCurrentPage?: number;
};

type QuestionGroup = {
  key: string;
  title: string;
  description: string;
  label: string;
  questions: ProductAssessmentQuestion[];
};

function clampPageIndex(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function isQuestionEntry(
  entry: VendorProductAssessmentPageEntry
): entry is Extract<VendorProductAssessmentPageEntry, { question: ProductAssessmentQuestion }> {
  return entry.kind !== "utility-declaration";
}

function groupQuestionsBySection(questions: ProductAssessmentQuestion[]) {
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
      label:
        question.moduleKind === "utility"
          ? question.utilityLabel ?? question.section.utilityLabel ?? "Feature scoring"
          : question.moduleKind === "open-ended"
            ? "Open-ended module"
            : "Product profile",
      questions: [question],
    });
  });

  return Array.from(groups.values());
}

export default function VendorProductAssessmentClient({
  productId,
  productName,
  productWebsite,
  latestScore,
  utilityCatalog,
  initialUtilityKeys,
  initialAnswers,
  initialOpenEndedAnswers,
  initialProfile,
  initialCurrentPage,
}: Props) {
  const router = useRouter();
  const topCardRef = useRef<HTMLElement | null>(null);
  const hasMountedRef = useRef(false);
  const autosaveMountRef = useRef(false);
  const [selectedUtilityKeys, setSelectedUtilityKeys] = useState<string[]>(initialUtilityKeys);
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [openEndedAnswers, setOpenEndedAnswers] = useState<Record<string, string>>(initialOpenEndedAnswers);
  const [profile, setProfile] = useState<VendorProductProfileInput>(initialProfile);
  const [currentPageIndex, setCurrentPageIndex] = useState(initialCurrentPage ?? 1);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<DraftSaveState>("idle");
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);

  const assessmentPlan = useMemo(
    () =>
      buildVendorProductAssessmentPlan(selectedUtilityKeys, {
        profile,
        answers,
      }),
    [answers, profile, selectedUtilityKeys]
  );
  const pagePlan = useMemo(
    () => buildVendorProductAssessmentPagePlan({ assessmentPlan }),
    [assessmentPlan]
  );
  const questionLoad = useMemo(
    () => getVendorProductAssessmentQuestionLoad(pagePlan),
    [pagePlan]
  );

  const profileQuestions = pagePlan.profileQuestions;
  const activeQuestions = pagePlan.scoredQuestions;
  const openEndedQuestions = pagePlan.openEndedQuestions;
  const pages = pagePlan.pages;
  const totalPages = pages.length;
  const visibleCurrentPageIndex = clampPageIndex(currentPageIndex, totalPages);
  const currentPage = pages[visibleCurrentPageIndex - 1] ?? pages[0]!;
  const currentPageQuestionEntries = currentPage.entries.filter(isQuestionEntry);
  const currentPageQuestions = currentPageQuestionEntries.map((entry) => entry.question);
  const currentPageGroups = useMemo(
    () => groupQuestionsBySection(currentPageQuestions),
    [currentPageQuestions]
  );
  const questionNumberById = useMemo(
    () =>
      new Map(currentPageQuestions.map((question, index) => [question.id, index + 1])),
    [currentPageQuestions]
  );

  function isQuestionAnswered(question: ProductAssessmentQuestion) {
    if (question.moduleKind === "general") {
      const fieldKey = question.fieldKey;
      return fieldKey ? profile[fieldKey].trim().length > 0 : false;
    }

    if (question.moduleKind === "utility") {
      return typeof answers[question.id] === "number";
    }

    return openEndedAnswers[question.id]?.trim().length > 0;
  }

  const profileAnsweredCount = profileQuestions.filter((question) => isQuestionAnswered(question)).length;
  const scoredAnsweredCount = activeQuestions.filter((question) => isQuestionAnswered(question)).length;
  const openEndedAnsweredCount = openEndedQuestions.filter((question) => isQuestionAnswered(question)).length;
  const answeredCount = profileAnsweredCount + scoredAnsweredCount + openEndedAnsweredCount;
  const totalCount = profileQuestions.length + activeQuestions.length + openEndedQuestions.length;
  const progress = totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);

  const currentPageQuestionCount = currentPage.questionCount;
  const currentPageAnsweredCount = currentPageQuestions.filter((question) => isQuestionAnswered(question)).length;
  const currentPageIncludesUtilityDeclaration = currentPage.entries.some(
    (entry) => entry.kind === "utility-declaration"
  );
  const currentPageUtilityReady = !currentPageIncludesUtilityDeclaration || selectedUtilityKeys.length > 0;
  const questionLoadSafe = questionLoad.safeForBrowserSession;
  const currentPageMissingCount =
    currentPageQuestionCount -
    currentPageAnsweredCount +
    (currentPageUtilityReady ? 0 : 1);
  const canAdvanceFromCurrentPage = questionLoadSafe && currentPageMissingCount === 0;
  const canSubmitAssessment =
    questionLoadSafe &&
    selectedUtilityKeys.length > 0 &&
    profileAnsweredCount === profileQuestions.length &&
    scoredAnsweredCount === activeQuestions.length &&
    openEndedAnsweredCount === openEndedQuestions.length;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    topCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [visibleCurrentPageIndex]);

  function setScoredAnswer(questionId: string, nextValue: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: Number(nextValue),
    }));
  }

  // Score slider: drive value from the pointer's X position so a track click
  // lands on the clicked value (the native track-click was jumping to max
  // regardless of position). Keyboard stays on the native onChange path.
  function setScoredAnswerFromPointer(
    questionId: string,
    event: React.PointerEvent<HTMLInputElement>
  ) {
    setScoredAnswer(
      questionId,
      String(sliderValueFromPointer(event, PRODUCT_ASSESSMENT_SCALE_MIN, PRODUCT_ASSESSMENT_SCALE_MAX))
    );
  }

  function getScoredAnswerBadge(questionId: string) {
    const value = answers[questionId];
    return typeof value === "number" ? String(value) : "Not answered";
  }

  function hasScoredAnswer(questionId: string) {
    return typeof answers[questionId] === "number";
  }

  function toggleUtility(nextKey: string) {
    setSelectedUtilityKeys((current) => {
      const selected = current.includes(nextKey);
      if (selected) {
        return current.filter((entry) => entry !== nextKey);
      }
      return [...current, nextKey];
    });
  }

  function goToPage(nextPage: number) {
    setCurrentPageIndex(clampPageIndex(nextPage, totalPages));
    setPageError(null);
    setSubmitError(null);
  }

  // Persist the full in-progress state server-side so a reload resumes exactly
  // here (P1 fix — the assessment used to keep everything in client state only).
  const saveDraft = useCallback(
    async (pageOverride?: number) => {
      setDraftState("saving");
      try {
        await fetch("/api/vendor/product-assessment/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            utilityKeys: selectedUtilityKeys,
            profile: normalizeVendorProductProfileInput(profile),
            openEndedResponses: openEndedAnswers,
            answers,
            currentPage: clampPageIndex(pageOverride ?? visibleCurrentPageIndex, totalPages),
            totalPages,
          }),
        });
        // R9: surface autosave so persistence is visible ("Draft saved · HH:MM").
        setDraftSavedAt(new Date());
        setDraftState("saved");
      } catch {
        // Best-effort autosave — a failed draft write never blocks the user.
        setDraftState("error");
      }
    },
    [answers, openEndedAnswers, productId, profile, selectedUtilityKeys, totalPages, visibleCurrentPageIndex]
  );

  // Debounced per-answer autosave; skips the mount so loading a draft doesn't
  // immediately re-POST it.
  useEffect(() => {
    if (!autosaveMountRef.current) {
      autosaveMountRef.current = true;
      return;
    }
    if (submitState === "submitting") {
      return;
    }
    const timeout = window.setTimeout(() => {
      void saveDraft();
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [answers, openEndedAnswers, profile, selectedUtilityKeys, saveDraft, submitState]);

  function continueToNextPage() {
    if (!questionLoadSafe) {
      setPageError(
        `This feature selection generates ${questionLoad.totalQuestionCount} questions, above the ${questionLoad.maxBrowserSessionQuestionCount}-question browser-session guard. Narrow the feature scope before continuing.`
      );
      return;
    }

    if (!canAdvanceFromCurrentPage) {
      setPageError(
        currentPageIncludesUtilityDeclaration && selectedUtilityKeys.length === 0
          ? "Complete the first page and declare at least one feature before PAT opens the next page."
          : `Complete the remaining ${currentPageMissingCount} required item${currentPageMissingCount === 1 ? "" : "s"} on this page before continuing.`
      );
      return;
    }

    const nextPage = visibleCurrentPageIndex + 1;
    // Persist before advancing so a reload resumes on the page we just moved to
    // with the answers intact — the core P1 guarantee.
    void saveDraft(nextPage);
    goToPage(nextPage);
  }

  async function submitAssessment() {
    if (!questionLoadSafe) {
      setSubmitState("error");
      setSubmitError(
        `This feature selection generates ${questionLoad.totalQuestionCount} questions, above the ${questionLoad.maxBrowserSessionQuestionCount}-question browser-session guard. Narrow the feature scope before submitting.`
      );
      return;
    }

    if (selectedUtilityKeys.length === 0) {
      setSubmitState("error");
      setSubmitError("Select at least one feature before submitting.");
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
    setPageError(null);

    const activeAnswerPayload = Object.fromEntries(
      activeQuestions.map((question) => [question.id, answers[question.id] ?? PRODUCT_ASSESSMENT_SCALE_MIN])
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
      window.location.assign("/sign-in/vendor");
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
      <section ref={topCardRef} className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <PatAudienceTitle
          as="h1"
          title={`Vendor product assessment for ${productName}`}
          audienceTerms={["Vendor"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Tell PAT what this product does, work through the paced assessment pages, and submit the finished response set for this product&apos;s current-state signal.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Website: <span className="font-semibold text-[var(--shell-ink)]">{productWebsite ?? "--"}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Latest score: <span className="font-semibold text-[var(--shell-ink)]">{latestScore ?? "--"}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Page: <span className="font-semibold text-[var(--shell-ink)]">{visibleCurrentPageIndex} / {totalPages}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Progress: <strong className="font-semibold text-[var(--shell-ink)]">{progress}%</strong>
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="pat-soft-panel p-5">
            <div className="pat-label">Progress</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {currentPage.title}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{currentPage.description}</p>
            <div className="mt-4 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
              <div>
                Current page completion:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">
                  {currentPageAnsweredCount} of {currentPageQuestionCount}
                </span>
              </div>
              <div>
                Total answered:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">
                  {answeredCount} of {totalCount}
                </span>
              </div>
              <div>
                Features selected:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">
                  {formatFeatureCountLabel(selectedUtilityKeys.length)}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <DraftSavedIndicator state={draftState} savedAt={draftSavedAt} />
            </div>
          </section>
          <section className="pat-soft-panel p-5">
            <div className="pat-label">Help</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Quick tutorial
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Move through the assessment one page at a time, answer each question honestly, and use the progress panel to keep track of where this product stands.
            </p>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
              <div>
                <span className="font-semibold text-[var(--shell-ink)]">How to take it:</span> complete the product profile,
                confirm the right features, answer the scored pages, then finish the written follow-ups.
              </div>
              <div>
                <span className="font-semibold text-[var(--shell-ink)]">Why to take it:</span> your responses give PAT a
                current-state view of this product that can support the current vendor product-intelligence flow.
              </div>
              <div>
                <span className="font-semibold text-[var(--shell-ink)]">What happens next:</span> after submission, PAT
                saves the assessment to this product and uses it as the current vendor product signal.
              </div>
            </div>
          </section>
        </div>
      </section>

      {!questionLoadSafe ? (
        <section className="pat-card border-amber-200 bg-amber-50/90 p-6 text-sm leading-6 text-amber-950">
          <div className="pat-label">Feature scale guard</div>
          <p className="mt-3">
            This feature selection generates {questionLoad.totalQuestionCount} questions across {questionLoad.pageCount} pages, above the {questionLoad.maxBrowserSessionQuestionCount}-question browser-session guard. Narrow the feature scope before continuing so the assessment remains usable in one pilot QA session.
          </p>
        </section>
      ) : null}

      {currentPage.kind === "profile" ? (
        <div className="space-y-4">
          <section className="pat-card p-6">
            <div className="pat-label">Product profile</div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              First 10 product profile questions
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Start by describing the product clearly so PAT can interpret the rest of the assessment in the right context.
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
            <div className="pat-label">Feature declaration</div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Which features does {productName} solve?
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Choose the features that best match what this product actually supports so PAT can open the right assessment path.
            </p>
            <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Current declared scope: {formatFeatureCountLabel(selectedUtilityKeys.length)}.
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {utilityCatalog.map((utility) => {
                const active = selectedUtilityKeys.includes(utility.key);

                return (
                  <label
                    key={utility.key}
                    className={`rounded-[20px] border p-4 text-left ${
                      active
                        ? "border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.05)]"
                        : "border-[var(--shell-border)] bg-white"
                    } cursor-pointer`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={active}
                      aria-label={utility.label}
                      onChange={() => toggleUtility(utility.key)}
                    />
                    <div className="text-sm font-semibold text-[var(--shell-ink)]">{utility.label}</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{utility.description}</div>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <section className="space-y-4">
          {currentPageGroups.map((group) => (
            <div key={group.key} className="pat-card p-6">
              <div className="pat-label">{group.label}</div>
              <h3 className="mt-4 text-xl font-semibold text-[var(--shell-ink)]">{group.title}</h3>
              <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{group.description}</div>
              <div className="mt-6 grid gap-5">
                {group.questions.map((question) =>
                  question.moduleKind === "utility" ? (
                    <div key={question.id} className="pat-subpanel p-5">
                      <div className="pat-label">
                        {question.subcategory?.label ?? question.section.subcategoryTitle ?? "Question cluster"}
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">
                        {questionNumberById.get(question.id) ?? 1}. {question.prompt}
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
                            setScoredAnswerFromPointer(question.id, event);
                          }}
                          onPointerMove={(event) => {
                            if ((event.buttons & 1) === 1) {
                              setScoredAnswerFromPointer(question.id, event);
                            }
                          }}
                          className={`w-full ${hasScoredAnswer(question.id) ? "accent-[var(--shell-accent)]" : "pat-range-unanswered"}`}
                          aria-describedby={`${question.id}-range-state`}
                        />
                        <div className="mt-3 flex items-center justify-between text-xs text-[var(--shell-muted)]">
                          <span>0 = Low confidence / weak fit</span>
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
                          <span>5 = High confidence / strong fit</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={question.id} className="pat-subpanel p-5">
                      <div className="pat-label">{group.title}</div>
                      <h4 className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">
                        {questionNumberById.get(question.id) ?? 1}. {question.prompt}
                      </h4>
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
                  )
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="pat-card p-6">
        <div className="pat-label">{visibleCurrentPageIndex < totalPages ? "Next" : "Submit"}</div>
        <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">
          {visibleCurrentPageIndex < totalPages ? "Next" : "Submit"}
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          {visibleCurrentPageIndex < totalPages
            ? "Continue to next page of the assessment"
            : "Submit the completed assessment so PAT can save the current vendor product signal for this product."}
        </p>

        {pageError ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {pageError}
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {submitError}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {visibleCurrentPageIndex > 1 ? (
            <button type="button" onClick={() => goToPage(visibleCurrentPageIndex - 1)} className="pat-button-secondary">
              Back a page
            </button>
          ) : null}

          {visibleCurrentPageIndex < totalPages ? (
            <button type="button" onClick={continueToNextPage} className="pat-button-primary">
              Continue to next page
            </button>
          ) : (
            <button
              type="button"
              disabled={submitState === "submitting" || !canSubmitAssessment}
              onClick={() => void submitAssessment()}
              className="pat-button-primary"
            >
              {submitState === "submitting" ? "Submitting..." : "Submit product assessment"}
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--shell-muted)]">
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-[rgba(79,191,226,0.12)] px-4 py-3" title={VENDOR_PRODUCT_TIER2_HOVER}>
            Elite membership remains staged behind locked blue cards until membership unlock is available.
          </div>
        </div>
      </section>
    </div>
  );
}
