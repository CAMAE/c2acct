import Link from "next/link";
import { notFound } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import HeroChips from "@/app/components/pat/HeroChips";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import {
  assertTemplateUnlocked,
  findLatestSitting,
  loadSittingView,
  requireFirmModuleAccess,
  startOrResumeSitting,
} from "@/lib/modules/portal";
import { answerItemAction, completeModuleAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Module | Patalign",
  description: "Work through an unlocked firm module.",
};

/**
 * The sitting flow: one item at a time, then a completion view.
 *
 * No benchmark comparison anywhere on this page — suppression surfaces are out
 * of scope for Block B, and a peer number shown without the suppression rules
 * applied would be exactly the kind of unguarded comparison those rules exist
 * to prevent.
 */
export default async function FirmModuleSittingPage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string }>;
  searchParams?: Promise<{ sitting?: string }>;
}) {
  const { companyId, userId, verticalId } = await requireFirmModuleAccess();
  const { templateId } = await params;
  const query = searchParams ? await searchParams : undefined;

  // This firm's own pattern must have unlocked it; 404 otherwise.
  const template = await assertTemplateUnlocked(companyId, templateId, undefined, verticalId);

  // Prefer an explicit sitting, then this firm's newest existing sitting
  // (open OR completed), and only open a new one when none exists. Without the
  // middle step, landing on this route after finishing a module would start a
  // fresh exam on top of the completed result.
  const existing = query?.sitting && query.sitting.length > 0
    ? query.sitting
    : await findLatestSitting(companyId, templateId, verticalId);
  const sittingId =
    existing ?? (await startOrResumeSitting({ companyId, userId, templateId, verticalId })).sittingId;

  const view = await loadSittingView(companyId, sittingId, verticalId);
  if (view.templateId !== templateId) {
    notFound();
  }

  const finished = view.status === "COMPLETED";
  const allAnswered = view.answeredCount >= view.total && view.total > 0;

  return (
    <div className="space-y-8">
      <section className="pat-card relative p-8">
        <HeroChips audience="firm" />
        <PatLogoLockup mode="hero" tone="light" />
        <PatAudienceTitle
          as="h1"
          title={template.title}
          audienceTerms={["Firm"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {finished
            ? "This module is complete. Your result is below."
            : `Question ${Math.min(view.answeredCount + 1, view.total)} of ${view.total}.`}
        </p>
      </section>

      {finished ? (
        // ---- Completion view ------------------------------------------------
        <section className="pat-card p-8">
          <div className="pat-label">Module complete</div>
          <div className="mt-6 flex flex-wrap items-center gap-8">
            <ScoreLockup
              score={view.scorePercent === null ? null : Math.round(view.scorePercent)}
              label="Module score"
            />
            <div>
              <div className="text-sm text-[var(--shell-muted)]">Band</div>
              <div className="text-2xl font-semibold text-[var(--shell-ink)]">
                {view.scoreBandLabel ?? "—"}
              </div>
              <div className="mt-2 text-sm text-[var(--shell-muted)]">
                {view.scoreRaw ?? 0} of {view.total} correct
              </div>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-6 text-[var(--shell-muted)]">
            This score reflects the items served in this sitting. It is your firm&apos;s own result
            and is not compared to any peer group here.
          </p>
          <Link href="/firm/modules" className="pat-button-primary mt-6 inline-flex">
            Back to modules
          </Link>
        </section>
      ) : allAnswered ? (
        // ---- Ready to submit -------------------------------------------------
        <section className="pat-card p-8">
          <div className="pat-label">All questions answered</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Ready to complete
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--shell-muted)]">
            You have answered all {view.total} questions. Completing scores the module and closes
            this sitting.
          </p>
          <form action={completeModuleAction} className="mt-6">
            <input type="hidden" name="sittingId" value={view.sittingId} />
            <button type="submit" className="pat-button-primary inline-flex">
              Complete module
            </button>
          </form>
        </section>
      ) : view.currentItem ? (
        // ---- Item view -------------------------------------------------------
        <section className="pat-card p-8">
          <div className="pat-label">
            Question {view.currentItem.index} of {view.total}
          </div>
          <h2 className="mt-4 text-xl font-semibold leading-8 text-[var(--shell-ink)]">
            {view.currentItem.stem}
          </h2>
          <form action={answerItemAction} className="mt-6 space-y-3">
            <input type="hidden" name="sittingId" value={view.sittingId} />
            <input type="hidden" name="itemId" value={view.currentItem.id} />
            <div className="grid gap-3">
              {view.currentItem.choices.map((choice) => (
                <button
                  key={choice.key}
                  type="submit"
                  name="responseKey"
                  value={choice.key}
                  className="rounded-[20px] border border-[var(--shell-border)] bg-white p-4 text-left hover:border-[rgba(6,54,116,0.16)] hover:bg-[rgba(6,54,116,0.05)]"
                >
                  <span className="text-sm font-semibold uppercase text-[var(--shell-muted)]">
                    {choice.key}
                  </span>
                  <span className="ml-3 text-sm leading-6 text-[var(--shell-ink)]">{choice.label}</span>
                </button>
              ))}
            </div>
          </form>
          <div className="mt-6 text-sm text-[var(--shell-muted)]">
            {view.answeredCount} of {view.total} answered.
          </div>
        </section>
      ) : (
        <section className="pat-card p-8">
          <div className="pat-label">Nothing to answer</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            This sitting has no remaining items.
          </p>
        </section>
      )}

      <Link href="/firm/modules" className="text-sm text-[var(--shell-muted)] underline">
        Back to modules
      </Link>
    </div>
  );
}
