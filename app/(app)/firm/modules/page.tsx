import Link from "next/link";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import HeroChips from "@/app/components/pat/HeroChips";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import { listFirmModuleCards } from "@/lib/modules/portal";
import { requireFirmModuleAccess } from "@/lib/modules/portal";
import { startModuleAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Modules | Patalign",
  description: "Adaptive firm modules unlocked by your alignment pattern.",
};

/**
 * Firm module cards surface (Adaptive Modules Block B).
 *
 * requireFirmModuleAccess() runs FIRST — before any query, before any render —
 * so with PAT_ENABLE_ADAPTIVE_MODULES off this route 404s rather than serving a
 * hidden page. Cards shown are exactly what resolveUnlocks() returned for this
 * firm; locked modules are absent, not teased.
 */
export default async function FirmModulesPage() {
  const { companyId, verticalId } = await requireFirmModuleAccess();
  const cards = await listFirmModuleCards(companyId, undefined, verticalId);

  return (
    <div className="space-y-8">
        <section className="pat-card relative p-8">
          <HeroChips audience="firm" />
          <PatLogoLockup mode="hero" tone="light" />
          <PatAudienceTitle
            as="h1"
            title="Firm modules"
            audienceTerms={["Firm"]}
            className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
          />
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
            Modules open as your alignment pattern develops. Each one is built for the pattern it
            was unlocked by — work through them as they arrive.
          </p>
        </section>

        {cards.length === 0 ? (
          <section className="pat-card p-8">
            <div className="pat-label">No modules yet</div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Nothing has unlocked yet
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--shell-muted)]">
              Complete more of your alignment assessment and modules will open against the pattern
              it produces.
            </p>
            <Link href="/firm/alignment-assessment" className="pat-button-primary mt-6 inline-flex">
              Open alignment assessment
            </Link>
          </section>
        ) : (
          <section className="pat-card p-8">
            <div className="pat-label">Unlocked modules</div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {cards.length} module{cards.length === 1 ? "" : "s"} open to your firm
            </h2>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {cards.map((card) => {
                const started = card.status !== "Not started";
                return (
                  <div
                    key={card.templateId}
                    className={`rounded-[20px] border p-4 text-left ${
                      started
                        ? "border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.05)]"
                        : "border-[var(--shell-border)] bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-[var(--shell-ink)]">{card.title}</div>
                      <span className="shrink-0 rounded-full border border-[var(--shell-border)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--shell-muted)]">
                        {card.moduleType}
                      </span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                      {card.category} · {card.itemCount} item{card.itemCount === 1 ? "" : "s"}
                    </div>
                    <div className="mt-3 text-sm font-medium text-[var(--shell-ink)]">
                      {card.status}
                      {card.scorePercent !== null ? (
                        <span className="text-[var(--shell-muted)]">
                          {" "}
                          · {Math.round(card.scorePercent)} · {card.scoreBandLabel}
                        </span>
                      ) : null}
                    </div>
                    {card.sittingId ? (
                      // An existing sitting (open or finished) is OPENED, never
                      // restarted — starting a new one over a completed module
                      // would destroy the result the button offers to show.
                      <Link
                        href={`/firm/modules/${card.templateId}?sitting=${card.sittingId}`}
                        className="pat-button-primary mt-4 inline-flex"
                      >
                        {card.status === "In progress" ? "Resume module" : "Review module"}
                      </Link>
                    ) : (
                      <form action={startModuleAction} className="mt-4">
                        <input type="hidden" name="templateId" value={card.templateId} />
                        <button type="submit" className="pat-button-primary inline-flex">
                          Start module
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      <Link href="/firm" className="text-sm text-[var(--shell-muted)] underline">
        Back to firm workspace
      </Link>
    </div>
  );
}
