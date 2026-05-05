import type { ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

type MeetPatContentProps = {
  actions?: ReactNode;
};

export default async function MeetPatContent({ actions }: MeetPatContentProps) {
  const messages = await getRequestLocaleMessages();

  return (
    <div className="space-y-8">
      <section className="pat-card px-7 py-8 sm:px-10 sm:py-10">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{messages.meetPat.eyebrow}</div>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)] sm:text-5xl">
          {messages.meetPat.heroTitle}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {messages.meetPat.heroBody}
        </p>
      </section>

      <section className="grid gap-5">
        {messages.meetPat.sections.map((section) => (
          <article key={section.title} className="pat-card px-7 py-7 sm:px-8">
            <div className="pat-label">{section.title}</div>
            <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--shell-muted)]">
              {section.body}
            </p>
          </article>
        ))}
      </section>

      <section className="pat-card px-7 py-7 sm:px-8">
        <div className="pat-label">{messages.meetPat.valueTitle}</div>
        <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--shell-muted)]">
          {messages.meetPat.valueBody}
        </p>
        {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      </section>
    </div>
  );
}
