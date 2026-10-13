import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import PageHead from "@/app/components/shell/PageHead";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import { listEnterpriseChannels, marketView } from "@/lib/enterprise";
import { requireEnterpriseAccess } from "@/lib/enterpriseAccess";

export const dynamic = "force-dynamic";

/**
 * 3e (R51) — the market view for one channel: every product in the channel ranked by
 * firm-reviewed score with n, competitor product and vendor names shown, the
 * enterprise's own rows flagged. No firm rows, no firm names: the rows come from
 * rankMarketView, whose input type carries product and vendor fields only.
 */
export default async function EnterpriseChannelPage({ params }: { params: Promise<{ verticalId: string }> }) {
  const { verticalId: raw } = await params;
  const verticalId = decodeURIComponent(raw);
  const state = await requireEnterpriseAccess();
  const channels = await listEnterpriseChannels(state.enterprise.id);
  if (!channels.includes(verticalId)) notFound();
  const rows = (await marketView(state.enterprise.id, verticalId)) ?? [];

  return (
    <div className="space-y-8" data-testid="enterprise-channel-page" data-vertical-id={verticalId}>
      {isNewFrontDoorEnabled() ? (
        // Box 3f item M: the shared page head (portal name as the eyebrow).
        <PageHead variant="portal" wordmark eyebrow="Enterprise portal" title={`${verticalId} market view`} subline={`${rows.length} product${rows.length === 1 ? "" : "s"} in this channel · ${rows.filter((row) => row.owned).length} yours`} />
      ) : (
      <AdminPageIntro
        eyebrow="Channel"
        title={`${verticalId} market view`}
        description={`${rows.length} product${rows.length === 1 ? "" : "s"} in this channel · ${rows.filter((row) => row.owned).length} yours`}
      />
      )}
      <div className="flex flex-wrap gap-3 print:hidden">
        <Link className="pat-button-secondary" href="/enterprise">
          Back to portfolio
        </Link>
      </div>
      <section className="pat-card p-6" data-testid="enterprise-market-view">
        <div className="pat-label">Ranked by firm-reviewed score</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="pat-label border-b border-[var(--shell-border)]">
              <tr>
                <th scope="col" className="px-3 py-2 text-right font-semibold">#</th>
                <th scope="col" className="px-3 py-2 font-semibold">Product</th>
                <th scope="col" className="px-3 py-2 font-semibold">Vendor</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Score</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">n</th>
                <th scope="col" className="px-3 py-2 font-semibold"><span className="sr-only">Ownership</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.productId}
                  className={`border-b border-[var(--shell-border)] last:border-b-0 ${row.owned ? "bg-[rgba(6,54,116,0.04)]" : ""}`}
                  data-testid="enterprise-market-row"
                  data-owned={row.owned ? "1" : "0"}
                >
                  <td className="pat-mono px-3 py-2 text-right text-[var(--shell-muted)]">{row.rank}</td>
                  <td className="px-3 py-2 font-medium text-[var(--shell-ink)]">{row.productName}</td>
                  <td className="px-3 py-2 text-[var(--shell-muted)]">{row.vendorName}</td>
                  <td className="pat-mono px-3 py-2 text-right text-[var(--shell-ink)]">{row.score === null ? "n/a" : Math.round(row.score)}</td>
                  <td className="pat-mono px-3 py-2 text-right text-[var(--shell-ink)]">{row.n}</td>
                  <td className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-c2-blue)]">{row.owned ? "yours" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
          Scores are firm-reviewed averages; n is the number of firm reviews. Competitor products show their vendor only, never the firms that reviewed them.
        </p>
      </section>
    </div>
  );
}
