import Link from "next/link";
import {
  AdminActionLink,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageIntro,
  AdminPanel,
  AdminUtilitySelector,
} from "@/app/components/admin/AdminShell";
import {
  ADMIN_OVERVIEW_UTILITIES,
  buildOperatorBriefings,
  getAdminOverviewData,
  requireAdminSession,
} from "@/lib/adminControlPlane";
import {
  ADMIN_ROUTE_GROUPS,
  getAdminOverviewUtilityHref,
  normalizeAdminOverviewUtility,
} from "@/lib/adminOverview";

export const dynamic = "force-dynamic";

type SearchParams = {
  utility?: string;
};

function renderOverviewPanel(overview: Awaited<ReturnType<typeof getAdminOverviewData>>) {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label="Organizations" value={String(overview.metrics.organizations)} detail="Companies under operator oversight" />
        <AdminMetricCard label="Users" value={String(overview.metrics.users)} detail="Accounts and role assignments" />
        <AdminMetricCard label="Products" value={String(overview.metrics.products)} detail="Vendor and firm-linked product records" />
        <AdminMetricCard label="Modules / Sections" value={`${overview.metrics.modules} / ${overview.metrics.sections}`} detail="Assessment runtime structure" />
        <AdminMetricCard label="Insights / Memberships" value={`${overview.metrics.insights} / ${overview.metrics.memberships}`} detail="Insight inventory and active membership rows" />
      </section>

      <AdminPanel
        title="Operator work areas"
        description="Use the grouped utilities above to narrow the workspace. Every linked route remains directly discoverable here."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          {ADMIN_ROUTE_GROUPS.map((group) => (
            <div key={group.key} className="space-y-4">
              <div>
                <div className="text-xl font-semibold text-[var(--shell-ink)]">{group.title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{group.description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {group.routes.map((route) => (
                  <AdminActionLink key={route.href} href={route.href} title={route.title} body={route.body} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}

function renderOperationsPanel(overview: Awaited<ReturnType<typeof getAdminOverviewData>>) {
  return (
    <div className="space-y-8">
      <AdminPanel
        title="Operations"
        description="The operational routes remain direct. This view groups them by the kind of operator work they support."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          {ADMIN_ROUTE_GROUPS
            .filter((group) => group.key === "operations")
            .map((group) => (
              <div key={group.key} className="space-y-4">
                <div className="text-xl font-semibold text-[var(--shell-ink)]">{group.title}</div>
                <div className="grid gap-4 md:grid-cols-2">
                  {group.routes.map((route) => (
                    <AdminActionLink key={route.href} href={route.href} title={route.title} body={route.body} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Operational footing"
        description="High-level counts for the entities most operators touch first."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Organizations" value={String(overview.metrics.organizations)} detail="Companies under operator oversight" />
          <AdminMetricCard label="Users" value={String(overview.metrics.users)} detail="Accounts and role assignments" />
          <AdminMetricCard label="Products" value={String(overview.metrics.products)} detail="Vendor and firm-linked product records" />
          <AdminMetricCard label="Taxonomy buckets" value={String(overview.metrics.taxonomyBuckets)} detail="Current bucket inventory across operating families" />
        </div>
      </AdminPanel>
    </div>
  );
}

function renderRuntimePanel(
  overview: Awaited<ReturnType<typeof getAdminOverviewData>>,
  briefings: ReturnType<typeof buildOperatorBriefings>
) {
  return (
    <div className="space-y-8">
      <AdminPanel
        title="Runtime"
        description="Diagnostics, canonical runtime structure, briefings, and recent audit activity."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {ADMIN_ROUTE_GROUPS
            .filter((group) => group.key === "runtime")
            .flatMap((group) => group.routes)
            .map((route) => (
              <AdminActionLink key={route.href} href={route.href} title={route.title} body={route.body} />
            ))}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Canonical PAT firm runtime"
        description="The five-module firm model remains the canonical assessment runtime."
      >
        <div className="grid gap-4">
          {overview.canonicalModules.map((module) => (
            <div
              key={module.key}
              className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{module.title}</div>
                  <div className="mt-1 text-sm text-[var(--shell-muted)]">{module.key}</div>
                </div>
                <div className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                  {module.active ? "Active" : "Inactive"}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--shell-muted)]">
                <span>{module._count.SurveyQuestion} questions</span>
                <span>{module._count.SurveySection} sections</span>
                <span>{module._count.SurveySubmission} submissions</span>
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Operator briefings"
        description="Short summaries built from live admin data, not placeholder prose."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {briefings.map((briefing) => (
            <div key={briefing.key} className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{briefing.title}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{briefing.summary}</div>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel
        title="Recent operator audit activity"
        description="Recent admin mutations recorded in the operator audit feed."
      >
        <div className="grid gap-3">
          {overview.auditEvents.length > 0 ? (
            overview.auditEvents.map((event) => (
              <div key={event.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--shell-ink)]">{event.summary}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      {event.action} · {event.entityType} · {event.Actor?.email ?? "Unknown operator"}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                    {event.createdAt.toLocaleString()}
                  </div>
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
        <div className="mt-5">
          <Link className="pat-button-secondary" href="/admin/runtime">
            Open runtime and audit feed
          </Link>
        </div>
      </AdminPanel>
    </div>
  );
}

function renderFinancialsPanel(overview: Awaited<ReturnType<typeof getAdminOverviewData>>) {
  const hasFinanceSignals =
    overview.metrics.billing.activeMemberships > 0 ||
    overview.metrics.billing.pendingCheckouts > 0 ||
    overview.metrics.billing.paymentFailures > 0 ||
    overview.metrics.billing.recentConversions > 0 ||
    overview.metrics.billing.webhookFailures > 0 ||
    overview.recentPaymentEvents.length > 0;

  return (
    <div className="space-y-8">
      <AdminPanel
        title="Financials"
        description="Provider-backed membership state, checkout momentum, webhook health, and recent payment telemetry."
      >
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AdminMetricCard
            label="Billing config"
            value={overview.metrics.billingConfigured ? "Live-ready" : "Staged"}
            detail="Provider secret and billing rollout gate"
          />
          <AdminMetricCard
            label="Bank methods"
            value={overview.metrics.commercialFlags.bankMethodsEnabled ? "Enabled" : "Staged"}
            detail="Bank or ACH methods only become live when explicitly rolled out"
          />
          <AdminMetricCard
            label="PayPal"
            value={overview.metrics.commercialFlags.paypalEnabled ? "Staged review" : "Staged off"}
            detail="Visible rollout state, not a fake live handoff"
          />
          <AdminMetricCard
            label="Analytics"
            value={overview.metrics.telemetry.analyticsConfigured ? "Configured" : "Staged"}
            detail="PostHog event capture state"
          />
          <AdminMetricCard
            label="Sentry"
            value={overview.metrics.telemetry.sentryConfigured ? "Configured" : "Staged"}
            detail="Runtime observability state"
          />
        </div>

        {hasFinanceSignals ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <AdminMetricCard label="Active memberships" value={String(overview.metrics.billing.activeMemberships)} detail="Provider-backed active subscription rows" />
              <AdminMetricCard label="Pending checkouts" value={String(overview.metrics.billing.pendingCheckouts)} detail="Memberships waiting on provider completion or expiry" />
              <AdminMetricCard label="Past due" value={String(overview.metrics.billing.paymentFailures)} detail="Memberships currently marked past due" />
              <AdminMetricCard label="Conversion trend" value={String(overview.metrics.billing.recentConversions)} detail="Completed checkouts recorded locally during current telemetry history" />
              <AdminMetricCard label="Webhook failures" value={String(overview.metrics.billing.webhookFailures)} detail="Webhook events that failed local processing" />
              <AdminMetricCard label="Plan mix" value={`${overview.metrics.billing.planMix.pro}/${overview.metrics.billing.planMix.elite}`} detail={`Pro / Elite live rows, with ${overview.metrics.billing.planMix.free} free fallback rows`} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-5">
                <div className="pat-label">Free</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--shell-ink)]">{overview.metrics.billing.planMix.free}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">Subjects still on the free fallback or operator-managed free state.</p>
              </div>
              <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-5">
                <div className="pat-label">Pro</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--shell-ink)]">{overview.metrics.billing.planMix.pro}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">Provider-backed Pro memberships currently reflected in local subscription truth.</p>
              </div>
              <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-5">
                <div className="pat-label">Elite</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--shell-ink)]">{overview.metrics.billing.planMix.elite}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">Provider-backed Elite memberships currently reflected in local subscription truth.</p>
              </div>
            </div>
          </>
        ) : (
          <AdminEmptyState
            title="No financial telemetry yet"
            body={
              overview.metrics.billingConfigured
                ? "Billing is configured, but there are no completed payment events or subscription changes in local telemetry yet."
                : "Billing telemetry has not started yet because live provider billing is not configured in this environment."
            }
          />
        )}
      </AdminPanel>

      <AdminPanel
        title="Recent payment events"
        description="Latest provider webhook events seen by the control plane."
      >
        {overview.recentPaymentEvents.length > 0 ? (
          <div className="grid gap-3">
            {overview.recentPaymentEvents.map((event) => (
              <div key={event.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--shell-ink)]">{event.eventType}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      {event.status}
                      {event.errorMessage ? ` · ${event.errorMessage}` : ""}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                    {event.receivedAt.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No payment events yet"
            body="Webhook-backed finance telemetry will appear here once provider events start reaching the control plane."
          />
        )}
        <div className="mt-5 text-sm leading-6 text-[var(--shell-muted)]">
          Live payment methods:{" "}
          <span className="font-semibold text-[var(--shell-ink)]">
            {overview.metrics.liveBillingMethods.length > 0 ? overview.metrics.liveBillingMethods.join(", ") : "No live methods configured"}
          </span>
        </div>
        <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          Email sending:{" "}
          <span className="font-semibold text-[var(--shell-ink)]">
            {overview.metrics.commercialFlags.emailSendingEnabled ? "Configured or env-ready" : "Staged"}
          </span>
        </div>
      </AdminPanel>
    </div>
  );
}

function renderHelpPanel() {
  return (
    <AdminPanel
      title="Help"
      description="Use the utility toggles to reduce noise: Overview for orientation, Operations for admin actions, Runtime for diagnostics and audits, and Financials for payment truth."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5">
          <div className="text-lg font-semibold text-[var(--shell-ink)]">Overview</div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">Fast orientation: headline counts plus grouped route entry points.</p>
        </div>
        <div className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5">
          <div className="text-lg font-semibold text-[var(--shell-ink)]">Operations</div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">Companies, users, taxonomy, modules, insights, and products.</p>
        </div>
        <div className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5">
          <div className="text-lg font-semibold text-[var(--shell-ink)]">Runtime</div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">Canonical module state, diagnostics, briefings, and audit history.</p>
        </div>
        <div className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5">
          <div className="text-lg font-semibold text-[var(--shell-ink)]">Financials</div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">Provider-backed membership truth, pending checkouts, past-due rows, and webhook health. Empty states stay honest when billing has not started yet.</p>
        </div>
      </div>
    </AdminPanel>
  );
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminSession();
  const params = searchParams ? await searchParams : undefined;
  const activeUtility = normalizeAdminOverviewUtility(params?.utility);
  const overview = await getAdminOverviewData();
  const latestSubmitStatus = overview.diagnosticsSnapshot.latestByArea.get("survey_submit")?.status ?? null;
  const briefings = buildOperatorBriefings({
    canonicalModules: overview.canonicalModules,
    recentAuditCount: overview.auditEvents.length,
    latestSubmitStatus,
  });
  const utilityOptions = ADMIN_OVERVIEW_UTILITIES.map((item) => ({
    ...item,
    href: getAdminOverviewUtilityHref(item.key),
  }));

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="C2Core operator control plane"
        description="Use grouped utilities to move through the live operator shell without losing route discoverability. This is still the canonical admin surface for PAT."
      />

      <AdminUtilitySelector activeKey={activeUtility} options={utilityOptions} />

      {activeUtility === "operations"
        ? renderOperationsPanel(overview)
        : activeUtility === "runtime"
          ? renderRuntimePanel(overview, briefings)
          : activeUtility === "financials"
            ? renderFinancialsPanel(overview)
            : activeUtility === "help"
              ? renderHelpPanel()
              : renderOverviewPanel(overview)}
    </div>
  );
}
