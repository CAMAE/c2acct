import prisma from "@/lib/prisma";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageIntro,
  AdminPanel,
} from "@/app/components/admin/AdminShell";
import { updatePortalAction } from "@/app/admin/actions";
import { getAdminOverviewData, requireAdminSession } from "@/lib/adminControlPlane";
import { getMacMiniOperatorState, type MacMiniAgentStatus, type MacMiniLaunchReadinessState } from "@/lib/macMiniOperatorState";

export const dynamic = "force-dynamic";

function formatTimestamp(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatCount(value: number | null) {
  return value == null ? "Unknown" : String(value);
}

function getStateBadgeClasses(state: MacMiniLaunchReadinessState | MacMiniAgentStatus | "enabled" | "disabled" | "unknown") {
  if (state === "ready" || state === "loaded" || state === "enabled") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "blocked" || state === "not-loaded" || state === "disabled") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (state === "degraded" || state === "unavailable") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-[var(--shell-border)] bg-white/80 text-[var(--shell-muted)]";
}

function RuntimeStateBadge({
  label,
  state,
}: {
  label: string;
  state: MacMiniLaunchReadinessState | MacMiniAgentStatus | "enabled" | "disabled" | "unknown";
}) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStateBadgeClasses(state)}`}>
      {label}
    </span>
  );
}

function renderDetailList(rows: Array<{ label: string; value: string }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">{row.label}</div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-ink)]">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminRuntimePage() {
  await requireAdminSession();
  const [overview, portals, diagnostics, operatorState] = await Promise.all([
    getAdminOverviewData(),
    prisma.portal.findMany({
      orderBy: { key: "asc" },
    }),
    prisma.operatorAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        Actor: {
          select: { email: true },
        },
      },
    }).catch(() => []),
    getMacMiniOperatorState(),
  ]);

  const recentDiagnostics = overview.diagnosticsSnapshot.recent.slice(0, 10);
  const readinessState = operatorState.launchReadiness.state;
  const healthLabel =
    operatorState.app.health === "ok" ? "Healthy" : operatorState.app.health === "down" ? "Failing" : "Unknown";
  const chatopsLabel =
    operatorState.chatops.envReady == null ? "Unknown" : operatorState.chatops.envReady ? "Enabled" : "Disabled";
  const latestFailureSummary =
    operatorState.recentFailures.watchdogFailure ??
    operatorState.recentFailures.healthSummary ??
    (operatorState.recentFailures.failedSteps.length > 0
      ? operatorState.recentFailures.failedSteps.join(", ")
      : "No recent failure summary emitted.");

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Runtime"
        description="Portal visibility controls, canonical PAT runtime metrics, and live Mac mini launch/operator state in one surface."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminMetricCard
          label="Launch readiness"
          value={readinessState === "unknown" ? "Unknown" : readinessState[0].toUpperCase() + readinessState.slice(1)}
          detail={operatorState.launchReadiness.summary}
        />
        <AdminMetricCard
          label="App health"
          value={healthLabel}
          detail={operatorState.app.publicOrigin ?? operatorState.status?.appUrl ?? "No public origin emitted yet"}
        />
        <AdminMetricCard
          label="Chat-ops"
          value={chatopsLabel}
          detail={
            operatorState.chatops.loaded === "loaded"
              ? "Telegram operator layer is loaded."
              : "Operator chat layer is not fully active."
          }
        />
        <AdminMetricCard
          label="Watchdog"
          value={operatorState.watchdog.loaded === "unknown" ? "Unknown" : operatorState.watchdog.loaded}
          detail={operatorState.watchdog.reason ?? "No watchdog reason emitted."}
        />
        <AdminMetricCard
          label="Recent failures"
          value={formatCount(operatorState.recentFailures.count)}
          detail={latestFailureSummary}
        />
        <AdminMetricCard
          label="Latest deploy"
          value={operatorState.release.buildId ?? operatorState.release.commit ?? "Unavailable"}
          detail={formatTimestamp(operatorState.release.buildTimeUtc)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminPanel
          title="Launch operator state"
          description="This mirrors safe Mac mini status artifacts and highlights missing setup or degraded automation without exposing secrets."
        >
          {operatorState.available ? (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-3">
                <RuntimeStateBadge label={readinessState} state={readinessState} />
                <RuntimeStateBadge
                  label={operatorState.watchdog.loaded}
                  state={operatorState.watchdog.loaded}
                />
                <RuntimeStateBadge
                  label={operatorState.chatops.envReady ? "enabled" : operatorState.chatops.envReady === false ? "disabled" : "unknown"}
                  state={operatorState.chatops.envReady ? "enabled" : operatorState.chatops.envReady === false ? "disabled" : "unknown"}
                />
              </div>
              <div className="text-sm leading-6 text-[var(--shell-muted)]">{operatorState.launchReadiness.summary}</div>
              {operatorState.launchReadiness.reasons.length > 0 ? (
                <div className="grid gap-3">
                  {operatorState.launchReadiness.reasons.map((reason) => (
                    <div key={reason} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4 text-sm leading-6 text-[var(--shell-muted)]">
                      {reason}
                    </div>
                  ))}
                </div>
              ) : null}
              {renderDetailList([
                {
                  label: "Public origin",
                  value: operatorState.app.publicOrigin ?? "Unavailable",
                },
                {
                  label: "Listen target",
                  value: operatorState.app.host && operatorState.app.port
                    ? `${operatorState.app.host}:${operatorState.app.port}${operatorState.app.listenActive ? " listening" : ""}`
                    : "Unavailable",
                },
                {
                  label: "App env readiness",
                  value: operatorState.status?.preflight.envReady == null
                    ? "Unknown"
                    : operatorState.status.preflight.envReady
                      ? "Ready"
                      : `${operatorState.status.preflight.envMissingCount ?? 0} required value(s) missing`,
                },
                {
                  label: "Chat-ops env readiness",
                  value: operatorState.chatops.envReady == null
                    ? "Unknown"
                    : operatorState.chatops.envReady
                      ? "Ready"
                      : `${operatorState.status?.preflight.chatopsMissingCount ?? operatorState.nightly?.chatopsMissingCount ?? 0} required value(s) missing`,
                },
              ])}
            </div>
          ) : (
            <AdminEmptyState
              title="No operator state emitted yet"
              body="Mac mini status artifacts have not been written yet. Run the status or nightly verification scripts and reload this page."
            />
          )}
        </AdminPanel>

        <AdminPanel
          title="Services and deploy state"
          description="Launchd status, release metadata, and latest nightly verification from the shared Mac mini state."
        >
          {operatorState.available ? (
            <div className="space-y-5">
              {renderDetailList([
                {
                  label: "App agent",
                  value: operatorState.status?.launchd.app ?? "unknown",
                },
                {
                  label: "Verify agent",
                  value: operatorState.status?.launchd.verify ?? "unknown",
                },
                {
                  label: "Chat-ops agent",
                  value: operatorState.chatops.loaded,
                },
                {
                  label: "Watchdog agent",
                  value: operatorState.watchdog.loaded,
                },
                {
                  label: "Latest deploy",
                  value: [operatorState.release.branch, operatorState.release.commit].filter(Boolean).join(" @ ") || "Unavailable",
                },
                {
                  label: "Deploy reason",
                  value: operatorState.release.buildReason ?? "Unavailable",
                },
                {
                  label: "Deploy time",
                  value: formatTimestamp(operatorState.release.buildTimeUtc),
                },
                {
                  label: "Git state",
                  value: operatorState.release.gitDirty ?? "Unavailable",
                },
                {
                  label: "Nightly release drift",
                  value: operatorState.nightly?.releaseDrift ?? "Unavailable",
                },
                {
                  label: "Last app start",
                  value: formatTimestamp(operatorState.app.startedAt),
                },
              ])}
            </div>
          ) : (
            <AdminEmptyState
              title="No deploy state yet"
              body="The release-state and nightly-summary artifacts have not been written yet."
            />
          )}
        </AdminPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminPanel
          title="Recent failures"
          description="Failure summaries come from nightly verification and watchdog/chat-ops state files."
        >
          {operatorState.recentFailures.count || operatorState.recentFailures.watchdogFailure ? (
            <div className="grid gap-3">
              <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">
                  {operatorState.recentFailures.count ?? 0} recent failure{operatorState.recentFailures.count === 1 ? "" : "s"}
                </div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">{latestFailureSummary}</div>
              </div>
              {operatorState.recentFailures.failedSteps.map((step) => (
                <div key={step} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4 text-sm text-[var(--shell-muted)]">
                  Failed step: {step}
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No recent failures emitted"
              body="Nightly verification and watchdog state have not reported a current failure."
            />
          )}
        </AdminPanel>

        <AdminPanel
          title="Operator audit and chat-ops activity"
          description="Recent admin mutations and the latest safe chat-ops command event share one operator-facing view."
        >
          <div className="grid gap-3">
            {operatorState.chatops.latestAudit ? (
              <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">Latest chat-ops event</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  {String(operatorState.chatops.latestAudit.command ?? "unknown command")} · {String(operatorState.chatops.latestAudit.actor ?? "unknown actor")}
                </div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  {String(operatorState.chatops.latestAudit.timestamp ?? "No timestamp")}
                </div>
              </div>
            ) : null}
            {diagnostics.length > 0 ? (
              diagnostics.map((event) => (
                <div key={event.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                  <div className="font-semibold text-[var(--shell-ink)]">{event.summary}</div>
                  <div className="mt-1 text-sm text-[var(--shell-muted)]">
                    {event.action} · {event.entityType} · {event.Actor?.email ?? "Unknown operator"} · {event.createdAt.toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <AdminEmptyState
                title="No audit events yet"
                body="Operator mutations have not been recorded yet. Once they exist, this panel becomes the fastest way to review recent control-plane changes."
              />
            )}
          </div>
        </AdminPanel>
      </section>

      <AdminPanel title="Portal visibility controls">
        <div className="grid gap-4">
          {portals.map((portal) => (
            <form key={portal.id} action={updatePortalAction} className="grid gap-4 rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 md:grid-cols-[1.1fr_0.9fr_auto]">
              <input type="hidden" name="portalId" value={portal.id} />
              <input type="hidden" name="returnTo" value="/admin/runtime" />
              <input name="title" defaultValue={portal.title} className="pat-input" />
              <label className="flex items-center gap-2 rounded-[18px] border border-[var(--shell-border)] px-4 py-3 text-sm text-[var(--shell-muted)]">
                <input type="checkbox" name="active" defaultChecked={portal.active} />
                {portal.key} active
              </label>
              <button type="submit" className="pat-button-primary">
                Save portal
              </button>
            </form>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Canonical runtime diagnostics">
        <div className="grid gap-3">
          {overview.canonicalModules.map((module) => (
            <div key={module.key} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
              <div className="font-semibold text-[var(--shell-ink)]">{module.title}</div>
              <div className="mt-1 text-sm text-[var(--shell-muted)]">
                {module._count.SurveyQuestion} questions · {module._count.SurveySection} sections · {module._count.SurveySubmission} submissions
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Recent runtime diagnostics">
        <div className="grid gap-3">
          {recentDiagnostics.length > 0 ? (
            recentDiagnostics.map((event) => (
              <div key={event.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{event.area} · {event.status}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">{event.summary}</div>
              </div>
            ))
          ) : (
            <AdminEmptyState
              title="No recent diagnostics"
              body="No runtime diagnostics have been emitted by the in-process PAT services yet."
            />
          )}
        </div>
      </AdminPanel>
    </div>
  );
}
