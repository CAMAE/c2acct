export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/authz";
import { getAdminOverview, getAdminExceptions } from "@/lib/admin/controlPlane";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  const isAdmin = isPlatformAdmin(sessionUser);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const actionError = getSingleParam(resolvedSearchParams?.error);

  if (!isAdmin) {
    redirect("/");
  }

  const [overview, exceptions] = await Promise.all([
    getAdminOverview(),
    getAdminExceptions({ limit: 6 }),
  ]);

  const navCards = [
    ["Universal search", "/admin/search", "Platform-only command palette for companies, vendors, products, users, and audit trails."],
    ["Exceptions queue", "/admin/exceptions", "Recent operator issues from DB health, audit warnings/errors, rate-limit pressure, and invite lifecycle stress."],
    ["Firms", "/admin/firms", "Cross-firm operating inventory for platform supervision only."],
    ["Vendors", "/admin/vendors", "Vendor inventory with invite-policy and product-surface context."],
    ["Products", "/admin/products", "Product inventory with canonical intelligence-route entry points."],
    ["Users", "/admin/users", "Platform-wide user roster and role inspection."],
  ] as const;

  return (
    <div className="grid gap-6 p-8">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Admin directs. Mac mini executes. Ownership decides.
        </div>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">Admin Operating Center</h1>
        <div className="mt-3 max-w-4xl text-sm text-slate-600">
          Platform-only command center. Tenant-admin work remains inside firm and vendor surfaces; this layer is for ecosystem supervision, search, exceptions, and operator evidence.
        </div>
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Action denied: insufficient permissions.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Firms", String(overview.firmCount)],
          ["Vendors", String(overview.vendorCount)],
          ["Products", String(overview.productCount)],
          ["Users", String(overview.userCount)],
          ["Active invite codes", String(overview.activeInviteCodeCount)],
          ["Open exceptions", String(overview.openExceptionCount)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Command center</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">Platform-safe navigation</div>
            </div>
            <Link href="/admin/search" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Open search
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {navCards.map(([title, href, body]) => (
              <Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:bg-white">
                <div className="font-semibold text-slate-950">{title}</div>
                <div className="mt-2">{body}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Health and separation</div>
          <div className="mt-3 text-sm text-slate-700">
            Platform admin routes can see cross-entity inventory and health state. Tenant admins stay in their firm/vendor pages and do not inherit these global views.
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="font-semibold text-slate-950">DB health</div>
              <div className="mt-1">{overview.dbHealth === "ok" ? "Healthy in current runtime." : "Failing. Inspect /api/health/db immediately."}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="font-semibold text-slate-950">Tenant-admin boundary</div>
              <div className="mt-1">Firm grading, vendor invite creation, and company-scoped execution remain outside this platform-only plane.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent Audit Events</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">Operator evidence trail</div>
            </div>
            <Link href="/admin/search?type=audit" className="text-sm font-medium text-slate-700 underline underline-offset-4">
              Open audit search
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {overview.recentEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-slate-950">{event.eventKey}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{event.createdAt.toISOString()}</div>
                </div>
                <div className="mt-2">{event.eventCategory} | {event.outcome} | {event.severity}</div>
                <div className="mt-1 text-xs text-slate-500">{event.requestPath ?? "No route captured"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Exceptions queue</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">Current operator interrupts</div>
            </div>
            <Link href="/admin/exceptions" className="text-sm font-medium text-slate-700 underline underline-offset-4">
              Open queue
            </Link>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Partial but real: inspect and route-to-source actions are live now; bulk suppress/reassign workflows remain deferred.
          </div>
          <div className="mt-4 grid gap-3">
            {exceptions.map((exception) => (
              <Link key={exception.id} href={exception.href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-slate-950">{exception.title}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{exception.severity}</div>
                </div>
                <div className="mt-2">{exception.summary}</div>
                <div className="mt-2 text-xs text-slate-500">{exception.supportedActions.join(" | ")}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
