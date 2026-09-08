import CardChip from "@/app/components/cards/CardChip";
import type { FirmFollowUpEvidenceModule, FollowUpEvidenceItem } from "@/lib/assessment/followUpEvidence";

/**
 * MC follow-on box — the firm's five follow-ups per module, read from
 * AssessmentItemResponse (option rows) with the submission JSON as fallback.
 *   selection  → one chip per chosen option (label), consequence clause muted
 *                beneath; "Other" text verbatim in quotes; "Not a significant
 *                issue here" rendered as its own muted chip.
 *   text       → the legacy free-text answer, as written.
 *   none       → a quiet placeholder.
 * Server component, no client JS. Mounted only behind PAT_ENABLE_FOLLOWUP_MC.
 */
function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function EvidenceItem({ item }: { item: FollowUpEvidenceItem }) {
  return (
    <div className="grid gap-2" data-testid="followup-evidence-item" data-kind={item.kind}>
      <div className="text-sm font-semibold leading-6 text-[var(--shell-ink)]">
        <span className="text-[var(--shell-muted)]">{item.index}.</span> {item.stem}
      </div>
      {item.kind === "selection" ? (
        <ul className="grid gap-2">
          {item.options.map((option) => (
            <li key={option.key} className="grid gap-1" data-option-kind={option.kind}>
              <div>
                <CardChip tone={option.kind === "choice" ? "neutral" : "muted"}>{option.label}</CardChip>
              </div>
              {option.consequence ? (
                <div className="pl-1 text-sm leading-6 text-[var(--shell-muted)]">{option.consequence}</div>
              ) : null}
              {option.kind === "other" && item.otherText ? (
                <div className="pl-1 text-sm leading-6 text-[var(--shell-ink)]">&ldquo;{item.otherText}&rdquo;</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : item.kind === "text" ? (
        <p className="text-sm leading-6 text-[var(--shell-ink)]">{item.text}</p>
      ) : (
        <p className="text-sm leading-6 text-[var(--shell-muted)]">No follow-up answer recorded.</p>
      )}
    </div>
  );
}

export default function FollowUpEvidencePanel({
  modules,
  eyebrow = "Follow-up evidence",
  title = "Module follow-ups",
}: {
  modules: FirmFollowUpEvidenceModule[];
  eyebrow?: string;
  title?: string;
}) {
  const answered = modules.filter((module) => module.submissionId);
  return (
    <section className="pat-card p-6" data-testid="followup-evidence-panel">
      <div className="pat-label">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
        The five follow-up answers from this firm&apos;s latest final submission of each module. Selections show the
        chosen options; written answers show as written. &ldquo;Not a significant issue here&rdquo; is shown but never
        counted.
      </p>
      {answered.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-[var(--shell-muted)]">No final firm module submissions yet.</p>
      ) : null}
      <div className="mt-5 grid gap-6">
        {answered.map((module) => (
          <div key={module.moduleKey} className="pat-subpanel p-5" data-testid="followup-evidence-module" data-module-key={module.moduleKey}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="pat-label">
                {module.pillar} · {module.title}
              </div>
              {module.submittedAt ? (
                <div className="text-xs text-[var(--shell-muted)]">Submitted {formatDate(module.submittedAt)}</div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-5">
              {module.items.map((item) => (
                <EvidenceItem key={item.questionKey} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
