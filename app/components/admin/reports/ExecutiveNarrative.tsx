/**
 * Optional agent-written narrative section for /admin/reports. Renders
 * nothing when the narrative is null (flag off, key absent, generation
 * failed, or guardrail rejection) — the report must look exactly as it did
 * before Block 3 in every degraded state.
 */
export default function ExecutiveNarrative({ narrative }: { narrative: string | null }) {
  if (!narrative) {
    return null;
  }

  return (
    <section className="pat-card p-6 print:break-inside-avoid" data-testid="executive-narrative">
      <h2 className="pat-label">Executive narrative</h2>
      <div className="mt-4 max-w-3xl space-y-4">
        {narrative
          .split(/\n{2,}|\n(?=\S)/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, index) => (
            <p key={index} className="text-sm leading-7 text-[var(--shell-ink)]">
              {paragraph}
            </p>
          ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
        Synthesized from the evidence on this report. Current-state evidence only.
      </p>
    </section>
  );
}
