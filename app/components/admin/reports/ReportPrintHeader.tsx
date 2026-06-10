import Link from "next/link";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PrintButton from "@/app/components/admin/briefings/PrintButton";

type ReportPrintHeaderProps = {
  title: string;
  /** One-line scope/source description under the title. */
  description: string;
  backHref: string;
  backLabel: string;
};

/**
 * Shared header for /admin/reports print routes: logo, report title, run
 * date, and screen-only controls. PDF export = the browser print dialog.
 */
export default function ReportPrintHeader({ title, description, backHref, backLabel }: ReportPrintHeaderProps) {
  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="pat-card p-8 print:border-0 print:shadow-none">
      <PatLogoLockup mode="hero" tone="light" />
      <div className="pat-label mt-6">PAT report · {generatedOn}</div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{title}</h1>
      <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--shell-muted)]">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <Link className="pat-button-secondary" href={backHref}>
          {backLabel}
        </Link>
        <PrintButton />
      </div>
    </section>
  );
}
