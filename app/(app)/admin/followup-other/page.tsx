import { notFound } from "next/navigation";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { getFollowUpOtherTexts } from "@/lib/assessment/followUpEvidence";
import { isFollowUpMcEnabled } from "@/lib/followUpMc";

export const dynamic = "force-dynamic";

/**
 * MC follow-on box (item 7) — the Other-rate gauge. Every "Other (short answer)"
 * write-in per follow-up question, with the Other count over all picks for that
 * question. A high Other rate is the signal that an option set is missing a row;
 * this page is how the option sets self-correct. Admin-only (the /admin layout
 * enforces the operator audience) and DARK: 404 unless PAT_ENABLE_FOLLOWUP_MC=1.
 */
function formatRate(rate: number | null) {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export default async function AdminFollowUpOtherPage() {
  if (!isFollowUpMcEnabled()) {
    notFound();
  }
  const groups = await getFollowUpOtherTexts();
  const totalOther = groups.reduce((sum, group) => sum + group.otherCount, 0);
  const totalPicks = groups.reduce((sum, group) => sum + group.totalPicks, 0);
  const ranked = [...groups].sort((left, right) => (right.otherRate ?? -1) - (left.otherRate ?? -1));

  return (
    <div className="space-y-8" data-testid="followup-other-page">
      <AdminPageIntro
        eyebrow="Follow-up option sets"
        title="Other answers"
        description={`${totalOther} "Other" write-ins across ${totalPicks} follow-up picks. Questions are ranked by Other rate; a high rate means the option set is missing a row.`}
      />
      <div className="grid gap-6">
        {ranked.map((group) => (
          <AdminPanel
            key={group.questionKey}
            title={`${group.pillar} · Q${group.index} — Other rate ${formatRate(group.otherRate)}`}
            description={`${group.otherCount} of ${group.totalPicks} picks · ${group.stem}`}
          >
            {group.texts.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--shell-muted)]">No write-ins yet.</p>
            ) : (
              <ul className="grid gap-2" data-testid="followup-other-list" data-question-key={group.questionKey}>
                {group.texts.map((entry, index) => (
                  <li key={`${group.questionKey}-${index}`} className="rounded-[18px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm leading-6">
                    <div className="text-[var(--shell-ink)]">&ldquo;{entry.text}&rdquo;</div>
                    <div className="mt-1 text-xs text-[var(--shell-muted)]">
                      {entry.companyName ?? entry.companyId} · {new Date(entry.submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        ))}
      </div>
    </div>
  );
}
