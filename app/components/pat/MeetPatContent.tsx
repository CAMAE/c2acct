import type { CSSProperties, ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PatConsentPanelMount from "@/app/components/pat/PatConsentPanelMount";
import { MEET_PAT_V7_SECTION_COUNT } from "@/lib/frontDoor";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

/**
 * variant "default": every portal + the flag-off sign-in — UNTOUCHED markup.
 * variant "v7" (21c): the /sign-in?view=pat content behind PAT_ENABLE_NEW_FRONT_DOOR,
 * in the V7 register (pat-card 28px + door shadow, pat-label eyebrows, extrabold
 * tight-tracked title, px type scale) and cut -40%+ by OMISSION: the hero plus the
 * first MEET_PAT_V7_SECTION_COUNT sections; "How PAT grows" and the "Instant
 * value" block are dropped. No sentence is re-voiced (Cam's GO governs copy).
 */
type MeetPatVariant = "default" | "v7";

type MeetPatContentProps = {
  actions?: ReactNode;
  variant?: MeetPatVariant;
};

const V7_CARD_STYLE: CSSProperties = {
  boxShadow: "0 1px 2px rgba(12,33,66,.05), 0 24px 64px rgba(12,33,66,.09)",
};

export default async function MeetPatContent({ actions, variant = "default" }: MeetPatContentProps) {
  const messages = await getRequestLocaleMessages();
  const individualSurfacesEnabled = isIndividualSurfacesEnabled();
  const pilotBody = (value: string) =>
    individualSurfacesEnabled
      ? value
      : value
          .replace("across firm, vendor, and individual views", "across firm and vendor views")
          .replace("for vendors, firms, and individuals", "for vendors and firms");

  if (variant === "v7") {
    return (
      <div className="space-y-6" data-testid="meet-pat-v7">
        <section className="pat-card px-[42px] py-10" style={V7_CARD_STYLE}>
          <PatLogoLockup mode="hero" tone="light" />
          <div className="pat-label mt-7">{messages.meetPat.eyebrow}</div>
          <h1 className="mt-3 max-w-[18em] text-[40px] font-extrabold leading-[1.06] tracking-[-0.02em] text-[var(--shell-ink)]">
            {messages.meetPat.heroTitle}
          </h1>
          <p className="mt-4 max-w-[640px] text-[16px] leading-7 text-[var(--shell-muted)]">
            {pilotBody(messages.meetPat.heroBody)}
          </p>
        </section>

        {/* Renders only for a signed-in user while PAT_ENABLE_PAT_ASSISTANT is on;
            null on public views and while the flag is off. */}
        <PatConsentPanelMount />

        <section className="grid gap-5 md:grid-cols-2">
          {messages.meetPat.sections.slice(0, MEET_PAT_V7_SECTION_COUNT).map((section) => (
            <article key={section.title} className="pat-card px-[34px] py-8" style={V7_CARD_STYLE}>
              <div className="pat-label">{section.title}</div>
              <p className="mt-3 text-[15.5px] leading-7 text-[var(--shell-muted)]">
                {pilotBody(section.body)}
              </p>
            </article>
          ))}
        </section>

        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="pat-card px-7 py-8 sm:px-10 sm:py-10">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{messages.meetPat.eyebrow}</div>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)] sm:text-5xl">
          {messages.meetPat.heroTitle}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {pilotBody(messages.meetPat.heroBody)}
        </p>
      </section>

      {/* Renders only for a signed-in user while PAT_ENABLE_PAT_ASSISTANT is on;
          null on public views and while the flag is off. */}
      <PatConsentPanelMount />

      <section className="grid gap-5">
        {messages.meetPat.sections.map((section) => (
          <article key={section.title} className="pat-card px-7 py-7 sm:px-8">
            <div className="pat-label">{section.title}</div>
            <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--shell-muted)]">
              {pilotBody(section.body)}
            </p>
          </article>
        ))}
      </section>

      <section className="pat-card px-7 py-7 sm:px-8">
        <div className="pat-label">{messages.meetPat.valueTitle}</div>
        <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--shell-muted)]">
          {pilotBody(messages.meetPat.valueBody)}
        </p>
        {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      </section>
    </div>
  );
}
