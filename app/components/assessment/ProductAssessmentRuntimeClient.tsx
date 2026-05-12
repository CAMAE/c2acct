"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildProductAssessmentDraftPayload,
  buildProductAssessmentPages,
  buildProductAssessmentResumeState,
  countRequiredProductPageAnswers,
  getProductAssessmentPlan,
  type ProductAssessmentPage,
} from "@/lib/productAssessmentRuntime";
import { PRODUCT_SCORE_GUIDE } from "@/lib/productUtilityRegistry";
import { normalizeVendorProductProfileInput, type VendorProductProfileInput } from "@/lib/vendorProductAssessmentPlan";
import { trackClientEvent } from "@/lib/analytics";
import type { UtilityDefinition } from "@/lib/vendorPat";
import { VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import type { ProductAssessmentPerspective, ProductAssessmentQuestion } from "@/lib/vendorProductQuestionBank";

type Props = {
  perspective: ProductAssessmentPerspective;
  productId: string;
  productName: string;
  submitPath: string;
  draftPath: string;
  signInPath: string;
  successHref: string;
  utilityCatalog?: UtilityDefinition[];
  initialUtilityKeys: string[];
  initialResponses: Record<string, number>;
  initialOpenEndedResponses: Record<string, string>;
  initialProfile: VendorProductProfileInput | null;
  initialCurrentPage: number;
  initialStaleDraft: boolean;
  initialDroppedResponseIds: string[];
};

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function isLongTextField(question: ProductAssessmentQuestion) {
  return (
    question.fieldKey === "productDescription" ||
    question.fieldKey === "positioning" ||
    question.fieldKey === "targetUseContext" ||
    question.fieldKey === "operatingModelFit" ||
    question.fieldKey === "integrationPosture"
  );
}

function getCompletionLabel(page: ProductAssessmentPage) {
  if (page.moduleKinds.includes("general")) {
    return "Complete the current product profile page before continuing.";
  }

  if (page.moduleKinds.includes("open-ended")) {
    return "Complete the current narrative page before submitting.";
  }

  return "Complete the current PAT page before continuing.";
}

function ScoredQuestionField(props: {
  question: ProductAssessmentQuestion;
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  const selectedValue = typeof props.value === "number" ? props.value : null;

  return (
    <div className="grid gap-4">
      <div
        className="mx-auto grid w-full max-w-[30rem] grid-cols-3 gap-2 sm:grid-cols-6"
        role="radiogroup"
        aria-label={`${props.question.prompt} answer choices`}
      >
        {[0, 1, 2, 3, 4, 5].map((optionValue) => {
          const active = selectedValue === optionValue;

          return (
            <button
              key={optionValue}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => props.onChange(optionValue)}
              className="pat-question-choice-button w-full min-w-0 justify-center"
              data-active={active}
            >
              {optionValue}
            </button>
          );
        })}
      </div>
      <div className="pat-sans flex items-center justify-between gap-3 text-xs text-[var(--shell-muted)]">
        <span>{PRODUCT_SCORE_GUIDE[0]}</span>
        {selectedValue === null ? (
          <span className="rounded-full border border-[var(--shell-border)] bg-white px-3 py-1 text-sm font-semibold text-[var(--shell-muted)]">
            Select a score
          </span>
        ) : (
          <span className="rounded-full border border-[var(--shell-border)] bg-white px-3 py-1 text-sm font-semibold text-[var(--shell-ink)]">
            {selectedValue}
          </span>
        )}
        <span>{PRODUCT_SCORE_GUIDE.at(-1)}</span>
      </div>
    </div>
  );
}

export default function ProductAssessmentRuntimeClient({
  perspective,
  productId,
  productName,
  submitPath,
  draftPath,
  signInPath,
  successHref,
  utilityCatalog = [],
  initialUtilityKeys,
  initialResponses,
  initialOpenEndedResponses,
  initialProfile,
  initialCurrentPage,
  initialStaleDraft,
  initialDroppedResponseIds,
}: Props) {
  const router = useRouter();
  const [selectedUtilityKeys, setSelectedUtilityKeys] = useState<string[]>(initialUtilityKeys);
  const [responses, setResponses] = useState<Record<string, number>>(initialResponses);
  const [openEndedResponses, setOpenEndedResponses] = useState<Record<string, string>>(initialOpenEndedResponses);
  const [profile, setProfile] = useState<VendorProductProfileInput | null>(initialProfile);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const didTrackEntry = useRef(false);
  const [staleMessage, setStaleMessage] = useState(
    initialStaleDraft
      ? `Saved progress was reconciled to the current question plan. ${
          initialDroppedResponseIds.length > 0
            ? `${initialDroppedResponseIds.length} stale response${initialDroppedResponseIds.length === 1 ? "" : "s"} were removed.`
            : "The page position was safely reset."
        }`
      : null
  );

  const plan = useMemo(
    () => getProductAssessmentPlan({ perspective, selectedUtilityKeys }),
    [perspective, selectedUtilityKeys]
  );
  const pages = useMemo(() => buildProductAssessmentPages(plan), [plan]);
  const safeCurrentPage = clampPage(currentPage, pages.length);
  const currentPageRecord = pages[safeCurrentPage - 1] ?? null;

  const totalQuestions = useMemo(
    () => plan.modules.reduce((sum, planModule) => sum + planModule.questions.length, 0),
    [plan]
  );
  const answeredQuestions = useMemo(() => {
    let answered = 0;

    for (const planModule of plan.modules) {
      for (const question of planModule.questions) {
        if (question.responseKind === "score") {
          if (typeof responses[question.id] === "number") {
            answered += 1;
          }
          continue;
        }

        if (question.moduleKind === "general" && question.fieldKey) {
          if (profile?.[question.fieldKey]?.trim().length) {
            answered += 1;
          }
          continue;
        }

        if (openEndedResponses[question.id]?.trim().length) {
          answered += 1;
        }
      }
    }

    return answered;
  }, [openEndedResponses, plan, profile, responses]);
  const progressPercent = totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100);
  const currentPageCompletion = currentPageRecord
    ? countRequiredProductPageAnswers({
        page: currentPageRecord,
        responses,
        openEndedResponses,
        profile,
      })
    : { present: 0, required: 0 };
  const utilitySelectionComplete = perspective !== "vendor" || selectedUtilityKeys.length > 0;
  const canAdvance =
    Boolean(currentPageRecord) &&
    currentPageCompletion.present >= currentPageCompletion.required &&
    utilitySelectionComplete;
  const onLastPage = safeCurrentPage >= pages.length;

  useEffect(() => {
    if (didTrackEntry.current) {
      return;
    }

    didTrackEntry.current = true;
    void trackClientEvent({
      distinctId: `${perspective}:${productId}`,
      event: initialCurrentPage > 1 || initialStaleDraft ? "assessment_resume" : "assessment_start",
      properties: {
        perspective,
        productId,
        currentPage: initialCurrentPage,
        staleDraft: initialStaleDraft,
      },
    });
  }, [initialCurrentPage, initialStaleDraft, perspective, productId]);

  async function persistDraft(nextPage: number) {
    const normalizedProfile =
      perspective === "vendor" ? normalizeVendorProductProfileInput(profile ?? {}) : null;
    setDraftState("saving");
    setDraftError(null);

    const response = await fetch(draftPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        currentPage: nextPage,
        utilityKeys: selectedUtilityKeys,
        answers: responses,
        openEndedResponses,
        profile: normalizedProfile,
      }),
    });

    if (response.status === 401) {
      window.location.assign(signInPath);
      return false;
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok !== true) {
      setDraftState("error");
      setDraftError(body?.error ?? body?.detail ?? `HTTP ${response.status}`);
      return false;
    }

    setDraftState("saved");
    void trackClientEvent({
      distinctId: `${perspective}:${productId}`,
      event: "draft_saved",
      properties: {
        perspective,
        productId,
        nextPage,
      },
    });
    return true;
  }

  function applyVendorUtilitySelection(nextUtilityKeys: string[]) {
    const resumeState = buildProductAssessmentResumeState({
      perspective: "vendor",
      selectedUtilityKeys: nextUtilityKeys,
      draftAnswers: buildProductAssessmentDraftPayload({
        perspective: "vendor",
        productId,
        registryVersion: plan.version,
        selectedUtilityKeys: nextUtilityKeys,
        responses,
        openEndedResponses,
        profile,
      }),
      draftCurrentPage: safeCurrentPage,
      defaultProfile: profile,
    });

    setSelectedUtilityKeys(resumeState.selectedUtilityKeys);
    setResponses(resumeState.responses);
    setOpenEndedResponses(resumeState.openEndedResponses);
    setProfile(resumeState.profile);
    setCurrentPage(resumeState.currentPage);
    setStaleMessage(
      resumeState.droppedResponseIds.length > 0
        ? `Question scope changed. ${resumeState.droppedResponseIds.length} stale response${
            resumeState.droppedResponseIds.length === 1 ? "" : "s"
          } were removed from pages that are no longer active.`
        : null
    );
  }

  function toggleUtility(nextKey: string) {
    const currentlySelected = selectedUtilityKeys.includes(nextKey);
    if (currentlySelected) {
      applyVendorUtilitySelection(selectedUtilityKeys.filter((entry) => entry !== nextKey));
      return;
    }

    applyVendorUtilitySelection([...selectedUtilityKeys, nextKey]);
  }

  async function movePage(direction: "prev" | "next") {
    const targetPage = direction === "next" ? safeCurrentPage + 1 : safeCurrentPage - 1;
    if (direction === "next" && !canAdvance) {
      return;
    }

    const saved = await persistDraft(clampPage(targetPage, pages.length));
    if (!saved) {
      return;
    }

    void trackClientEvent({
      distinctId: `${perspective}:${productId}`,
      event: "page_advance",
      properties: {
        perspective,
        productId,
        fromPage: safeCurrentPage,
        toPage: clampPage(targetPage, pages.length),
        direction,
      },
    });
    setCurrentPage(clampPage(targetPage, pages.length));
  }

  async function submitAssessment() {
    if (!currentPageRecord) {
      return;
    }

    if (perspective === "vendor" && selectedUtilityKeys.length === 0) {
      setSubmitState("error");
      setSubmitError("Select at least one utility before submitting.");
      return;
    }

    if (!canAdvance) {
      setSubmitState("error");
      setSubmitError(getCompletionLabel(currentPageRecord));
      return;
    }

    setSubmitState("submitting");
    setSubmitError(null);

    const normalizedProfile =
      perspective === "vendor" ? normalizeVendorProductProfileInput(profile ?? {}) : null;
    const response = await fetch(submitPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        perspective === "vendor"
          ? {
              productId,
              utilityKeys: selectedUtilityKeys,
              profile: normalizedProfile,
              openEndedResponses,
              answers: responses,
            }
          : {
              productId,
              answers: responses,
            }
      ),
    });

    if (response.status === 401) {
      window.location.assign(signInPath);
      return;
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok !== true) {
      setSubmitState("error");
      setSubmitError(body?.error ?? body?.detail ?? `HTTP ${response.status}`);
      return;
    }

    router.push(successHref);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
        <div id="assessment-progress" className="pat-card p-6 scroll-mt-24">
          <div className="pat-label">Progress</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {productName}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            PAT saves progress when you move between pages. Re-entering this assessment resumes the latest saved page when the current question plan still matches.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Page: <span className="font-semibold text-[var(--shell-ink)]">{safeCurrentPage}</span> of{" "}
              <span className="font-semibold text-[var(--shell-ink)]">{pages.length}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Progress: <span className="font-semibold text-[var(--shell-ink)]">{progressPercent}%</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Save state:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">
                {draftState === "saved"
                  ? "Saved"
                  : draftState === "saving"
                    ? "Saving..."
                    : draftState === "error"
                      ? "Save failed"
                      : "Ready"}
              </span>
            </div>
          </div>
          {staleMessage ? (
            <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
              {staleMessage}
            </div>
          ) : null}
          {draftError ? (
            <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
              {draftError}
            </div>
          ) : null}
        </div>

        <div id="assessment-help" className="pat-card p-6 scroll-mt-24">
          <div className="pat-label">Help</div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
            <p>
              Scores use the PAT 0-5 scale. PAT treats each score as current-state operating support, not as market rank or universal product truth.
            </p>
            <p>
              Pages stay section-aware. Each section is 5 questions, and PAT groups up to 10 questions per page so subcategory evidence remains visible.
            </p>
            <p>
              Utility selection is a scope boundary. Declare only the utilities this product materially supports today, because PAT uses that declaration to decide which question families it is allowed to assess.
            </p>
            <p>Next-page navigation stays locked until the current required responses are complete.</p>
          </div>
        </div>
      </section>

      {perspective === "vendor" ? (
        <section className="pat-card p-6">
          <div className="pat-label">Utility declaration</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Which utilities does {productName} solve?
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Utility selection drives the active question plan. Changing it can add or remove later pages, and PAT will drop stale answers that no longer belong to the current scope. Declare only utilities the product can credibly support today, not adjacent wish-list categories.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {utilityCatalog.map((utility) => {
              const active = selectedUtilityKeys.includes(utility.key);

              return (
                <button
                  key={utility.key}
                  type="button"
                  onClick={() => toggleUtility(utility.key)}
                  className={`rounded-[20px] border p-4 text-left ${
                    active
                      ? "border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.05)]"
                      : "border-[var(--shell-border)] bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold text-[var(--shell-ink)]">{utility.label}</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{utility.description}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            Selected utilities:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{selectedUtilityKeys.length}</span>. Each declared
            utility adds 20 scored questions across four 5-question sections, so the later insight layer can stay tied to named evidence slices rather than one opaque product score.
          </div>
        </section>
      ) : null}

      {currentPageRecord ? (
        <section className="space-y-4">
          {currentPageRecord.sections.map((section) => (
            <div key={section.key} className="pat-card p-6">
              <div className="pat-label">
                {section.moduleTitle} · Section {section.order}
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
                {section.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{section.description}</p>
              <div className="mt-6 grid gap-5">
                {section.questions.map((question) => (
                  <div key={question.id} className="pat-subpanel p-5">
                    {question.subcategory?.label ? (
                      <div className="pat-label">{question.subcategory.label}</div>
                    ) : null}
                    <h4 className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">{question.prompt}</h4>
                    <div className="mt-5">
                      {question.responseKind === "score" ? (
                        <ScoredQuestionField
                          question={question}
                          value={responses[question.id]}
                          onChange={(value) =>
                            setResponses((current) => ({
                              ...current,
                              [question.id]: value,
                            }))
                          }
                        />
                      ) : question.moduleKind === "general" && question.fieldKey ? (
                        isLongTextField(question) ? (
                          <textarea
                            className="pat-textarea"
                            rows={4}
                            value={profile?.[question.fieldKey] ?? ""}
                            onChange={(event) =>
                              setProfile((current) => ({
                                ...(current ?? normalizeVendorProductProfileInput({})),
                                [question.fieldKey!]: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <input
                            className="pat-input"
                            value={profile?.[question.fieldKey] ?? ""}
                            onChange={(event) =>
                              setProfile((current) => ({
                                ...(current ?? normalizeVendorProductProfileInput({})),
                                [question.fieldKey!]: event.target.value,
                              }))
                            }
                          />
                        )
                      ) : (
                        <textarea
                          className="pat-textarea"
                          rows={4}
                          value={openEndedResponses[question.id] ?? ""}
                          onChange={(event) =>
                            setOpenEndedResponses((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
          No active assessment pages are available for the current product scope.
        </section>
      )}

      <section className="pat-card p-6">
        <div className="pat-label">Navigation</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          {currentPageRecord ? getCompletionLabel(currentPageRecord) : "Assessment navigation is unavailable."}
        </p>
        {submitError ? (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {submitError}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void movePage("prev")}
            className="pat-button-secondary"
            disabled={safeCurrentPage <= 1 || draftState === "saving" || submitState === "submitting"}
          >
            Previous page
          </button>
          {!onLastPage ? (
            <button
              type="button"
              onClick={() => void movePage("next")}
              className="pat-button-primary"
              disabled={!canAdvance || draftState === "saving" || submitState === "submitting"}
            >
              {draftState === "saving" ? "Saving..." : "Save and continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submitAssessment()}
              className="pat-button-primary"
              disabled={!canAdvance || submitState === "submitting"}
            >
              {submitState === "submitting"
                ? "Submitting..."
                : perspective === "vendor"
                  ? "Submit vendor product assessment"
                  : "Submit firm product assessment"}
            </button>
          )}
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
