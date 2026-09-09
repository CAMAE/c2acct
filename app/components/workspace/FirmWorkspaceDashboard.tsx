import Link from "next/link";
import RadarChart from "@/app/components/charts/RadarChart";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import type { FirmWorkspaceDashboard as Data } from "@/lib/firmWorkspaceDashboard";

/**
 * Depth box 1 (2026-09-09, flag-on): the firm's dashboard on /firm — the same
 * blocks the consultant ecosystem page uses: index with band, modules
 * complete, capabilities met, the small radar, NEXT BEST STEP, the latest
 * insight headline with "Open readout", and "since your last visit". A firm
 * with 0/5 sees the five modules as its next steps, never a blank.
 */
export default function FirmWorkspaceDashboard({ data }: { data: Data }) {
  const empty = data.completedModules === 0;
  return (
    <div className="space-y-8" data-testid="firm-workspace-dashboard">
      <section className="pat-card p-8">
        <div className="pat-label">Current operating picture</div>
        {empty ? (
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div>
              <p className="text-base leading-7 text-[var(--shell-muted)]">
                No module is on record yet. Your alignment index, capabilities and radar appear as the five modules come in — start with
                the first one below; each takes about four minutes.
              </p>
              <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                {data.modules.map((module, index) => (
                  <li key={module.key}>
                    <Link href={module.href} className="pat-subpanel pat-hover-card block p-4">
                      <div className="pat-label">Module {index + 1}</div>
                      <div className="mt-1 text-base font-semibold text-[var(--shell-ink)]">{module.title}</div>
                      <div className="pat-meta mt-1 text-[var(--shell-muted)]">{module.questionCount} questions · {module.statusLabel}</div>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <RadarChart axes={data.radarAxes} title="Five-module maturity profile — no module scored yet" className="opacity-60" />
          </div>
        ) : (
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center">
            <div className="grid gap-8 sm:grid-cols-3">
              <ScoreLockup label="Alignment index" score={data.alignmentIndex} context="Average of your final module scores" />
              <ScoreLockup
                label="Modules complete"
                score={null}
                displayValue={`${data.completedModules}/${data.totalModules}`}
                context={data.lastFullAssessmentAt ? `Full assessment on record since ${data.lastFullAssessmentAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Final submissions across the five modules"}
              />
              <ScoreLockup
                label="Capabilities met"
                score={null}
                displayValue={data.capabilitiesTotal ? `${data.capabilitiesMet}/${data.capabilitiesTotal}` : "—"}
                context="Distinct capabilities at or above their unlock threshold"
              />
            </div>
            <RadarChart
              axes={data.radarAxes}
              title={`Five-module maturity profile: ${data.radarAxes.map((axis) => `${axis.label} ${axis.value === null ? "not scored" : `${Math.round(axis.value)}%`}`).join(", ")}`}
            />
          </div>
        )}
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Link href={data.nextStep.href} className="pat-card pat-hover-card block p-6" data-testid="next-best-step">
          <div className="pat-label">Next best step</div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xl font-semibold text-[var(--shell-ink)]">{data.nextStep.title}</span>
            <span aria-hidden="true" className="text-[var(--brand-c2-blue)]">→</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{data.nextStep.body}</p>
          <span className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-c2-blue)]">{data.nextStep.label}</span>
        </Link>
        {data.latestInsight ? (
          <Link href={data.latestInsight.href} className="pat-card pat-hover-card block p-6" data-testid="latest-insight">
            <div className="pat-label">Latest insight</div>
            <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">{data.latestInsight.title}</div>
            {data.latestInsight.value ? (
              <div className="mt-2 flex items-baseline gap-2">
                <span className="pat-stat-number text-3xl text-[var(--shell-ink)]">{data.latestInsight.value}</span>
                {data.latestInsight.caption ? <span className="text-sm text-[var(--shell-muted)]">{data.latestInsight.caption}</span> : null}
              </div>
            ) : null}
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--shell-muted)]">{data.latestInsight.summary}</p>
            <span className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-c2-blue)]">Open readout →</span>
          </Link>
        ) : (
          <div className="pat-card p-6">
            <div className="pat-label">Latest insight</div>
            <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">Opens with your first module</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Each insight is grounded in a final module submission; the first readout appears as soon as one module is on record.
            </p>
          </div>
        )}
      </section>

      <section className="pat-soft-panel flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm text-[var(--shell-muted)]" data-testid="since-last-visit">
        <span className="pat-label">Since your last visit</span>
        {data.sinceLastVisit.sinceLabel ? (
          <>
            <span>
              <span className="pat-mono text-[var(--shell-ink)]">{data.sinceLastVisit.assessmentsSubmitted}</span> assessment module
              {data.sinceLastVisit.assessmentsSubmitted === 1 ? "" : "s"} submitted
            </span>
            <span>
              <span className="pat-mono text-[var(--shell-ink)]">{data.sinceLastVisit.insightsRefreshed}</span> insight
              {data.sinceLastVisit.insightsRefreshed === 1 ? "" : "s"} refreshed
            </span>
            <span className="pat-meta">since {data.sinceLastVisit.sinceLabel}</span>
          </>
        ) : (
          <span>This is your first visit on record.</span>
        )}
      </section>
    </div>
  );
}
