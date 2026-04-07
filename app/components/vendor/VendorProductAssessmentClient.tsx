"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  VENDOR_PRODUCT_TIER2_HOVER,
  VENDOR_PRODUCT_UTILITY_CAP,
  type UtilityDefinition,
} from "@/lib/vendorPat";
import {
  buildVendorProductAssessmentPagePlan,
  buildVendorProductAssessmentPlan,
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
  utilityCatalog: UtilityDefinition[];
  initialUtilityKeys: string[];
  initialAnswers: Record<string, number>;
  initialOpenEndedAnswers: Record<string, string>;
  initialProfile: VendorProductProfileInput;
  productsHref: string;
  productInsightHref: string;
  helpHref: string;
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
          ? question.utilityLabel ?? question.section.utilityLabel ?? "Utility scoring"
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
  utilityCatalog,
  initialUtilityKeys,
  initialAnswers,
  initialOpenEndedAnswers,
  initialProfile,
  productsHref,
  productInsightHref,
  helpHref,
}: Props) {
  const router = useRouter();
  const [selectedUtilityKeys, setSelectedUtilityKeys] = useState<string[]>(initialUtilityKeys);
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [openEndedAnswers, setOpenEndedAnswers] = useState<Record<string, string>>(initialOpenEndedAnswers);
  const [profile, setProfile] = useState<VendorProductProfileInput>(initialProfile);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const assessmentPlan = useMemo(
    () => buildVendorProductAssessmentPlan(selectedUtilityKeys),
    [selectedUtilityKeys]
  );
  const pagePlan = useMemo(
    () => buildVendorProductAssessmentPagePlan({ assessmentPlan }),
    [assessmentPlan]
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
  const currentPageMissingCount =
    currentPageQuestionCount -
    currentPageAnsweredCount +
    (currentPageUtilityReady ? 0 : 1);
  const canAdvanceFromCurrentPage = currentPageMissingCount === 0;
  const canSubmitAssessment =
    selectedUtilityKeys.length > 0 &&
    selectedUtilityKeys.length <= VENDOR_PRODUCT_UTILITY_CAP &&
    profileAnsweredCount === profileQuestions.length &&
    scoredAnsweredCount === activeQuestions.length &&
    openEndedAnsweredCount === openEndedQuestions.length;

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

  function goToPage(nextPage: number) {
    setCurrentPageIndex(clampPageIndex(nextPage, totalPages));
    setPageError(null);
    setSubmitError(null);
  }

  function continueToNextPage() {
    if (!canAdvanceFromCurrentPage) {
      setPageError(
        currentPageIncludesUtilityDeclaration && selectedUtilityKeys.length === 0
          ? "Complete the first page and declare at least one utility before PAT opens the next page."
          : `Complete the remaining ${currentPageMissingCount} required item${currentPageMissingCount === 1 ? "" : "s"} on this page before continuing.`
      );
      return;
    }

    goToPage(visibleCurrentPageIndex + 1);
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
      <section className="grid gap-4 md:grid-cols-2">
        <div className="pat-soft-panel p-5">
          <div className="pat-label">Progress card</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">{progress}%</div>
          <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {answeredCount} of {totalCount} active questions completed
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Page {visibleCurrentPageIndex} of {totalPages} · {currentPageAnsweredCount} of {currentPageQuestionCount} question
            {currentPageQuestionCount === 1 ? "" : "s"} complete
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Utilities selected: <span className="font-semibold text-[var(--shell-ink)]">{selectedUtilityKeys.length}</span>
            {" "}of {VENDOR_PRODUCT_UTILITY_CAP}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[var(--shell-accent)]">
            <Link href={productsHref} className="hover:text-[var(--shell-accent-strong)]">
              Back to products
            </Link>
            <Link href={productInsightHref} className="hover:text-[var(--shell-accent-strong)]">
              Open product insight
            </Link>
          </div>
        </div>

        <Link href={helpHref} className="pat-soft-panel pat-soft-panel-interactive block p-5">
          <div className="pat-label">Help card</div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Product assessment help
          </div>
          <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Open the scoped help view for utility declaration, 10-question page pacing, and what PAT expects before submission.
          </div>
        </Link>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Assessment page</div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{currentPage.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">{currentPage.description}</p>
      </section>

      {currentPage.kind === "profile" ? (
        <div className="space-y-4">
          <section className="pat-card p-6">
            <div className="pat-label">Product profile</div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              First 10 product-bio questions
            </h3>
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
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Which utilities does {productName} solve?
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              This first page deliberately ends with utility declaration so PAT can generate the correct utility-scored question set before the rest of the assessment opens. One utility activates 20 scored questions, up to a v1 cap of 4 utilities.
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
                          onInput={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                          onChange={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                          onPointerUp={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
                          onKeyUp={(event) => setScoredAnswer(question.id, event.currentTarget.value)}
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
        <div className="pat-label">{visibleCurrentPageIndex < totalPages ? "Page navigation" : "Submit"}</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          {visibleCurrentPageIndex < totalPages
            ? "PAT keeps the hero stable at the top while the question region moves page by page through profile, utility-scored, and open-ended responses."
            : "PAT saves vendor product self-signal to the current product, persists the generated assessment plan for stable resume behavior, and stores the assessment record in the live submission system."}
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
