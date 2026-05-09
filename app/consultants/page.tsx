import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getEcosystemListForConsultant, type EcosystemListCardData } from "@/lib/ecosystem";
import EcosystemListCard from "./_components/EcosystemListCard";

export const dynamic = "force-dynamic";

export default async function ConsultantOverviewPage() {
  const consultantAccess = await requireConsultantSession("/consultants");
  if (!consultantAccess) {
    return null;
  }

  let cards: EcosystemListCardData[] = [];
  let aggregationError: string | null = null;
  try {
    cards = await getEcosystemListForConsultant(consultantAccess.consultantProfileId);
  } catch (error) {
    aggregationError = error instanceof Error ? error.message : "Unknown aggregation error.";
  }

  const description = aggregationError
    ? "Could not load your ecosystems."
    : `${cards.length} active`;

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Consultant"
        title="Your assigned ecosystems"
        description={description}
      />

      <AdminPanel
        title="Ecosystems"
        description="Each card rolls up the ecosystem's vendor product coverage, firm alignment scores, module completion, divergences, and 30-day actions inside the consultant tenancy boundary."
      >
        {aggregationError ? (
          <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
            Could not load your ecosystems. {aggregationError}. Contact support if this persists.
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
            You don&apos;t have any ecosystems assigned yet. Ask your admin to assign you to an ecosystem before signing back in.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {cards.map((card) => (
              <EcosystemListCard key={card.ecosystemId} data={card} />
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
