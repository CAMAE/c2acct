import Link from "next/link";
import { notFound } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import AlignmentBoardClient from "@/app/components/firm/AlignmentBoardClient";
import { getAlignmentBoardData, isAlignmentBoardEnabled } from "@/lib/alignmentBoard";
import { requireConsultantSession } from "@/lib/consultantAccess";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Alignment Board | Patalign",
  description: "Read-only Alignment Board for a firm in your assigned ecosystem.",
};

/**
 * F14 — consultant scoped Alignment Board (read-only). A managing consultant
 * views the live board for a firm IN THEIR ASSIGNED ECOSYSTEM. This is a PROPER
 * SCOPED-TENANCY route under /consultants — NOT a route exemption on the firm
 * audience wall (13a). Cross-ecosystem / cross-tenant probes 404. The board is
 * read-only: pieces + radar + scores are inspectable, but swap staging is
 * disabled (readOnly), and the sandbox-swap log no-ops for a company-less
 * consultant anyway — nothing here mutates the firm's data.
 */
export default async function ConsultantFirmAlignmentBoardPage({
  params,
}: {
  params: Promise<{ ecosystemId: string; firmCompanyId: string }>;
}) {
  const { ecosystemId, firmCompanyId } = await params;
  const callbackUrl = `/consultants/ecosystems/${ecosystemId}/firm/${firmCompanyId}/alignment-board`;
  const access = await requireConsultantSession(callbackUrl);
  if (!access) return null;

  // Scoped authz: the firm must be in THIS ecosystem's firm set for THIS
  // consultant. Not-assigned ecosystem or out-of-scope firm → 404 (never leak).
  const scope = access.ecosystems.find((eco) => eco.ecosystemId === ecosystemId);
  const firm = scope?.firmCompanies.find((f) => f.id === firmCompanyId) ?? null;
  if (!firm) {
    notFound();
  }

  const briefHref = `/consultants/ecosystems/${ecosystemId}/firm/${firmCompanyId}`;

  const Header = (
    <section className="pat-card p-8" data-testid="consultant-board-header">
      <PatLogoLockup mode="hero" tone="light" />
      <div className="pat-label mt-6">Alignment Board · read-only</div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
        {firm.name}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
        You&apos;re viewing this firm&apos;s live board as its consultant. Inspect the stack, radar, and
        candidate fit — swaps are disabled here; the firm plays what-if scenarios on its own board.
      </p>
      <Link href={briefHref} className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-c2-blue)] hover:underline">
        ← Back to {firm.name} brief
      </Link>
    </section>
  );

  if (!isAlignmentBoardEnabled()) {
    return (
      <div className="space-y-8">
        {Header}
        <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
          The Alignment Board appears once this firm has completed its alignment assessment and has products in its stack.
        </div>
      </div>
    );
  }

  const data = await getAlignmentBoardData(firmCompanyId);
  if (!data) {
    return (
      <div className="space-y-8">
        {Header}
        <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
          The Alignment Board appears once this firm has completed its alignment assessment and has products in its stack.
        </div>
      </div>
    );
  }

  // Managing consultant: real product names (entitled), swap staging disabled.
  return (
    <div className="space-y-8">
      {Header}
      <AlignmentBoardClient data={data} entitled readOnly membershipHref={briefHref} />
    </div>
  );
}
